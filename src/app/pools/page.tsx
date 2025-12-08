"use client";
import { useState, useEffect, useMemo } from "react";
import { Header } from "@/src/components/Header";
import { usePools } from "@/src/hooks/usePools";
import { CreatePoolModal } from "@/src/components/CreatePoolModal";
import {
  formatPriceRange,
  formatCurrentPrice,
  formatAddress,
} from "@/src/utils/contractHelpers";
import { Address } from "viem";

interface Pool {
  id: string;
  pair: string;
  token1: { symbol: string; logo: string };
  token2: { symbol: string; logo: string };
  tvl: string;
  volume24h: string;
  volume7d: string;
  fees24h: string;
  apy: string;
}

export default function PoolsPage() {
  const {
    pools,
    pairs,
    isLoadingPools,
    createAndInitializePool,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
    createdPoolAddress,
    createPool,
    refetchPools,
  } = usePools();

  const [isModalOpen, setIsModalOpen] = useState(false);

  console.log("pools", pools, pairs);

  // 按照交易对分组池子
  const groupedPools = useMemo(() => {
    const groups: Map<
      string,
      {
        token0: Address;
        token1: Address;
        pools: typeof pools;
      }
    > = new Map();

    pools.forEach((pool) => {
      if (!pool?.token0 || !pool?.token1) return;

      // 创建交易对键（按地址排序，确保 token0 < token1）
      const token0Lower = pool.token0.toLowerCase();
      const token1Lower = pool.token1.toLowerCase();
      const pairKey =
        token0Lower < token1Lower
          ? `${token0Lower}-${token1Lower}`
          : `${token1Lower}-${token0Lower}`;

      // 确定实际的 token0 和 token1（按地址排序）
      const actualToken0 =
        token0Lower < token1Lower ? pool.token0 : pool.token1;
      const actualToken1 =
        token0Lower < token1Lower ? pool.token1 : pool.token0;

      if (!groups.has(pairKey)) {
        groups.set(pairKey, {
          token0: actualToken0,
          token1: actualToken1,
          pools: [],
        });
      }

      groups.get(pairKey)!.pools.push(pool);
    });

    // 转换为数组并按 token0 地址排序
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      return a.token0.toLowerCase().localeCompare(b.token0.toLowerCase());
    });

    // 对每个组内的池子按流动性从高到低排序
    sortedGroups.forEach((group) => {
      group.pools.sort((a, b) => {
        const liquidityA = BigInt(a?.liquidity?.toString() || "0");
        const liquidityB = BigInt(b?.liquidity?.toString() || "0");

        // 从高到低排序
        if (liquidityB > liquidityA) return 1;
        if (liquidityB < liquidityA) return -1;
        return 0;
      });
    });

    return sortedGroups;
  }, [pools]);

  const handleCreatePool = async (params: {
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    sqrtPriceX96: bigint;
  }) => {
    await createAndInitializePool(
      params.token0 as `0x${string}`,
      params.token1 as `0x${string}`,
      params.fee,
      params.tickLower,
      params.tickUpper,
      params.sqrtPriceX96
    );
  };

  // 交易确认后自动刷新池子列表
  useEffect(() => {
    if (isConfirmed) {
      refetchPools();
    }
  }, [isConfirmed, refetchPools]);

  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">Pools</span>
              </h1>
              <p className="text-gray-400">View all available pools</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 md:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/50"
            >
              Create New Pool
            </button>
          </div>

          {/* Grouped Pools */}
          {isLoadingPools ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading pools...</div>
            </div>
          ) : groupedPools.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400">No pools found</div>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedPools.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-4">
                  {/* Group Header */}
                  <div className="glass rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">
                              {formatAddress(group.token0)}
                            </span>
                            <div className="flex flex-col justify-center items-center text-indigo-300 space-y-2">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5l-4 4m0 0l4 4m-4-4h12"
                                />
                              </svg>
                              <svg
                                className="w-5 h-5 rotate-180"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 5l-4 4m0 0l4 4m-4-4h12"
                                />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {formatAddress(group.token1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {group.pools.length} pool
                        {group.pools.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Pools Table for this pair */}
                  <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Pool Address
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Liquidity
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Fee Tier
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Price Range
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Current Price
                            </th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                              Tick
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.pools.map((pool, poolIndex) => (
                            <tr
                              key={`${groupIndex}-${poolIndex}`}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold text-sm">
                                  {pool?.poolAddress
                                    ? formatAddress(pool.poolAddress)
                                    : "--"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold">
                                  {pool?.liquidity || "0"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold">
                                  {pool?.fee ? `${pool.fee}%` : "--"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold text-sm">
                                  {pool?.tickLower !== undefined &&
                                  pool?.tickUpper !== undefined
                                    ? formatPriceRange(
                                        pool.tickLower,
                                        pool.tickUpper
                                      )
                                    : "--"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold text-sm">
                                  {pool?.sqrtPriceX96
                                    ? formatCurrentPrice(pool.sqrtPriceX96)
                                    : "--"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-white font-semibold text-sm">
                                  {pool?.tick !== undefined
                                    ? pool.tick.toString()
                                    : "--"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 创建池子弹窗 */}
      <CreatePoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreatePool={handleCreatePool}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={writeError}
        poolAddress={createdPoolAddress}
      />
    </div>
  );
}
