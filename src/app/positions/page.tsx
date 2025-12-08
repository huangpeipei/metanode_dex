"use client";

import { useState, useMemo } from "react";
import { Header } from "@/src/components/Header";
import { AddPositionModal } from "@/src/components/AddPositionModal";
import { usePositions } from "@/src/hooks/usePositions";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  PositionManagerAbi,
  POSITION_MANAGER_ADDRESS,
} from "@/src/utils/contractHelpers";

export default function PositionsPage() {
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"burn" | "collect" | null>(
    null
  );

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

  // 合约写操作（用于 burn 和 collect）
  const {
    writeContract,
    data: txHash,
    isPending: isTxPending,
    error: txError,
  } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const handleBurnPosition = (position: any) => {
    if (!address) return;
    try {
      const idStr = position.raw?.id ?? position.id;
      const positionId = BigInt(idStr);
      setActivePositionId(position.id);
      setActiveAction("burn");
      writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: PositionManagerAbi,
        functionName: "burn",
        args: [positionId],
        gas: BigInt(800000),
      });
    } catch (error) {
      console.error("销毁头寸失败:", error);
    }
  };

  const handleCollectFees = (position: any) => {
    if (!address) return;
    try {
      const idStr = position.raw?.id ?? position.id;
      const positionId = BigInt(idStr);
      setActivePositionId(position.id);
      setActiveAction("collect");
      writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: PositionManagerAbi,
        functionName: "collect",
        args: [positionId, address],
        gas: BigInt(500000),
      });
    } catch (error) {
      console.error("提取手续费失败:", error);
    }
  };

  // 交易确认后刷新头寸列表
  if (isTxConfirmed && txHash) {
    refetchPositions();
  }

  // 按流动性从高到低排序头寸
  const sortedPositions = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    return [...positions].sort((a, b) => {
      // 使用原始流动性值（BigInt）进行排序
      const liquidityA = BigInt(a.raw?.liquidity?.toString() || "0");
      const liquidityB = BigInt(b.raw?.liquidity?.toString() || "0");

      // 从高到低排序
      if (liquidityB > liquidityA) return 1;
      if (liquidityB < liquidityA) return -1;
      return 0;
    });
  }, [positions]);

  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <Header />

        <main className="flex flex-col justify-center items-start container mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-4">
          {/* Page Header */}
          <div className="w-full flex justify-between mb-8">
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

              {/* Positions Table */}
              <div className="w-full glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          交易对
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          Token0 数量
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          Token1 数量
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          流动性价值
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          未领取费用
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          池子份额
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPositions.map((position) => (
                        <tr
                          key={position.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white">
                                  {position.token1?.symbol?.[0] || "?"}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-white/20 flex items-center justify-center text-xs font-bold text-white">
                                  {position.token2?.symbol?.[0] || "?"}
                                </div>
                              </div>
                              <span className="text-white font-semibold">
                                {position.pair || "--"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-white font-semibold">
                                {position.token1?.amount || "--"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {position.token1?.symbol || "--"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-white font-semibold">
                                {position.token2?.amount || "--"}
                              </div>
                              <div className="text-xs text-gray-400">
                                {position.token2?.symbol || "--"}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-semibold">
                              {position.liquidity || "--"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-green-400 font-semibold">
                              {position.unclaimedFees || "--"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-semibold text-sm">
                              {position.share || "--"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleBurnPosition(position)}
                                disabled={
                                  isTxPending ||
                                  isTxConfirming ||
                                  (activePositionId === position.id &&
                                    activeAction === "collect")
                                }
                                className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activePositionId === position.id &&
                                activeAction === "burn"
                                  ? isTxConfirming
                                    ? "确认中..."
                                    : isTxPending
                                    ? "提交中..."
                                    : "销毁"
                                  : "销毁"}
                              </button>
                              <button
                                onClick={() => handleCollectFees(position)}
                                disabled={
                                  isTxPending ||
                                  isTxConfirming ||
                                  (activePositionId === position.id &&
                                    activeAction === "burn")
                                }
                                className="px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium text-sm transition-colors border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activePositionId === position.id &&
                                activeAction === "collect"
                                  ? isTxConfirming
                                    ? "确认中..."
                                    : isTxPending
                                    ? "提交中..."
                                    : "提取"
                                  : "提取"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
