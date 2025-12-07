"use client";

import { useState, useEffect, useMemo } from "react";
import { Address, formatUnits } from "viem";
import { useSwap } from "@/src/hooks/useSwap";
import { ConnectWallet } from "./ConnectWallet";
import { formatAddress, formatPairData } from "@/src/utils/contractHelpers";

export function TradeCard() {
  const [isTokenInDropdownOpen, setIsTokenInDropdownOpen] = useState(false);
  const [isTokenOutDropdownOpen, setIsTokenOutDropdownOpen] = useState(false);
  const [isSlippageSettingsOpen, setIsSlippageSettingsOpen] = useState(false);

  const {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    inputMode,
    slippagePercent,
    selectedPool,
    indexPath,
    isConnected,
    address,
    pairs,
    pools,
    isLoadingPairs,
    isLoadingPools,
    isLoadingQuoteInput,
    isLoadingQuoteOutput,
    quoteInputError,
    quoteOutputError,
    tokenInBalance,
    tokenInAllowance,
    isLoadingTokenInBalance,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
    setTokenIn,
    setTokenOut,
    setAmountIn,
    setAmountOut,
    setInputMode,
    setSlippagePercent,
    executeSwap,
  } = useSwap();

  // 获取所有唯一的代币地址列表
  const uniqueTokens = useMemo(() => {
    const tokenSet = new Set<Address>();
    pairs.forEach((pair: any) => {
      const formatted = formatPairData(pair);
      if (formatted) {
        tokenSet.add(formatted.token0);
        tokenSet.add(formatted.token1);
      }
    });
    return Array.from(tokenSet);
  }, [pairs]);

  // 格式化余额显示
  const tokenInBalanceFormatted = useMemo(() => {
    if (!tokenInBalance || !tokenIn) return "0.00";
    try {
      return parseFloat(formatUnits(tokenInBalance as bigint, 18)).toFixed(4);
    } catch {
      return "0.00";
    }
  }, [tokenInBalance, tokenIn]);

  // 处理输入金额变化
  const handleAmountInChange = (value: string) => {
    setInputMode("in");
    setAmountIn(value);
    if (value === "" || parseFloat(value) === 0) {
      setAmountOut("");
    }
  };

  const handleAmountOutChange = (value: string) => {
    setInputMode("out");
    setAmountOut(value);
    if (value === "" || parseFloat(value) === 0) {
      setAmountIn("");
    }
  };

  // 处理 swap 按钮点击
  const handleSwap = async () => {
    if (!isConnected) {
      return;
    }

    try {
      await executeSwap();
    } catch (error) {
      console.error("Swap 失败:", error);
    }
  };

  // 交易成功后重置表单
  useEffect(() => {
    if (isConfirmed) {
      setTimeout(() => {
        setAmountIn("");
        setAmountOut("");
      }, 2000);
    }
  }, [isConfirmed, setAmountIn, setAmountOut]);

  // 获取按钮文本和状态
  const getButtonText = () => {
    if (!isConnected) {
      return "连接钱包";
    }
    if (isPending || isConfirming) {
      return isPending ? "交易提交中..." : "交易确认中...";
    }
    if (!tokenIn || !tokenOut) {
      return "选择代币";
    }
    if (!amountIn && !amountOut) {
      return "输入金额";
    }
    if (indexPath.length === 0) {
      return "无可用池子";
    }
    // 即使价格估算失败，也允许用户提交交易
    if (quoteInputError || quoteOutputError) {
      return "兑换（价格估算失败，将以实际交易结果为准）";
    }
    return "兑换";
  };

  const isButtonDisabled = () => {
    return (
      !isConnected ||
      !tokenIn ||
      !tokenOut ||
      (!amountIn && !amountOut) ||
      isPending ||
      isConfirming ||
      indexPath.length === 0
      // 移除对 quoteInputError 和 quoteOutputError 的检查
      // 即使价格估算失败，也允许用户提交交易
    );
  };

  return (
    <div className="glass rounded-2xl p-6 border border-white/10">
      {/* Swap Form */}
      <div className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>从</span>
            {isConnected && tokenIn && (
              <span>余额: {tokenInBalanceFormatted}</span>
            )}
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => handleAmountInChange(e.target.value)}
              onFocus={() => setInputMode("in")}
              className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-gray-500 outline-none"
              disabled={!isConnected || !tokenIn}
            />
            <div className="relative">
              <button
                onClick={() => {
                  setIsTokenInDropdownOpen(!isTokenInDropdownOpen);
                  setIsTokenOutDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                disabled={!isConnected || isLoadingPairs}
              >
                <span className="text-white font-medium">
                  {tokenIn ? `${formatAddress(tokenIn)}` : "选择代币"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isTokenInDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {isLoadingPairs ? (
                    <div className="p-4 text-center text-gray-400">
                      加载中...
                    </div>
                  ) : uniqueTokens.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      无可用代币
                    </div>
                  ) : (
                    uniqueTokens.map((token) => (
                      <button
                        key={token}
                        onClick={() => {
                          setTokenIn(token);
                          setIsTokenInDropdownOpen(false);
                          setAmountIn("");
                          setAmountOut("");
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${
                          tokenIn?.toLowerCase() === token.toLowerCase()
                            ? "bg-indigo-500/20"
                            : ""
                        }`}
                      >
                        <div className="text-white font-medium">
                          {formatAddress(token)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {isLoadingQuoteInput && inputMode === "in" && (
            <div className="text-xs text-indigo-400">计算输出金额...</div>
          )}
          {quoteInputError && inputMode === "in" && (
            <div className="text-xs text-yellow-400">
              价格估算失败，将以实际交易结果为准
            </div>
          )}
        </div>

        {/* Swap Arrow Button */}
        <div className="flex justify-center -my-2">
          <button
            onClick={() => {
              // 交换 tokenIn 和 tokenOut
              const tempToken = tokenIn;
              setTokenIn(tokenOut);
              setTokenOut(tempToken);
              const tempAmount = amountIn;
              setAmountIn(amountOut);
              setAmountOut(tempAmount);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            disabled={!tokenIn || !tokenOut}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>到</span>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <input
              type="number"
              placeholder="0.0"
              value={amountOut}
              onChange={(e) => handleAmountOutChange(e.target.value)}
              onFocus={() => setInputMode("out")}
              className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-gray-500 outline-none"
              disabled={
                !isConnected ||
                !tokenOut ||
                isLoadingQuoteOutput ||
                isLoadingQuoteInput
              }
            />
            <div className="relative">
              <button
                onClick={() => {
                  setIsTokenOutDropdownOpen(!isTokenOutDropdownOpen);
                  setIsTokenInDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                disabled={!isConnected || isLoadingPairs}
              >
                <span className="text-white font-medium">
                  {tokenOut ? `${formatAddress(tokenOut)}` : "选择代币"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {isTokenOutDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  {isLoadingPairs ? (
                    <div className="p-4 text-center text-gray-400">
                      加载中...
                    </div>
                  ) : uniqueTokens.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      无可用代币
                    </div>
                  ) : (
                    uniqueTokens
                      .filter(
                        (token) =>
                          token.toLowerCase() !== tokenIn?.toLowerCase()
                      )
                      .map((token) => (
                        <button
                          key={token}
                          onClick={() => {
                            setTokenOut(token);
                            setIsTokenOutDropdownOpen(false);
                            setAmountIn("");
                            setAmountOut("");
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-colors ${
                            tokenOut?.toLowerCase() === token.toLowerCase()
                              ? "bg-indigo-500/20"
                              : ""
                          }`}
                        >
                          <div className="text-white font-medium">
                            {formatAddress(token)}
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
          {isLoadingQuoteOutput && inputMode === "out" && (
            <div className="text-xs text-indigo-400">计算输入金额...</div>
          )}
          {quoteOutputError && inputMode === "out" && (
            <div className="text-xs text-yellow-400">
              价格估算失败，将以实际交易结果为准
            </div>
          )}
        </div>

        {/* Pool Info & Slippage Settings */}
        {selectedPool && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">费率</span>
              <span className="text-white font-medium">
                {selectedPool.fee}%
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">滑点容忍度</span>
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">
                  {slippagePercent}%
                </span>
                <button
                  onClick={() =>
                    setIsSlippageSettingsOpen(!isSlippageSettingsOpen)
                  }
                  className="text-indigo-400 hover:text-indigo-300 text-xs"
                >
                  设置
                </button>
              </div>
            </div>
            {isSlippageSettingsOpen && (
              <div className="mt-2 p-3 rounded-lg bg-gray-800 border border-white/10">
                <label className="block text-sm text-gray-400 mb-2">
                  滑点容忍度 (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={slippagePercent}
                  onChange={(e) =>
                    setSlippagePercent(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white outline-none focus:border-indigo-500"
                />
                <div className="flex space-x-2 mt-2">
                  {[0.1, 0.5, 1.0, 3.0].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSlippagePercent(value)}
                      className={`flex-1 py-1 px-2 rounded text-xs ${
                        slippagePercent === value
                          ? "bg-indigo-500 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Messages */}
        {writeError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-sm text-red-400">
              {writeError.message || "交易失败，请重试"}
            </div>
          </div>
        )}

        {/* Success Message */}
        {isConfirmed && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-sm text-green-400">交易成功！</div>
          </div>
        )}

        {/* Swap Button */}
        {!isConnected ? (
          <div className="flex justify-center">
            <ConnectWallet />
          </div>
        ) : (
          <button
            onClick={handleSwap}
            disabled={isButtonDisabled()}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform ${
              isButtonDisabled()
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:scale-[1.02] shadow-lg shadow-indigo-500/50"
            }`}
          >
            {getButtonText()}
          </button>
        )}
      </div>
    </div>
  );
}
