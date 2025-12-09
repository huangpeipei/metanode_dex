/**
 * Swap 交易工具函数
 */

import { Address } from "viem";
import { Q96, tickToSqrtPriceX96 } from "./priceUtils";

/**
 * 根据流动性选择最优池子路径（只考虑流动性维度）
 * @param pools - 所有池子列表
 * @param tokenIn - 输入代币地址
 * @param tokenOut - 输出代币地址
 * @param slippagePercent - 滑点百分比（用于计算 sqrtPriceLimitX96）
 * @returns 最优路径的 indexPath 数组（只返回流动性最大的池子的 index）
 */
export function findOptimalPath(
  pools: Array<{
    token0: Address;
    token1: Address;
    fee: number;
    index: number;
    liquidity: string;
    tick: number;
    tickLower: number;
    tickUpper: number;
    sqrtPriceX96: string;
  }>,
  tokenIn: Address,
  tokenOut: Address,
  slippagePercent: number = 0.5
): number[] {
  if (!pools || pools.length === 0) {
    return [];
  }

  // 确定交易方向：zeroForOne = tokenIn < tokenOut（按地址字典序）
  const zeroForOne = tokenIn.toLowerCase() < tokenOut.toLowerCase();

  // 过滤出匹配的池子（考虑 token0/token1 的顺序）
  // 需要同时匹配 tokenIn 和 tokenOut 的地址
  const matchingPools = pools.filter((pool) => {
    const isToken0In = pool.token0.toLowerCase() === tokenIn.toLowerCase();
    const isToken1In = pool.token1.toLowerCase() === tokenIn.toLowerCase();
    const isToken0Out = pool.token0.toLowerCase() === tokenOut.toLowerCase();
    const isToken1Out = pool.token1.toLowerCase() === tokenOut.toLowerCase();

    // 匹配条件：tokenIn 和 tokenOut 都在池子中，且方向正确
    // 即：(tokenIn = token0 && tokenOut = token1) 或 (tokenIn = token1 && tokenOut = token0)
    const tokenMatch =
      (isToken0In && isToken1Out) || (isToken1In && isToken0Out);

    // 确保当前价格在池子的价格范围内（tick 在 tickLower 和 tickUpper 之间）
    const priceInRange =
      pool.tick >= pool.tickLower && pool.tick <= pool.tickUpper;

    // 确保池子有流动性（liquidity 是字符串，需要转换为 BigInt 比较）
    const liquidityStr = pool.liquidity?.toString() || "0";
    const hasLiquidity = BigInt(liquidityStr) > BigInt(0);

    if (!tokenMatch || !priceInRange || !hasLiquidity) {
      return false;
    }

    // 计算当前池子的 sqrtPriceLimitX96（基于滑点）
    try {
      const currentSqrtPriceX96 = BigInt(pool.sqrtPriceX96 || "0");
      if (currentSqrtPriceX96 === BigInt(0)) {
        return false;
      }

      const sqrtPriceLimitX96 = calculateSqrtPriceLimitX96(
        currentSqrtPriceX96,
        slippagePercent,
        zeroForOne
      );

      // 计算 tickLower 和 tickUpper 对应的 sqrtPriceX96
      const sqrtPriceLowerX96 = tickToSqrtPriceX96(pool.tickLower);
      const sqrtPriceUpperX96 = tickToSqrtPriceX96(pool.tickUpper);

      // 检查 sqrtPriceLimitX96 是否在池子的价格范围内：
      // - zeroForOne = true: 价格下降，sqrtPriceLimitX96 必须 >= sqrtPriceLowerX96（不能低于下限）
      // - zeroForOne = false: 价格上升，sqrtPriceLimitX96 必须 <= sqrtPriceUpperX96（不能高于上限）
      let priceLimitInRange = false;
      if (zeroForOne) {
        // token0 -> token1，价格下降
        // sqrtPriceLimitX96 必须 >= sqrtPriceLowerX96（不能低于池子的最低价格）
        priceLimitInRange = sqrtPriceLimitX96 >= sqrtPriceLowerX96;
      } else {
        // token1 -> token0，价格上升
        // sqrtPriceLimitX96 必须 <= sqrtPriceUpperX96（不能高于池子的最高价格）
        priceLimitInRange = sqrtPriceLimitX96 <= sqrtPriceUpperX96;
      }

      return priceLimitInRange;
    } catch (error) {
      console.error("计算价格限制失败:", error);
      return false;
    }
  });

  if (matchingPools.length === 0) {
    return [];
  }

  // 按流动性降序排序（流动性越高越好）
  const sortedPools = matchingPools.sort((a, b) => {
    const liquidityA = BigInt(a.liquidity?.toString() || "0");
    const liquidityB = BigInt(b.liquidity?.toString() || "0");

    // 按流动性降序排序
    if (liquidityB > liquidityA) {
      return 1;
    }
    if (liquidityB < liquidityA) {
      return -1;
    }
    // 如果流动性相同，可以按费率排序作为次要条件（费率越低越好）
    return a.fee - b.fee;
  });

  // 只返回流动性最大的池子的 index
  return [sortedPools[0].index];
}

/**
 * 计算 sqrtPriceLimitX96（基于滑点）
 * @param currentSqrtPriceX96 - 当前池子的 sqrtPriceX96
 * @param slippagePercent - 滑点百分比（例如 0.5 表示 0.5%）
 * @param zeroForOne - 是否为 token0 -> token1 的交易方向
 * @returns sqrtPriceLimitX96 (BigInt)，如果无法计算则返回 0（表示无限制）
 */
export function calculateSqrtPriceLimitX96(
  currentSqrtPriceX96: bigint | string,
  slippagePercent: number,
  zeroForOne: boolean
): bigint {
  const sqrtPrice =
    typeof currentSqrtPriceX96 === "string"
      ? BigInt(currentSqrtPriceX96)
      : currentSqrtPriceX96;

  if (sqrtPrice === BigInt(0)) {
    // 如果当前价格为 0，返回 0 表示无限制
    return BigInt(0);
  }

  // 将滑点百分比转换为小数（例如 0.5% -> 0.005）
  const slippage = slippagePercent / 100;

  // 在 Uniswap V3 中，sqrtPriceLimitX96 的设置规则：
  // - 对于 zeroForOne (token0 -> token1): 价格下降，sqrtPriceLimit 应该 < 当前 sqrtPrice
  // - 对于 oneForZero (token1 -> token0): 价格上升，sqrtPriceLimit 应该 > 当前 sqrtPrice
  // - 如果设置为 0，表示无价格限制

  // 使用更精确的 BigInt 计算来避免精度损失
  const Q96 = BigInt(2) ** BigInt(96);

  let sqrtPriceLimitX96: bigint;

  if (zeroForOne) {
    // 卖出 token0，价格下降，sqrtPriceLimit < sqrtPrice
    // sqrtPriceLimit = sqrtPrice * sqrt(1 - slippage)
    // 使用 BigInt 计算：sqrtPriceLimitX96 = (sqrtPrice * sqrt(1 - slippage) * Q96) / Q96
    // 简化：sqrtPriceLimitX96 = sqrtPrice * sqrt(1 - slippage)
    const multiplier = Math.sqrt(1 - slippage);
    // 使用更精确的计算：先乘以 multiplier，再转换为 BigInt
    const sqrtPriceFloat = Number(sqrtPrice);
    const sqrtPriceLimitFloat = sqrtPriceFloat * multiplier;
    sqrtPriceLimitX96 = BigInt(Math.floor(sqrtPriceLimitFloat));

    // 确保 sqrtPriceLimit < sqrtPrice（价格下降）
    if (sqrtPriceLimitX96 >= sqrtPrice) {
      // 如果计算出的限制大于等于当前价格，设置为当前价格的 99.9%
      sqrtPriceLimitX96 = (sqrtPrice * BigInt(999)) / BigInt(1000);
    }
  } else {
    // 卖出 token1，价格上升，sqrtPriceLimit > sqrtPrice
    // sqrtPriceLimit = sqrtPrice * sqrt(1 + slippage)
    const multiplier = Math.sqrt(1 + slippage);
    const sqrtPriceFloat = Number(sqrtPrice);
    const sqrtPriceLimitFloat = sqrtPriceFloat * multiplier;
    sqrtPriceLimitX96 = BigInt(Math.floor(sqrtPriceLimitFloat));

    // 确保 sqrtPriceLimit > sqrtPrice（价格上升）
    if (sqrtPriceLimitX96 <= sqrtPrice) {
      // 如果计算出的限制小于等于当前价格，设置为当前价格的 100.1%
      sqrtPriceLimitX96 = (sqrtPrice * BigInt(1001)) / BigInt(1000);
    }
  }

  // 确保结果不为 0（0 表示无限制，但某些合约可能不接受）
  if (sqrtPriceLimitX96 === BigInt(0)) {
    // 如果计算结果为 0，返回一个很小的值或当前价格
    return sqrtPrice;
  }

  return sqrtPriceLimitX96;
}

/**
 * 计算交易方向（zeroForOne）
 * 根据合约源码：bool zeroForOne = params.tokenIn < params.tokenOut;
 * @param tokenIn - 输入代币地址
 * @param tokenOut - 输出代币地址
 * @returns true 表示 tokenIn < tokenOut（按地址字典序），false 表示 tokenIn > tokenOut
 */
export function isZeroForOne(tokenIn: Address, tokenOut: Address): boolean {
  // 根据合约逻辑：zeroForOne = tokenIn < tokenOut（按地址大小比较）
  return tokenIn.toLowerCase() < tokenOut.toLowerCase();
}

/**
 * 计算 amountOutMinimum（基于滑点和预估输出）
 * @param estimatedAmountOut - 预估的输出数量
 * @param slippagePercent - 滑点百分比
 * @returns amountOutMinimum (BigInt)
 */
export function calculateAmountOutMinimum(
  estimatedAmountOut: bigint,
  slippagePercent: number
): bigint {
  const slippage = slippagePercent / 100;
  const minimum =
    (estimatedAmountOut * BigInt(Math.floor((1 - slippage) * 10000))) /
    BigInt(10000);
  return minimum;
}

/**
 * 计算 amountInMaximum（基于滑点和预估输入）
 * @param estimatedAmountIn - 预估的输入数量
 * @param slippagePercent - 滑点百分比
 * @returns amountInMaximum (BigInt)
 */
export function calculateAmountInMaximum(
  estimatedAmountIn: bigint,
  slippagePercent: number
): bigint {
  const slippage = slippagePercent / 100;
  const maximum =
    (estimatedAmountIn * BigInt(Math.floor((1 + slippage) * 10000))) /
    BigInt(10000);
  console.log("calculateAmountInMaximum", {
    estimatedAmountIn,
    slippagePercent,
    maximum,
  });
  return maximum;
}

/**
 * 验证 sqrtPriceLimitX96 是否符合限价逻辑
 * @param currentSqrtPriceX96 - 当前池子的 sqrtPriceX96
 * @param sqrtPriceLimitX96 - 限价 sqrtPriceX96
 * @param tickLower - 池子的下界 tick
 * @param tickUpper - 池子的上界 tick
 * @param zeroForOne - 是否为 token0 -> token1 的交易方向
 * @returns 验证结果对象 { isValid: boolean, reason?: string }
 */
export function validateSqrtPriceLimitX96(
  currentSqrtPriceX96: bigint | string,
  sqrtPriceLimitX96: bigint | string,
  tickLower: number,
  tickUpper: number,
  zeroForOne: boolean
): { isValid: boolean; reason?: string } {
  const currentSqrtPrice =
    typeof currentSqrtPriceX96 === "string"
      ? BigInt(currentSqrtPriceX96)
      : currentSqrtPriceX96;
  const limitSqrtPrice =
    typeof sqrtPriceLimitX96 === "string"
      ? BigInt(sqrtPriceLimitX96)
      : sqrtPriceLimitX96;

  // 计算池子的价格边界
  const sqrtPriceLowerX96 = tickToSqrtPriceX96(tickLower);
  const sqrtPriceUpperX96 = tickToSqrtPriceX96(tickUpper);
  console.log("validateSqrtPriceLimitX96", {
    currentSqrtPrice,
    limitSqrtPrice,
    compare: limitSqrtPrice >= currentSqrtPrice,
    tickLower,
    tickUpper,
    zeroForOne,
  });
  if (zeroForOne) {
    // token0 -> token1，价格下降
    // 1. sqrtPriceLimitX96 必须 < 当前 sqrtPriceX96（价格下降）
    if (limitSqrtPrice >= currentSqrtPrice) {
      return {
        isValid: false,
        reason: `限价 ${limitSqrtPrice.toString()} 必须小于当前价格 ${currentSqrtPrice.toString()}（价格下降）`,
      };
    }

    // 2. sqrtPriceLimitX96 必须 >= sqrtPriceLowerX96（不能低于池子的最低价格）
    if (limitSqrtPrice < sqrtPriceLowerX96) {
      return {
        isValid: false,
        reason: `限价 ${limitSqrtPrice.toString()} 不能低于池子的最低价格 ${sqrtPriceLowerX96.toString()}`,
      };
    }
  } else {
    // token1 -> token0，价格上升
    // 1. sqrtPriceLimitX96 必须 > 当前 sqrtPriceX96（价格上升）
    if (limitSqrtPrice <= currentSqrtPrice) {
      return {
        isValid: false,
        reason: `限价 ${limitSqrtPrice.toString()} 必须大于当前价格 ${currentSqrtPrice.toString()}（价格上升）`,
      };
    }

    // 2. sqrtPriceLimitX96 必须 <= sqrtPriceUpperX96（不能高于池子的最高价格）
    if (limitSqrtPrice > sqrtPriceUpperX96) {
      return {
        isValid: false,
        reason: `限价 ${limitSqrtPrice.toString()} 不能高于池子的最高价格 ${sqrtPriceUpperX96.toString()}`,
      };
    }
  }

  return { isValid: true };
}
