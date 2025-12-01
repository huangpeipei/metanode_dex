"use client";

import { useState, useEffect, useMemo } from "react";
import { Address } from "viem";
import {
  isValidAddress,
  formatPairData,
  formatPoolData,
} from "@/src/utils/contractHelpers";
import { formatPriceRange, formatCurrentPrice } from "@/src/utils/priceUtils";

interface Pair {
  token0: Address;
  token1: Address;
}

interface Pool {
  poolAddress: Address;
  token0: Address;
  token1: Address;
  fee: number;
  liquidity: string;
  tick: number;
  tickLower: number;
  tickUpper: number;
  sqrtPriceX96: string;
  index: number;
}

interface AddPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPosition: (params: {
    token0: Address;
    token1: Address;
    index: number;
    amount0Desired: bigint;
    amount1Desired: bigint;
    recipient: Address;
    deadline: bigint;
  }) => Promise<void>;
  pairs: any[];
  pools: any[];
  isLoadingPairs: boolean;
  isLoadingPools: boolean;
  isPending: boolean;
  isConfirming: boolean;
  error: Error | null;
  userAddress?: Address;
}

export function AddPositionModal({
  isOpen,
  onClose,
  onAddPosition,
  pairs,
  pools,
  isLoadingPairs,
  isLoadingPools,
  isPending,
  isConfirming,
  error,
  userAddress,
}: AddPositionModalProps) {
  const [selectedPair, setSelectedPair] = useState<Pair | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");

  // 格式化交易对数据
  const formattedPairs = useMemo(() => {
    if (!pairs || !Array.isArray(pairs)) return [];
    return pairs
      .map(formatPairData)
      .filter((pair): pair is Pair => pair !== null);
  }, [pairs]);

  // 根据选择的交易对过滤池子
  const filteredPools = useMemo(() => {
    if (!selectedPair || !pools || !Array.isArray(pools)) return [];
    return pools.filter((pool): pool is Pool => {
      if (!pool) return false;
      const token0Match =
        pool.token0.toLowerCase() === selectedPair.token0.toLowerCase() &&
        pool.token1.toLowerCase() === selectedPair.token1.toLowerCase();
      const token1Match =
        pool.token0.toLowerCase() === selectedPair.token1.toLowerCase() &&
        pool.token1.toLowerCase() === selectedPair.token0.toLowerCase();
      return token0Match || token1Match;
    });
  }, [selectedPair, pools]);

  // 当弹窗打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedPair(null);
      setSelectedPool(null);
      setAmount0("");
      setAmount1("");
      setErrors({});
      setSubmitError("");
    }
  }, [isOpen]);

  // 当选择交易对变化时，重置池子和数量
  useEffect(() => {
    if (selectedPair) {
      setSelectedPool(null);
      setAmount0("");
      setAmount1("");
    }
  }, [selectedPair]);

  // 当选择池子变化时，重置数量
  useEffect(() => {
    if (selectedPool) {
      setAmount0("");
      setAmount1("");
    }
  }, [selectedPool]);

  // 当错误状态更新时显示错误信息
  useEffect(() => {
    if (error) {
      const errorMessage = error.message || "添加头寸失败，请检查参数并重试";
      setSubmitError(errorMessage);
    }
  }, [error]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedPair) {
      newErrors.pair = "请选择交易对";
    }
    if (!selectedPool) {
      newErrors.pool = "请选择交易池";
    }
    if (!amount0 && !amount1) {
      newErrors.amount = "请输入 token0 或 token1 的数量";
    }
    if (amount0 && (isNaN(Number(amount0)) || Number(amount0) <= 0)) {
      newErrors.amount0 = "请输入有效的 token0 数量";
    }
    if (amount1 && (isNaN(Number(amount1)) || Number(amount1) <= 0)) {
      newErrors.amount1 = "请输入有效的 token1 数量";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate() || !selectedPair || !selectedPool) return;

    try {
      // 计算 deadline（当前时间 + 20 分钟）
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

      if (!userAddress) {
        setSubmitError("请先连接钱包");
        return;
      }

      // 将代币数量转换为 wei（假设 18 位小数，实际应该从代币合约读取）
      const amount0Wei = amount0
        ? BigInt(Math.floor(parseFloat(amount0) * 1e18))
        : BigInt(0);
      const amount1Wei = amount1
        ? BigInt(Math.floor(parseFloat(amount1) * 1e18))
        : BigInt(0);

      await onAddPosition({
        token0: selectedPool.token0,
        token1: selectedPool.token1,
        index: selectedPool.index,
        amount0Desired: amount0Wei,
        amount1Desired: amount1Wei,
        recipient: userAddress,
        deadline,
      });
    } catch (error) {
      console.error("添加头寸失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "添加头寸失败，请重试";
      setSubmitError(errorMessage);
    }
  };

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      setSelectedPair(null);
      setSelectedPool(null);
      setAmount0("");
      setAmount1("");
      setErrors({});
      setSubmitError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className="relative glass rounded-2xl p-8 border border-white/20 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          disabled={isPending || isConfirming}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* 标题 */}
        <h2 className="text-2xl font-bold mb-6 gradient-text">
          添加流动性头寸
        </h2>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 步骤 1: 选择交易对 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              1. 选择交易对
            </label>
            {isLoadingPairs ? (
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-center">
                加载中...
              </div>
            ) : formattedPairs.length === 0 ? (
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-center">
                暂无交易对
              </div>
            ) : (
              <select
                value={
                  selectedPair
                    ? `${selectedPair.token0}-${selectedPair.token1}`
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const [token0, token1] = value.split("-");
                    setSelectedPair({
                      token0: token0 as Address,
                      token1: token1 as Address,
                    });
                  } else {
                    setSelectedPair(null);
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                disabled={isPending || isConfirming}
              >
                <option value="">请选择交易对</option>
                {formattedPairs.map((pair, index) => (
                  <option
                    key={index}
                    value={`${pair.token0}-${pair.token1}`}
                    className="bg-gray-800"
                  >
                    {`${pair.token0.slice(0, 6)}...${pair.token0.slice(
                      -4
                    )} / ${pair.token1.slice(0, 6)}...${pair.token1.slice(-4)}`}
                  </option>
                ))}
              </select>
            )}
            {errors.pair && (
              <p className="mt-1 text-sm text-red-400">{errors.pair}</p>
            )}
          </div>

          {/* 步骤 2: 选择交易池 */}
          {selectedPair && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                2. 选择交易池
              </label>
              {isLoadingPools ? (
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-center">
                  加载中...
                </div>
              ) : filteredPools.length === 0 ? (
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-center">
                  该交易对暂无可用池子
                </div>
              ) : (
                <select
                  value={
                    selectedPool
                      ? `${selectedPool.poolAddress}-${selectedPool.index}`
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [poolAddress, index] = value.split("-");
                      console.log("p.poolAddress.toLowerCase()", filteredPools);
                      const pool = filteredPools.find(
                        (p) =>
                          p.poolAddress.toLowerCase() ===
                            poolAddress.toLowerCase() &&
                          p.index === Number(index)
                      );
                      setSelectedPool(pool || null);
                    } else {
                      setSelectedPool(null);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  disabled={isPending || isConfirming}
                >
                  <option value="">请选择交易池</option>
                  {filteredPools.map((pool, index) => (
                    <option
                      key={index}
                      value={`${pool.poolAddress}-${pool.index}`}
                      className="bg-gray-800"
                    >
                      {`Fee: ${pool.fee}% | Price Range: ${formatPriceRange(
                        pool.tickLower,
                        pool.tickUpper
                      )} | Current: ${formatCurrentPrice(pool.sqrtPriceX96)}`}
                    </option>
                  ))}
                </select>
              )}
              {errors.pool && (
                <p className="mt-1 text-sm text-red-400">{errors.pool}</p>
              )}
            </div>
          )}

          {/* 步骤 3: 输入代币数量 */}
          {selectedPool && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                3. 输入代币数量（至少输入一个）
              </label>

              {/* Token0 数量 */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Token0 数量
                </label>
                <input
                  type="text"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  disabled={isPending || isConfirming}
                />
                {errors.amount0 && (
                  <p className="mt-1 text-sm text-red-400">{errors.amount0}</p>
                )}
              </div>

              {/* Token1 数量 */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">
                  Token1 数量
                </label>
                <input
                  type="text"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  disabled={isPending || isConfirming}
                />
                {errors.amount1 && (
                  <p className="mt-1 text-sm text-red-400">{errors.amount1}</p>
                )}
              </div>

              {errors.amount && (
                <p className="text-sm text-red-400">{errors.amount}</p>
              )}
            </div>
          )}

          {/* 错误信息显示 */}
          {submitError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending || isConfirming}
              className="flex-1 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? "等待授权..."
                : isConfirming
                ? "确认中..."
                : "添加头寸"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
