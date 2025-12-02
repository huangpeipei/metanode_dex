"use client";

import { useState } from "react";
import { Header } from "@/src/components/Header";
import { AddPositionModal } from "@/src/components/AddPositionModal";
import { usePositions } from "@/src/hooks/usePositions";

export default function PositionsPage() {
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);

  const {
    address,
    isConnected,
    pairs,
    pools,
    isLoadingPairs,
    isLoadingPools,
    isPending,
    isConfirming,
    writeError,
    positions,
    isLoadingPositions,
    positionsError,
    refetchPositions,
    stats,
  } = usePositions();

  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 pointer-events-none" />

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">我的头寸</span>
              </h1>
              <p className="text-gray-400">查看和管理您的流动性头寸</p>
            </div>
            <button
              onClick={() => setIsAddPositionModalOpen(true)}
              className="mt-4 md:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/50"
            >
              添加头寸
            </button>
          </div>

          {!isConnected ? (
            /* Not Connected State */
            <div className="glass rounded-2xl p-12 border border-white/10 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                请连接钱包
              </h3>
              <p className="text-gray-400 mb-6">
                连接钱包后即可查看您的流动性头寸
              </p>
            </div>
          ) : isLoadingPositions ? (
            /* Loading State */
            <div className="glass rounded-2xl p-12 border border-white/10 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-indigo-400 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                加载中...
              </h3>
              <p className="text-gray-400 mb-6">正在从链上获取您的头寸数据</p>
            </div>
          ) : positionsError ? (
            /* Error State */
            <div className="glass rounded-2xl p-12 border border-red-500/20 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                加载失败
              </h3>
              <p className="text-gray-400 mb-6">
                {positionsError.message || "无法获取头寸数据，请稍后重试"}
              </p>
              <button
                onClick={() => refetchPositions()}
                className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium transition-colors"
              >
                重试
              </button>
            </div>
          ) : positions.length === 0 ? (
            /* No Positions State */
            <div className="glass rounded-2xl p-12 border border-white/10 text-center">
              <div className="w-20 h-20 rounded-full bg-white/5 mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                暂无头寸
              </h3>
              <p className="text-gray-400 mb-6">您还没有添加任何流动性头寸</p>
            </div>
          ) : (
            /* Positions List */
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">总流动性价值</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.totalLiquidity}
                  </div>
                  <div className="text-xs text-green-400">+5.2%</div>
                </div>
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">未领取费用</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.unclaimedFees}
                  </div>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">
                    领取全部
                  </button>
                </div>
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">活跃头寸</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.activePositions}
                  </div>
                  <div className="text-xs text-gray-400">个池子</div>
                </div>
              </div>

              {/* Positions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {positions.map((position) => (
                  <div
                    key={position.id}
                    className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="flex -space-x-2">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 flex items-center justify-center text-sm font-bold text-white">
                            {position.token1.symbol[0]}
                          </div>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-white/20 flex items-center justify-center text-sm font-bold text-white">
                            {position.token2.symbol[0]}
                          </div>
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">
                            {position.pair}
                          </div>
                          <div className="text-xs text-gray-400">
                            池子份额: {position.share}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token Amounts */}
                    <div className="space-y-3 mb-6">
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">
                            {position.token1.symbol}
                          </span>
                          <span className="text-white font-semibold">
                            {position.token1.amount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {position.token1.value}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-400">
                            {position.token2.symbol}
                          </span>
                          <span className="text-white font-semibold">
                            {position.token2.amount}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {position.token2.value}
                        </div>
                      </div>
                    </div>

                    {/* Liquidity & Fees */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <span className="text-sm text-gray-400">
                          流动性价值
                        </span>
                        <span className="text-white font-bold">
                          {position.liquidity}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <span className="text-sm text-green-400">
                          未领取费用
                        </span>
                        <span className="text-green-400 font-bold">
                          {position.unclaimedFees}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button className="flex-1 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors border border-red-500/20">
                        销毁头寸
                      </button>
                      <button className="flex-1 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium transition-colors border border-green-500/20">
                        提取手续费
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 添加头寸模态框 */}
          {isConnected && address && (
            <AddPositionModal
              isOpen={isAddPositionModalOpen}
              onClose={() => setIsAddPositionModalOpen(false)}
              pairs={Array.isArray(pairs) ? pairs : []}
              pools={Array.isArray(pools) ? pools : []}
              isLoadingPairs={isLoadingPairs}
              isLoadingPools={isLoadingPools}
              userAddress={address}
              onSuccess={() => {
                // 刷新头寸列表
                refetchPositions();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
