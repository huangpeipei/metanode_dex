/**
 * Uniswap V3 流动性计算工具
 * 用于计算从流动性头寸中能收回的代币数量
 */

import { tickToPrice, tickToSqrtPriceX96 } from "./priceUtils";

const Q96 = BigInt(2) ** BigInt(96);

/**
 * 从 tick 计算 sqrtPrice (BigInt，高精度)
 */
function tickToSqrtPrice(tick: number): bigint {
  if (tick === 0) {
    return Q96;
  }
  const lnBase = Math.log(1.0001);
  const sqrtPrice = Math.exp((tick / 2) * lnBase);
  const sqrtPriceX96Float = sqrtPrice * Number(Q96);
  return BigInt(Math.floor(sqrtPriceX96Float));
}

/**
 * 从 sqrtPriceX96 计算 sqrtPrice (浮点数)
 */
function sqrtPriceX96ToSqrtPrice(sqrtPriceX96: bigint): number {
  return Number(sqrtPriceX96) / Number(Q96);
}

/**
 * 计算从流动性头寸中能收回的代币数量
 *
 * @param liquidity - 流动性值 (uint128)
 * @param tickLower - 价格下限 tick
 * @param tickUpper - 价格上限 tick
 * @param currentTick - 当前价格 tick（可选，如果提供则使用，否则需要从池子获取）
 * @param sqrtPriceX96 - 当前 sqrtPriceX96（可选，如果提供则使用）
 * @returns 返回能收回的 token0 和 token1 数量
 */
export function calculateTokenAmountsFromLiquidity(
  liquidity: bigint | string,
  tickLower: number,
  tickUpper: number,
  currentTick?: number,
  sqrtPriceX96?: bigint | string
): {
  amount0: bigint;
  amount1: bigint;
  amount0Formatted: string;
  amount1Formatted: string;
} {
  const liquidityBigInt =
    typeof liquidity === "string" ? BigInt(liquidity) : liquidity;

  // 计算价格范围的 sqrtPrice
  const sqrtPriceLower = tickToSqrtPrice(tickLower);
  const sqrtPriceUpper = tickToSqrtPrice(tickUpper);

  // 计算当前价格的 sqrtPrice
  let sqrtPriceCurrent: bigint;
  if (sqrtPriceX96) {
    sqrtPriceCurrent =
      typeof sqrtPriceX96 === "string" ? BigInt(sqrtPriceX96) : sqrtPriceX96;
  } else if (currentTick !== undefined) {
    sqrtPriceCurrent = tickToSqrtPriceX96(currentTick);
  } else {
    // 如果没有提供当前价格，假设价格在范围内（中间值）
    // 这是一个简化处理，实际应该从池子获取当前价格
    sqrtPriceCurrent = (sqrtPriceLower + sqrtPriceUpper) / BigInt(2);
  }

  // 判断当前价格位置
  let amount0: bigint = BigInt(0);
  let amount1: bigint = BigInt(0);

  if (sqrtPriceCurrent <= sqrtPriceLower) {
    // 情况 1: 当前价格 <= tickLower，只收回 token1
    // amount0 = 0
    // amount1 = liquidity * (sqrtPriceUpper - sqrtPriceLower) / Q96
    const sqrtPriceDiff = sqrtPriceUpper - sqrtPriceLower;
    amount1 = (liquidityBigInt * sqrtPriceDiff) / Q96;
  } else if (sqrtPriceCurrent >= sqrtPriceUpper) {
    // 情况 2: 当前价格 >= tickUpper，只收回 token0
    // amount0 = liquidity * (sqrtPriceUpper - sqrtPriceLower) / (sqrtPriceUpper * sqrtPriceLower) * Q96
    // amount1 = 0
    const sqrtPriceDiff = sqrtPriceUpper - sqrtPriceLower;
    const denominator = (sqrtPriceUpper * sqrtPriceLower) / Q96;
    amount0 = (liquidityBigInt * sqrtPriceDiff) / denominator;
  } else {
    // 情况 3: tickLower < 当前价格 < tickUpper，同时收回 token0 和 token1
    // amount0 = liquidity * (sqrtPriceUpper - sqrtPriceCurrent) / (sqrtPriceCurrent * sqrtPriceUpper) * Q96
    // amount1 = liquidity * (sqrtPriceCurrent - sqrtPriceLower) / Q96

    // Token0 计算
    const sqrtPriceDiff0 = sqrtPriceUpper - sqrtPriceCurrent;
    const denominator0 = (sqrtPriceCurrent * sqrtPriceUpper) / Q96;
    amount0 = (liquidityBigInt * sqrtPriceDiff0) / denominator0;

    // Token1 计算
    const sqrtPriceDiff1 = sqrtPriceCurrent - sqrtPriceLower;
    amount1 = (liquidityBigInt * sqrtPriceDiff1) / Q96;
  }

  // 格式化显示（假设 18 位小数）
  const amount0Formatted = formatTokenAmount(amount0, 18);
  const amount1Formatted = formatTokenAmount(amount1, 18);

  return {
    amount0,
    amount1,
    amount0Formatted,
    amount1Formatted,
  };
}

/**
 * 格式化代币数量（从 wei 转换为可读格式）
 */
function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  try {
    const divisor = BigInt(10 ** decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const trimmedFractional = fractionalStr.replace(/0+$/, "");

    if (trimmedFractional === "") {
      return wholePart.toString();
    }

    return `${wholePart}.${trimmedFractional}`;
  } catch {
    return "0";
  }
}

/**
 * 计算头寸的完整收回信息（包括未领取费用）
 *
 * @param position - 头寸数据
 * @param currentTick - 当前价格 tick（可选）
 * @param sqrtPriceX96 - 当前 sqrtPriceX96（可选）
 * @returns 返回完整的收回信息
 */
export function calculatePositionWithdrawal(
  position: {
    liquidity: string | bigint;
    tickLower: number;
    tickUpper: number;
    tokensOwed0: string | bigint;
    tokensOwed1: string | bigint;
  },
  currentTick?: number,
  sqrtPriceX96?: bigint | string
): {
  // 从流动性中收回的代币
  liquidityAmount0: bigint;
  liquidityAmount1: bigint;
  liquidityAmount0Formatted: string;
  liquidityAmount1Formatted: string;
  // 未领取的费用
  feesAmount0: bigint;
  feesAmount1: bigint;
  feesAmount0Formatted: string;
  feesAmount1Formatted: string;
  // 总计收回的代币
  totalAmount0: bigint;
  totalAmount1: bigint;
  totalAmount0Formatted: string;
  totalAmount1Formatted: string;
} {
  // 计算从流动性中收回的代币
  const liquidityAmounts = calculateTokenAmountsFromLiquidity(
    position.liquidity,
    position.tickLower,
    position.tickUpper,
    currentTick,
    sqrtPriceX96
  );

  // 获取未领取费用
  const feesAmount0 =
    typeof position.tokensOwed0 === "string"
      ? BigInt(position.tokensOwed0)
      : position.tokensOwed0;
  const feesAmount1 =
    typeof position.tokensOwed1 === "string"
      ? BigInt(position.tokensOwed1)
      : position.tokensOwed1;

  // 计算总计
  const totalAmount0 = liquidityAmounts.amount0 + feesAmount0;
  const totalAmount1 = liquidityAmounts.amount1 + feesAmount1;

  return {
    liquidityAmount0: liquidityAmounts.amount0,
    liquidityAmount1: liquidityAmounts.amount1,
    liquidityAmount0Formatted: liquidityAmounts.amount0Formatted,
    liquidityAmount1Formatted: liquidityAmounts.amount1Formatted,
    feesAmount0,
    feesAmount1,
    feesAmount0Formatted: formatTokenAmount(feesAmount0, 18),
    feesAmount1Formatted: formatTokenAmount(feesAmount1, 18),
    totalAmount0,
    totalAmount1,
    totalAmount0Formatted: formatTokenAmount(totalAmount0, 18),
    totalAmount1Formatted: formatTokenAmount(totalAmount1, 18),
  };
}
