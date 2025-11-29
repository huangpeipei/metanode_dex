"use client";

import { useState } from "react";

export function TradeCard() {
  const [activeTab, setActiveTab] = useState<"swap" | "limit">("swap");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  return (
    <div className="glass rounded-2xl p-6 border border-white/10">
      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab("swap")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === "swap"
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          兑换
        </button>
        <button
          onClick={() => setActiveTab("limit")}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === "limit"
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
              : "bg-white/5 text-gray-400 hover:text-white"
          }`}
        >
          限价单
        </button>
      </div>

      {/* Swap Form */}
      {activeTab === "swap" && (
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>从</span>
              <span>余额: 0.00</span>
            </div>
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-gray-500 outline-none"
              />
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <span className="text-white font-medium">ETH</span>
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
            </div>
          </div>

          {/* Swap Button */}
          <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-[1.02]">
            <svg
              className="w-5 h-5 mx-auto"
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

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>到</span>
              <span>余额: 0.00</span>
            </div>
            <div className="flex items-center space-x-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <input
                type="number"
                placeholder="0.0"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-gray-500 outline-none"
              />
              <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                <span className="text-white font-medium">USDT</span>
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
            </div>
          </div>

          {/* Swap Button */}
          <button className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/50">
            连接钱包
          </button>
        </div>
      )}

      {/* Limit Order Form */}
      {activeTab === "limit" && (
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-400">
            <p>限价单功能即将推出</p>
          </div>
        </div>
      )}
    </div>
  );
}
