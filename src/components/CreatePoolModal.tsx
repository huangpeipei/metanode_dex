"use client";

import { useState, useEffect, useRef } from "react";
import { Address } from "viem";
import { isValidAddress } from "@/src/utils/contractHelpers";
import {
  tickToSqrtPriceX96,
  tickToPrice,
  formatPrice,
} from "@/src/utils/priceUtils";

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePool: (params: {
    token0: Address;
    token1: Address;
    fee: number;
    tickLower: number;
    tickUpper: number;
    sqrtPriceX96: bigint;
  }) => Promise<void>;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
  poolAddress?: string;
}

export function CreatePoolModal({
  isOpen,
  onClose,
  onCreatePool,
  isPending,
  isConfirming,
  isConfirmed,
  error,
  poolAddress,
}: CreatePoolModalProps) {
  const [token0, setToken0] = useState("");
  const [token1, setToken1] = useState("");
  const [fee, setFee] = useState("");
  const [tickLower, setTickLower] = useState("");
  const [tickUpper, setTickUpper] = useState("");
  const [selectedTick, setSelectedTick] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");

  // 使用 ref 跟踪是否在弹窗打开期间提交了交易
  const hasSubmittedRef = useRef(false);
  const processedConfirmationRef = useRef<string | undefined>(undefined);

  // 当弹窗打开时，重置提交状态
  useEffect(() => {
    if (isOpen) {
      hasSubmittedRef.current = false;
      setSubmitError("");
      setSelectedTick(null);
    }
  }, [isOpen]);

  // 当 tickLower 和 tickUpper 变化时，更新选中的 tick（默认为 tickLower）
  useEffect(() => {
    if (
      tickLower &&
      tickUpper &&
      !isNaN(Number(tickLower)) &&
      !isNaN(Number(tickUpper))
    ) {
      const lower = Number(tickLower);
      const upper = Number(tickUpper);
      if (lower < upper) {
        // 默认选择最小值（tickLower）
        setSelectedTick(lower);
      }
    }
  }, [tickLower, tickUpper]);

  // 交易确认成功后关闭弹窗并重置表单
  // 只有当弹窗打开、交易确认成功、且是在当前弹窗打开期间提交的交易时才执行
  useEffect(() => {
    if (
      isOpen &&
      isConfirmed &&
      poolAddress &&
      hasSubmittedRef.current &&
      processedConfirmationRef.current !== poolAddress
    ) {
      // 标记已处理，避免重复触发
      processedConfirmationRef.current = poolAddress;

      // 延迟关闭，让用户看到成功信息和池子地址
      const timer = setTimeout(() => {
        setToken0("");
        setToken1("");
        setFee("");
        setTickLower("");
        setTickUpper("");
        setSelectedTick(null);
        setErrors({});
        setSubmitError("");
        hasSubmittedRef.current = false;
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isConfirmed, poolAddress, onClose]);

  // 当错误状态更新时显示错误信息（仅在弹窗打开时）
  useEffect(() => {
    if (isOpen && error) {
      const errorMessage = error.message || "创建池子失败，请检查参数并重试";
      setSubmitError(errorMessage);
    }
  }, [isOpen, error]);

  // 必须在所有 Hooks 之后才能有条件返回
  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!token0 || !isValidAddress(token0)) {
      newErrors.token0 = "请输入有效的 Token0 地址";
    }
    if (!token1 || !isValidAddress(token1)) {
      newErrors.token1 = "请输入有效的 Token1 地址";
    }
    if (token0 && token1 && token0.toLowerCase() === token1.toLowerCase()) {
      newErrors.token1 = "Token0 和 Token1 不能相同";
    }
    if (!fee || isNaN(Number(fee)) || Number(fee) <= 0) {
      newErrors.fee = "请输入有效的费率（例如：3000 表示 0.3%）";
    }
    if (!tickLower || isNaN(Number(tickLower))) {
      newErrors.tickLower = "请输入有效的 tickLower";
    }
    if (!tickUpper || isNaN(Number(tickUpper))) {
      newErrors.tickUpper = "请输入有效的 tickUpper";
    }
    if (tickLower && tickUpper && Number(tickLower) >= Number(tickUpper)) {
      newErrors.tickUpper = "tickUpper 必须大于 tickLower";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    // 标记已提交交易
    hasSubmittedRef.current = true;
    processedConfirmationRef.current = undefined;

    // 计算 sqrtPriceX96
    const tick = selectedTick !== null ? selectedTick : Number(tickLower);
    const sqrtPriceX96 = tickToSqrtPriceX96(tick);

    try {
      await onCreatePool({
        token0: token0 as Address,
        token1: token1 as Address,
        fee: Number(fee),
        tickLower: Number(tickLower),
        tickUpper: Number(tickUpper),
        sqrtPriceX96,
      });
      // 不在这里关闭弹窗，等待交易确认
    } catch (error) {
      console.error("创建池子失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "创建池子失败，请重试";
      setSubmitError(errorMessage);
      // 失败时重置提交状态
      hasSubmittedRef.current = false;
      // 失败时不关闭弹窗
    }
  };

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      setToken0("");
      setToken1("");
      setFee("");
      setTickLower("");
      setTickUpper("");
      setSelectedTick(null);
      setErrors({});
      setSubmitError("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className="relative glass rounded-2xl p-8 border border-white/20 w-full max-w-md mx-4">
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
          创建新流动性池
        </h2>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token0 地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token0 地址
            </label>
            <input
              type="text"
              value={token0}
              onChange={(e) => setToken0(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isPending || isConfirming}
            />
            {errors.token0 && (
              <p className="mt-1 text-sm text-red-400">{errors.token0}</p>
            )}
          </div>

          {/* Token1 地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Token1 地址
            </label>
            <input
              type="text"
              value={token1}
              onChange={(e) => setToken1(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isPending || isConfirming}
            />
            {errors.token1 && (
              <p className="mt-1 text-sm text-red-400">{errors.token1}</p>
            )}
          </div>

          {/* 费率 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              费率 (例如: 3000 = 0.3%)
            </label>
            <input
              type="number"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="3000"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isPending || isConfirming}
            />
            {errors.fee && (
              <p className="mt-1 text-sm text-red-400">{errors.fee}</p>
            )}
          </div>

          {/* Tick Lower */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tick Lower
            </label>
            <input
              type="number"
              value={tickLower}
              onChange={(e) => setTickLower(e.target.value)}
              placeholder="-887220"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isPending || isConfirming}
            />
            {errors.tickLower && (
              <p className="mt-1 text-sm text-red-400">{errors.tickLower}</p>
            )}
          </div>

          {/* Tick Upper */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tick Upper
            </label>
            <input
              type="number"
              value={tickUpper}
              onChange={(e) => setTickUpper(e.target.value)}
              placeholder="887220"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              disabled={isPending || isConfirming}
            />
            {errors.tickUpper && (
              <p className="mt-1 text-sm text-red-400">{errors.tickUpper}</p>
            )}
          </div>

          {/* 价格选择滑块 */}
          {tickLower &&
            tickUpper &&
            !isNaN(Number(tickLower)) &&
            !isNaN(Number(tickUpper)) &&
            Number(tickLower) < Number(tickUpper) &&
            selectedTick !== null && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择初始价格 (Tick: {selectedTick})
                </label>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={Number(tickLower)}
                    max={Number(tickUpper)}
                    value={selectedTick}
                    onChange={(e) => setSelectedTick(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    disabled={isPending || isConfirming}
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>
                      Min: {Number(tickLower)}
                      <br />
                      Price: {formatPrice(tickToPrice(Number(tickLower)))}
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      Selected: {selectedTick}
                      <br />
                      Price: {formatPrice(tickToPrice(selectedTick))}
                    </span>
                    <span>
                      Max: {Number(tickUpper)}
                      <br />
                      Price: {formatPrice(tickToPrice(Number(tickUpper)))}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* 错误信息显示 */}
          {submitError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* 成功信息显示 */}
          {isConfirmed && poolAddress && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-green-400 mb-2">✅ 池子创建成功！</p>
              <p className="text-xs text-gray-400">
                池子地址: ...{String(poolAddress).slice(-6)}
              </p>
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
                : isConfirmed
                ? "创建成功"
                : "创建池子"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
