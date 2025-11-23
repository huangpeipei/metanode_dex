"use client";

import { Header } from "@/src/components/Header";
import { useAccount } from "wagmi";

interface Position {
  id: string;
  pair: string;
  token1: { symbol: string; amount: string; value: string };
  token2: { symbol: string; amount: string; value: string };
  liquidity: string;
  share: string;
  unclaimedFees: string;
}

export default function PositionsPage() {
  const { address, isConnected } = useAccount();

  // 示例数据
  const positions: Position[] = isConnected
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

  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 pointer-events-none" />

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">我的头寸</span>
            </h1>
            <p className="text-gray-400">查看和管理您的流动性头寸</p>
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
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all">
                添加流动性
              </button>
            </div>
          ) : (
            /* Positions List */
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">总流动性价值</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    $29,000
                  </div>
                  <div className="text-xs text-green-400">+5.2%</div>
                </div>
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">未领取费用</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    $36.12
                  </div>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 mt-2">
                    领取全部
                  </button>
                </div>
                <div className="glass rounded-xl p-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">活跃头寸</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {positions.length}
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
                      <button className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                        管理
                      </button>
                      <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-colors">
                        领取
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
