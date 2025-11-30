"use client";
import { useState, useEffect } from "react";
import { Header } from "@/src/components/Header";
import { usePools } from "@/src/hooks/usePools";
import { CreatePoolModal } from "@/src/components/CreatePoolModal";
import {
  formatPriceRange,
  formatCurrentPrice,
} from "@/src/utils/contractHelpers";

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

  const handleCreatePool = async (params: {
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
  }) => {
    await createPool(
      params.token0 as `0x${string}`,
      params.token1 as `0x${string}`,
      params.tickLower,
      params.tickUpper,
      params.fee
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

          {/* Pools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        {pool?.token0
                          ? `${pool.token0.slice(0, 6)}...${pool.token0.slice(
                              -4
                            )}`
                          : "--"}
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
                        {pool?.token1
                          ? `${pool.token1.slice(0, 6)}...${pool.token1.slice(
                              -4
                            )}`
                          : "--"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                      <span>Token0</span>
                      <span>Token1</span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Pool Address</span>
                    <span className="text-white font-semibold">
                      {pool?.poolAddress
                        ? `${pool.poolAddress.slice(
                            0,
                            6
                          )}...${pool.poolAddress.slice(-4)}`
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Liquidity</span>
                    <span className="text-white font-semibold">
                      {pool?.liquidity}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Fee tier</span>
                    <span className="text-white font-semibold">
                      {pool?.fee}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Price Range</span>
                    <span className="text-white font-semibold text-right">
                      {pool?.tickLower !== undefined &&
                      pool?.tickUpper !== undefined
                        ? formatPriceRange(pool.tickLower, pool.tickUpper)
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Current Price</span>
                    <span className="text-white font-semibold text-right">
                      {pool?.sqrtPriceX96
                        ? formatCurrentPrice(pool.sqrtPriceX96)
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
