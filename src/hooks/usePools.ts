"use client";

import { useMemo } from "react";

/**
 * 自定义 Hook：管理流动性池
 */

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { Address, decodeEventLog } from "viem";
import {
  PoolManagerAbi,
  POOL_MANAGER_ADDRESS,
  formatPoolData,
} from "@/src/utils/contractHelpers";

console.log("POOL_MANAGER_ADDRESS 111", POOL_MANAGER_ADDRESS);
export function usePools() {
  // 读取所有池子
  const {
    data: allPools,
    isLoading: isLoadingPools,
    error: poolsError,
    refetch: refetchPools,
  } = useReadContract({
    address: POOL_MANAGER_ADDRESS,
    abi: PoolManagerAbi,
    functionName: "getAllPools",
  });

  // 读取所有交易对
  const {
    data: pairs,
    isLoading: isLoadingPairs,
    error: pairsError,
  } = useReadContract({
    address: POOL_MANAGER_ADDRESS,
    abi: PoolManagerAbi,
    functionName: "getPairs",
  });

  // 写入合约
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  // 等待交易确认
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  // 从交易收据中提取池子地址
  const createdPoolAddress = useMemo(() => {
    if (!receipt || !isConfirmed) return undefined;

    try {
      // 从 logs 中查找 PoolCreated 事件
      const poolCreatedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: PoolManagerAbi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "PoolCreated";
        } catch {
          return false;
        }
      });

      if (poolCreatedLog) {
        const decoded = decodeEventLog({
          abi: PoolManagerAbi,
          data: poolCreatedLog.data,
          topics: poolCreatedLog.topics,
        });
        return (decoded.args as any)?.pool as Address | undefined;
      }
    } catch (error) {
      console.error("解析池子地址失败:", error);
    }

    return undefined;
  }, [receipt, isConfirmed]);

  // 监听池子创建事件
  useWatchContractEvent({
    address: POOL_MANAGER_ADDRESS,
    abi: PoolManagerAbi,
    eventName: "PoolCreated",
    onLogs() {
      // 当有新池子创建时，自动刷新数据
      refetchPools();
    },
  });

  // 创建池子
  const createPool = async (
    tokenA: Address,
    tokenB: Address,
    tickLower: number,
    tickUpper: number,
    fee: number
  ) => {
    try {
      await writeContract({
        address: POOL_MANAGER_ADDRESS,
        abi: PoolManagerAbi,
        functionName: "createPool",
        args: [tokenA, tokenB, tickLower, tickUpper, fee],
      });
    } catch (error) {
      console.error("创建池子失败:", error);
      throw error;
    }
  };

  // 创建并初始化池子（如果不存在）
  const createAndInitializePool = async (
    token0: Address,
    token1: Address,
    fee: number,
    tickLower: number,
    tickUpper: number
  ) => {
    try {
      await writeContract({
        address: POOL_MANAGER_ADDRESS,
        abi: PoolManagerAbi,
        functionName: "createAndInitializePoolIfNecessary",
        args: [
          {
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            sqrtPriceX96: BigInt(1441840186846502440478224405239589), // 新创建池子时不传当前价格，传 0
          },
        ],
        // 设置 gas limit，避免超过区块限制
        gas: BigInt(16000000), // 设置为略低于区块限制 16777216
      });
    } catch (error) {
      console.error("创建并初始化池子失败:", error);
      throw error;
    }
  };

  // 注意：获取特定池子需要使用独立的 useReadContract hook
  // 这里不包含在返回对象中，因为需要动态参数

  // 格式化池子数据
  const formattedPools = allPools
    ? (Array.isArray(allPools) ? allPools : []).map(formatPoolData)
    : [];

  return {
    // 数据
    pools: formattedPools,
    pairs: pairs || [],
    poolAddress: hash ? hash : undefined,
    createdPoolAddress,

    // 加载状态
    isLoadingPools,
    isLoadingPairs,
    isPending,
    isConfirming,
    isConfirmed,

    // 错误
    poolsError,
    pairsError,
    writeError,

    // 方法
    createPool,
    createAndInitializePool,
    refetchPools,
  };
}
