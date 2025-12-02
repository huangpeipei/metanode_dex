/**
 * 合约调用辅助函数
 */

import { Address } from "viem";
import { PoolManagerAbi, PositionManagerAbi, SwapRouterAbi } from "./stakeAbi";
import { ERC20Abi } from "./erc20Abi";

// 合约地址常量（请根据实际部署地址修改）
export const POOL_MANAGER_ADDRESS = (process.env
  .NEXT_PUBLIC_POOL_MANAGER_ADDRESS ||
  "0xddC12b3F9F7C91C79DA7433D8d212FB78d609f7B") as Address;

export const POSITION_MANAGER_ADDRESS = (process.env
  .NEXT_PUBLIC_POSITION_MANAGER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

console.log(
  "POOL_MANAGER_ADDRESS",
  process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS,
  POOL_MANAGER_ADDRESS
);

/**
 * 格式化池子数据
 */
export function formatPoolData(pool: any) {
  if (!pool) return null;

  return {
    poolAddress: pool.pool as Address,
    token0: pool.token0 as Address,
    token1: pool.token1 as Address,
    fee: Number(pool.fee) / 10000, // 转换为百分比
    liquidity: pool.liquidity?.toString() || "0",
    tick: Number(pool.tick),
    tickLower: Number(pool.tickLower),
    tickUpper: Number(pool.tickUpper),
    sqrtPriceX96: pool.sqrtPriceX96?.toString() || "0",
    index: Number(pool.index),
  };
}

/**
 * 格式化交易对数据
 */
export function formatPairData(pair: any) {
  if (!pair) return null;

  return {
    token0: pair.token0 as Address,
    token1: pair.token1 as Address,
  };
}

/**
 * 计算费用（从 uint24 转换为百分比）
 */
export function formatFee(fee: bigint | number): string {
  const feeNumber = typeof fee === "bigint" ? Number(fee) : fee;
  return `${(feeNumber / 10000).toFixed(2)}%`;
}

/**
 * 验证地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 合约 ABI 导出
 */
export { PoolManagerAbi, PositionManagerAbi, SwapRouterAbi, ERC20Abi };

/**
 * 价格计算工具导出
 */
export {
  tickToPrice,
  sqrtPriceX96ToPrice,
  formatPrice,
  formatPriceRange,
  formatCurrentPrice,
  getPriceRangeInfo,
  getCurrentPriceInfo,
} from "./priceUtils";
