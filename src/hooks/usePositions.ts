"use client";

import { useAccount } from "wagmi";
import { usePools } from "./usePools";

/**
 * 自定义 Hook：管理用户头寸相关逻辑
 * 封装 positions 页面的数据获取和状态管理
 */
export function usePositions() {
  const { address, isConnected } = useAccount();
  const {
    pairs,
    pools,
    isLoadingPairs,
    isLoadingPools,
    isPending,
    isConfirming,
    writeError,
  } = usePools();

  // 示例头寸数据（后续可以替换为从合约读取的真实数据）
  const positions = isConnected
    ? [
        {
          id: "1",
          pair: "ETH/USDT",
          token1: { symbol: "ETH", amount: "2.5", value: "$6,250" },
          token2: { symbol: "USDT", amount: "5,000", value: "$5,000" },
          liquidity: "$11,250",
          share: "0.089%",
          unclaimedFees: "$12.45",
        },
        {
          id: "2",
          pair: "BTC/ETH",
          token1: { symbol: "BTC", amount: "0.15", value: "$9,750" },
          token2: { symbol: "ETH", amount: "3.2", value: "$8,000" },
          liquidity: "$17,750",
          share: "0.215%",
          unclaimedFees: "$23.67",
        },
      ]
    : [];

  // 计算统计数据
  const stats = {
    totalLiquidity: "$29,000",
    unclaimedFees: "$36.12",
    activePositions: positions.length,
  };

  return {
    // 账户信息
    address,
    isConnected,

    // 交易对和池子数据（用于添加头寸）
    pairs: Array.isArray(pairs) ? pairs : [],
    pools: Array.isArray(pools) ? pools : [],
    isLoadingPairs,
    isLoadingPools,

    // 交易状态
    isPending,
    isConfirming,
    writeError,

    // 头寸数据
    positions,
    stats,
  };
}
