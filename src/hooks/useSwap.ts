"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { Address, parseUnits, formatUnits } from "viem";
import { usePools } from "./usePools";
import {
  SwapRouterAbi,
  SWAP_ROUTER_ADDRESS,
  ERC20Abi,
} from "@/src/utils/contractHelpers";
import {
  findOptimalPath,
  calculateSqrtPriceLimitX96,
  isZeroForOne,
  calculateAmountOutMinimum,
  calculateAmountInMaximum,
} from "@/src/utils/swapUtils";

/**
 * Swap 交易 Hook
 */
export function useSwap() {
  const { address, isConnected } = useAccount();
  const { pairs, pools, isLoadingPairs, isLoadingPools } = usePools();

  // 交易状态
  const [tokenIn, setTokenIn] = useState<Address | null>(null);
  const [tokenOut, setTokenOut] = useState<Address | null>(null);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [inputMode, setInputMode] = useState<"in" | "out">("in"); // 用户正在输入的是 in 还是 out
  const [slippagePercent, setSlippagePercent] = useState(0.5); // 默认 0.5% 滑点
  const [approvalStep, setApprovalStep] = useState<
    "idle" | "approving" | "approved" | "swapping"
  >("idle");

  // 用于跟踪是否已提交交易
  const hasSubmittedRef = useRef(false);
  const processedApprovalRef = useRef<string | undefined>(undefined);

  // 计算最优路径
  const indexPath = useMemo(() => {
    if (!tokenIn || !tokenOut || !pools || pools.length === 0) {
      return [];
    }
    // 过滤掉 null 值并确保类型正确
    const validPools = pools.filter(
      (p): p is NonNullable<typeof p> => p !== null
    );
    return findOptimalPath(validPools, tokenIn, tokenOut);
  }, [tokenIn, tokenOut, pools]);

  // 获取选中的池子信息（使用 useMemo 避免无限循环）
  // 选择 indexPath 中第一个池子（费率最低的）作为显示用的池子
  const selectedPool = useMemo(() => {
    if (indexPath.length > 0 && pools && pools.length > 0) {
      const pool = pools.find((p) => p !== null && p.index === indexPath[0]);
      return pool || null;
    }
    return null;
  }, [indexPath, pools]);

  // 计算 sqrtPriceLimitX96
  const sqrtPriceLimitX96 = useMemo(() => {
    if (!selectedPool || !tokenIn || !tokenOut) {
      return BigInt(0);
    }

    try {
      const zeroForOne = isZeroForOne(
        tokenIn,
        selectedPool.token0,
        selectedPool.token1
      );
      return calculateSqrtPriceLimitX96(
        BigInt(selectedPool.sqrtPriceX96),
        slippagePercent,
        zeroForOne
      );
    } catch (error) {
      console.error("计算 sqrtPriceLimitX96 失败:", error);
      return BigInt(0);
    }
  }, [selectedPool, tokenIn, tokenOut, slippagePercent]);

  // quoteExactInput - 使用 simulateContract 进行估算
  const {
    data: quoteExactInputSimulation,
    isLoading: isLoadingQuoteInput,
    error: quoteInputError,
    refetch: refetchQuoteInput,
  } = useSimulateContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: SwapRouterAbi,
    functionName: "quoteExactInput",
    args:
      tokenIn &&
      tokenOut &&
      indexPath.length > 0 &&
      amountIn &&
      parseFloat(amountIn) > 0 &&
      sqrtPriceLimitX96 !== BigInt(0)
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath,
              amountIn: parseUnits(amountIn, 18), // 假设 18 位小数
              sqrtPriceLimitX96,
            },
          ]
        : undefined,
    query: {
      enabled:
        !!tokenIn &&
        !!tokenOut &&
        indexPath.length > 0 &&
        !!amountIn &&
        parseFloat(amountIn) > 0 &&
        inputMode === "in" &&
        sqrtPriceLimitX96 !== BigInt(0) &&
        SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });
  // 调试信息
  if (quoteInputError) {
    console.log("quoteInputError", quoteInputError);
    console.log("调用参数:", {
      tokenIn,
      tokenOut,
      indexPath,
      amountIn,
      sqrtPriceLimitX96: sqrtPriceLimitX96.toString(),
      selectedPool,
    });
  }

  // 从 simulateContract 的结果中提取 amountOut
  const quoteExactInputData = quoteExactInputSimulation?.result;

  // quoteExactOutput - 使用 simulateContract 进行估算
  const {
    data: quoteExactOutputSimulation,
    isLoading: isLoadingQuoteOutput,
    error: quoteOutputError,
    refetch: refetchQuoteOutput,
  } = useSimulateContract({
    address: SWAP_ROUTER_ADDRESS,
    abi: SwapRouterAbi,
    functionName: "quoteExactOutput",
    args:
      tokenIn &&
      tokenOut &&
      indexPath.length > 0 &&
      amountOut &&
      parseFloat(amountOut) > 0 &&
      sqrtPriceLimitX96 !== BigInt(0)
        ? [
            {
              tokenIn,
              tokenOut,
              indexPath,
              amount: parseUnits(amountOut, 18), // 假设 18 位小数
              sqrtPriceLimitX96,
            },
          ]
        : undefined,
    query: {
      enabled:
        !!tokenIn &&
        !!tokenOut &&
        indexPath.length > 0 &&
        !!amountOut &&
        parseFloat(amountOut) > 0 &&
        inputMode === "out" &&
        sqrtPriceLimitX96 !== BigInt(0) &&
        SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  // 从 simulateContract 的结果中提取 amountIn
  const quoteExactOutputData = quoteExactOutputSimulation?.result;

  // 更新输出金额（当 quoteExactInput 返回结果时）
  useEffect(() => {
    if (inputMode === "in" && quoteExactInputData) {
      const amountOutFormatted = formatUnits(quoteExactInputData as bigint, 18);
      setAmountOut(amountOutFormatted);
    }
  }, [quoteExactInputData, inputMode]);

  // 更新输入金额（当 quoteExactOutput 返回结果时）
  useEffect(() => {
    if (inputMode === "out" && quoteExactOutputData) {
      const amountInFormatted = formatUnits(quoteExactOutputData as bigint, 18);
      setAmountIn(amountInFormatted);
    }
  }, [quoteExactOutputData, inputMode]);

  // 检查 tokenIn 的余额
  const { data: tokenInBalance, isLoading: isLoadingTokenInBalance } =
    useReadContract({
      address: tokenIn || undefined,
      abi: ERC20Abi,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: {
        enabled: !!tokenIn && !!address && isConnected,
      },
    });

  // 检查 tokenIn 的授权额度
  const {
    data: tokenInAllowance,
    isLoading: isLoadingTokenInAllowance,
    refetch: refetchTokenInAllowance,
  } = useReadContract({
    address: tokenIn || undefined,
    abi: ERC20Abi,
    functionName: "allowance",
    args:
      tokenIn &&
      address &&
      SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000"
        ? [address, SWAP_ROUTER_ADDRESS]
        : undefined,
    query: {
      enabled:
        !!tokenIn &&
        !!address &&
        isConnected &&
        SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  // 写入合约（用于 approve 和 swap）
  const {
    writeContract,
    data: hash,
    isPending: isPendingWrite,
    error: writeError,
  } = useWriteContract();

  // 等待交易确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // 处理授权交易确认
  useEffect(() => {
    if (
      isConfirmed &&
      hash &&
      approvalStep === "approving" &&
      hasSubmittedRef.current &&
      processedApprovalRef.current !== hash
    ) {
      // 标记已处理，避免重复触发
      processedApprovalRef.current = hash;

      // 授权交易确认成功，刷新授权额度并继续 swap
      refetchTokenInAllowance();
      setApprovalStep("approved");

      // 自动继续执行 swap（在 executeSwap 中会检查 approvalStep）
      // 这里我们需要重新触发 swap，但由于 useEffect 的限制，我们在 executeSwap 中处理
    }
  }, [isConfirmed, hash, approvalStep, refetchTokenInAllowance]);

  // 使用 ref 存储执行函数，避免在 useEffect 中使用未定义的函数
  const executeSwapRef = useRef<(() => Promise<void>) | null>(null);

  // 处理 token 授权
  const handleApprove = useCallback(async () => {
    if (!tokenIn || !address || !amountIn) {
      throw new Error("缺少必要参数");
    }

    const amountInWei = parseUnits(amountIn, 18);
    const currentAllowance = (tokenInAllowance as bigint) || BigInt(0);

    if (currentAllowance >= amountInWei) {
      return; // 已有足够授权
    }

    try {
      setApprovalStep("approving");
      await writeContract({
        address: tokenIn,
        abi: ERC20Abi,
        functionName: "approve",
        args: [SWAP_ROUTER_ADDRESS, amountInWei],
      });
    } catch (error) {
      console.error("授权失败:", error);
      setApprovalStep("idle");
      throw error;
    }
  }, [tokenIn, address, amountIn, tokenInAllowance, writeContract]);

  // 执行 exactInput 交易
  const executeExactInput = useCallback(async () => {
    if (
      !tokenIn ||
      !tokenOut ||
      !address ||
      !amountIn ||
      indexPath.length === 0
    ) {
      throw new Error("缺少必要参数");
    }

    const amountInWei = parseUnits(amountIn, 18);
    const estimatedAmountOut = BigInt(0);
    const amountOutMinimum = calculateAmountOutMinimum(
      estimatedAmountOut,
      slippagePercent
    );

    // 计算 deadline（当前时间 + 20 分钟）
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    try {
      await writeContract({
        address: SWAP_ROUTER_ADDRESS,
        abi: SwapRouterAbi,
        functionName: "exactInput",
        args: [
          {
            tokenIn,
            tokenOut,
            indexPath,
            recipient: address,
            deadline,
            amountIn: amountInWei,
            amountOutMinimum,
            sqrtPriceLimitX96,
          },
        ],
        gas: BigInt(5000000),
        value: BigInt(0), // 如果不是 ETH，value 为 0
      });
    } catch (error) {
      console.error("交易失败:", error);
      throw error;
    }
  }, [
    tokenIn,
    tokenOut,
    address,
    amountIn,
    indexPath,
    quoteExactInputData,
    slippagePercent,
    sqrtPriceLimitX96,
    writeContract,
  ]);

  // 执行 exactOutput 交易
  const executeExactOutput = useCallback(async () => {
    if (
      !tokenIn ||
      !tokenOut ||
      !address ||
      !amountOut ||
      indexPath.length === 0
    ) {
      throw new Error("缺少必要参数");
    }

    const amountOutWei = parseUnits(amountOut, 18);
    const estimatedAmountIn = BigInt(0);
    const amountInMaximum = calculateAmountInMaximum(
      estimatedAmountIn,
      slippagePercent
    );

    // 计算 deadline（当前时间 + 20 分钟）
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    try {
      await writeContract({
        address: SWAP_ROUTER_ADDRESS,
        abi: SwapRouterAbi,
        functionName: "exactOutput",
        args: [
          {
            tokenIn,
            tokenOut,
            indexPath,
            recipient: address,
            deadline,
            amountOut: amountOutWei,
            amountInMaximum,
            sqrtPriceLimitX96,
          },
        ],
        gas: BigInt(5000000),
        value: BigInt(0), // 如果不是 ETH，value 为 0
      });
    } catch (error) {
      console.error("交易失败:", error);
      throw error;
    }
  }, [
    tokenIn,
    tokenOut,
    address,
    amountOut,
    indexPath,
    quoteExactOutputData,
    slippagePercent,
    sqrtPriceLimitX96,
    writeContract,
  ]);

  // 执行 swap（自动处理授权和交易）
  const executeSwap = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("请先连接钱包");
    }

    // 重置状态
    hasSubmittedRef.current = true;
    processedApprovalRef.current = undefined;

    // 检查是否需要授权（只对 exactInput 需要授权，因为 exactOutput 是反向的）
    if (inputMode === "in" && tokenIn) {
      const amountInWei = parseUnits(amountIn, 18);
      const currentAllowance = (tokenInAllowance as bigint) || BigInt(0);

      if (currentAllowance < amountInWei) {
        // 需要授权，先执行授权
        await handleApprove();
        // 授权交易已提交，等待 useEffect 监听确认后自动执行 swap
        return;
      }
    }

    // 如果不需要授权或授权已完成，直接执行交易
    setApprovalStep("swapping");
    if (inputMode === "in") {
      await executeExactInput();
    } else {
      await executeExactOutput();
    }
  }, [
    isConnected,
    address,
    inputMode,
    tokenIn,
    amountIn,
    tokenInAllowance,
    handleApprove,
    executeExactInput,
    executeExactOutput,
  ]);

  return {
    // 状态
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

    // 数据
    pairs: Array.isArray(pairs) ? pairs : [],
    pools: Array.isArray(pools) ? pools : [],
    isLoadingPairs,
    isLoadingPools,

    // Quote 数据
    quoteExactInputData,
    quoteExactOutputData,
    isLoadingQuoteInput,
    isLoadingQuoteOutput,
    quoteInputError,
    quoteOutputError,

    // 余额和授权
    tokenInBalance,
    tokenInAllowance,
    isLoadingTokenInBalance,
    isLoadingTokenInAllowance,

    // 交易状态
    hash,
    isPending: isPendingWrite,
    isConfirming,
    isConfirmed,
    writeError,
    approvalStep,

    // 方法
    setTokenIn,
    setTokenOut,
    setAmountIn,
    setAmountOut,
    setInputMode,
    setSlippagePercent,
    executeSwap,
    refetchQuoteInput,
    refetchQuoteOutput,
  };
}
