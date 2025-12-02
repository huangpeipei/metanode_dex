"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { Address } from "viem";
import { usePools } from "./usePools";
import {
  PositionManagerAbi,
  POSITION_MANAGER_ADDRESS,
  formatPositionData,
} from "@/src/utils/contractHelpers";

/**
 * 格式化代币数量（从 wei 转换为可读格式）
 */
function formatTokenAmount(amount: string, decimals: number = 18): string {
  try {
    const amountBigInt = BigInt(amount || "0");
    const divisor = BigInt(10 ** decimals);
    const wholePart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;

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
 * 格式化地址为缩写形式
 */
function formatAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

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

  // 从链上获取所有头寸
  const {
    data: allPositionsData,
    isLoading: isLoadingPositions,
    error: positionsError,
    refetch: refetchPositions,
  } = useReadContract({
    address: POSITION_MANAGER_ADDRESS,
    abi: PositionManagerAbi,
    functionName: "getAllPositions",
    query: {
      enabled:
        !!POSITION_MANAGER_ADDRESS &&
        POSITION_MANAGER_ADDRESS !==
          "0x0000000000000000000000000000000000000000",
    },
  });

  // 格式化并过滤当前用户的头寸
  const positions = useMemo(() => {
    if (!isConnected || !address || !allPositionsData) return [];
    console.log("allPositionsData", allPositionsData);
    // 格式化所有头寸数据
    const formattedPositions =
      (allPositionsData as any[])
        ?.map(formatPositionData)
        .filter((pos) => pos !== null) || [];

    // 过滤出当前用户的头寸
    const userPositions = formattedPositions.filter(
      (pos) => pos.owner.toLowerCase() === address.toLowerCase()
    );

    // 转换为页面显示格式
    return userPositions.map((pos) => {
      console.log("userPositions", pos);
      // 格式化流动性值
      const liquidityFormatted = formatTokenAmount(pos.liquidity, 18);

      // 格式化未领取费用
      const tokensOwed0Formatted = formatTokenAmount(pos.tokensOwed0, 18);
      const tokensOwed1Formatted = formatTokenAmount(pos.tokensOwed1, 18);

      // 显示未领取费用（显示两个代币的数量）
      const unclaimedFeesDisplay =
        parseFloat(tokensOwed0Formatted) > 0 ||
        parseFloat(tokensOwed1Formatted) > 0
          ? `${tokensOwed0Formatted} / ${tokensOwed1Formatted}`
          : "0 / 0";

      return {
        id: pos.id,
        pair: `${formatAddress(pos.token0)} / ${formatAddress(pos.token1)}`,
        token1: {
          symbol: formatAddress(pos.token0),
          amount: tokensOwed0Formatted, // 显示流动性值
          value: `Token0: ${formatAddress(pos.token0)}`,
        },
        token2: {
          symbol: formatAddress(pos.token1),
          amount: tokensOwed1Formatted, // 显示流动性值
          value: `Token1: ${formatAddress(pos.token1)}`,
        },
        liquidity: liquidityFormatted, // 流动性值
        share: `${pos.fee}%`, // 费率
        unclaimedFees: unclaimedFeesDisplay, // 未领取费用（两个代币的数量）
        // 保留原始数据以便后续使用
        raw: pos,
      };
    });
  }, [allPositionsData, address, isConnected]);

  // 计算统计数据
  const stats = useMemo(() => {
    if (positions.length === 0) {
      return {
        totalLiquidity: "$0",
        unclaimedFees: "$0",
        activePositions: 0,
      };
    }

    // 计算总流动性（所有头寸的流动性总和）
    const totalLiquidity = positions.reduce((sum, pos) => {
      const value = parseFloat(pos.liquidity.replace(",", ""));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // 计算总未领取费用（简化：只计算 token0 和 token1 的总和）
    const totalUnclaimedFees = positions.reduce((sum, pos) => {
      // unclaimedFees 格式为 "amount0 / amount1"
      const parts = pos.unclaimedFees.split(" / ");
      const amount0 = parseFloat(parts[0] || "0");
      const amount1 = parseFloat(parts[1] || "0");
      return sum + amount0 + amount1;
    }, 0);

    return {
      totalLiquidity: totalLiquidity.toFixed(6), // 流动性值（不显示 $ 符号）
      unclaimedFees: totalUnclaimedFees.toFixed(6), // 未领取费用（不显示 $ 符号）
      activePositions: positions.length,
    };
  }, [positions]);

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
    isLoadingPositions,
    positionsError,
    refetchPositions, // 用于手动刷新头寸列表
    stats,
  };
}
