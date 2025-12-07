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
  validateSqrtPriceLimitX96,
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

  // 防抖后的输入值（用于合约调用，避免频繁触发）
  const [debouncedAmountIn, setDebouncedAmountIn] = useState("");
  const [debouncedAmountOut, setDebouncedAmountOut] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖逻辑：用户停止输入 500ms 后才更新防抖值
  // 如果输入为空，立即清空防抖值
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 如果输入为空，立即清空防抖值
    if (inputMode === "in" && (!amountIn || amountIn.trim() === "")) {
      setDebouncedAmountIn("");
      return;
    }
    if (inputMode === "out" && (!amountOut || amountOut.trim() === "")) {
      setDebouncedAmountOut("");
      return;
    }

    // 否则等待 500ms 后再更新防抖值
    debounceTimerRef.current = setTimeout(() => {
      if (inputMode === "in") {
        setDebouncedAmountIn(amountIn);
      } else {
        setDebouncedAmountOut(amountOut);
      }
    }, 500); // 500ms 防抖延迟

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [amountIn, amountOut, inputMode]);

  // 计算最优路径
  const indexPath = useMemo(() => {
    if (!tokenIn || !tokenOut || !pools || pools.length === 0) {
      return [];
    }
    // 过滤掉 null 值并确保类型正确
    const validPools = pools.filter(
      (p): p is NonNullable<typeof p> => p !== null
    );
    // 传入 slippagePercent，用于计算 sqrtPriceLimitX96 并检查是否在限价范围内
    return findOptimalPath(validPools, tokenIn, tokenOut, slippagePercent);
  }, [tokenIn, tokenOut, pools, slippagePercent]);

  // 获取选中的池子信息（使用 useMemo 避免无限循环）
  // 除了通过 index 过滤外，还需要同时校验 token0/token1，
  // 因为在不同的代币对中，pools 中的 index 有可能重复
  const selectedPool = useMemo(() => {
    if (
      indexPath.length === 0 ||
      !pools ||
      pools.length === 0 ||
      !tokenIn ||
      !tokenOut
    ) {
      return null;
    }

    const targetIndex = indexPath[0];
    const tokenInLower = tokenIn.toLowerCase();
    const tokenOutLower = tokenOut.toLowerCase();

    const pool = pools.find((p) => {
      if (!p) return false;
      if (p.index !== targetIndex) return false;

      const poolToken0 = p.token0.toLowerCase();
      const poolToken1 = p.token1.toLowerCase();

      // 代币对需要与当前选择的 tokenIn/tokenOut 匹配（忽略顺序）
      const directMatch =
        poolToken0 === tokenInLower && poolToken1 === tokenOutLower;
      const reverseMatch =
        poolToken0 === tokenOutLower && poolToken1 === tokenInLower;

      return directMatch || reverseMatch;
    });

    return pool || null;
  }, [indexPath, pools, tokenIn, tokenOut]);

  // 计算 sqrtPriceLimitX96
  // 注意：zeroForOne 应该根据 tokenIn 和 tokenOut 的地址大小关系确定，而不是根据池子的 token0/token1
  const sqrtPriceLimitX96 = useMemo(() => {
    if (!selectedPool || !tokenIn || !tokenOut) {
      return BigInt(0);
    }

    try {
      // 根据合约逻辑：zeroForOne = tokenIn < tokenOut（按地址字典序比较）
      const zeroForOne = isZeroForOne(tokenIn, tokenOut);
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
    args: (() => {
      // 严格检查所有参数（使用防抖后的值）
      if (
        !tokenIn ||
        !tokenOut ||
        !indexPath ||
        indexPath.length === 0 ||
        !debouncedAmountIn ||
        isNaN(parseFloat(debouncedAmountIn)) ||
        parseFloat(debouncedAmountIn) <= 0 ||
        !sqrtPriceLimitX96 ||
        sqrtPriceLimitX96 === BigInt(0)
      ) {
        return undefined;
      }

      try {
        const amountInWei = parseUnits(debouncedAmountIn, 18);
        return [
          {
            tokenIn,
            tokenOut,
            indexPath,
            amountIn: amountInWei,
            sqrtPriceLimitX96,
          },
        ];
      } catch (error) {
        console.error("解析 amountIn 失败:", error);
        return undefined;
      }
    })(),
    query: {
      enabled:
        !!tokenIn &&
        !!tokenOut &&
        !!indexPath &&
        indexPath.length > 0 &&
        !!debouncedAmountIn &&
        !isNaN(parseFloat(debouncedAmountIn)) &&
        parseFloat(debouncedAmountIn) > 0 &&
        inputMode === "in" &&
        !!sqrtPriceLimitX96 &&
        sqrtPriceLimitX96 !== BigInt(0) &&
        SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });
  // 调试信息
  if (quoteInputError) {
    console.log("quoteInputError", quoteInputError);
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
    args: (() => {
      // 严格检查所有参数（使用防抖后的值）
      if (
        !tokenIn ||
        !tokenOut ||
        !indexPath ||
        indexPath.length === 0 ||
        !debouncedAmountOut ||
        debouncedAmountOut.trim() === "" ||
        isNaN(parseFloat(debouncedAmountOut)) ||
        parseFloat(debouncedAmountOut) <= 0 ||
        !sqrtPriceLimitX96 ||
        sqrtPriceLimitX96 === BigInt(0)
      ) {
        return undefined;
      }

      try {
        const amountOutWei = parseUnits(debouncedAmountOut, 18);
        if (!amountOutWei || amountOutWei === BigInt(0)) {
          console.error("amountOutWei 无效:", amountOutWei);
          return undefined;
        }

        const params = {
          tokenIn,
          tokenOut,
          indexPath,
          amountOut: amountOutWei, // 注意：参数名称必须是 amountOut，与 ABI 一致
          sqrtPriceLimitX96,
        };

        // 验证所有参数都不是 undefined
        if (
          !params.tokenIn ||
          !params.tokenOut ||
          !params.indexPath ||
          params.indexPath.length === 0 ||
          !params.amountOut ||
          params.amountOut === BigInt(0) ||
          !params.sqrtPriceLimitX96 ||
          params.sqrtPriceLimitX96 === BigInt(0)
        ) {
          console.error("参数验证失败:", params);
          return undefined;
        }

        return [params];
      } catch (error) {
        console.error("解析 amountOut 失败:", error);
        return undefined;
      }
    })(),
    query: {
      enabled:
        !!tokenIn &&
        !!tokenOut &&
        !!indexPath &&
        indexPath.length > 0 &&
        !!debouncedAmountOut &&
        !isNaN(parseFloat(debouncedAmountOut)) &&
        parseFloat(debouncedAmountOut) > 0 &&
        inputMode === "out" &&
        !!sqrtPriceLimitX96 &&
        sqrtPriceLimitX96 !== BigInt(0) &&
        SWAP_ROUTER_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  });

  console.log(
    "quoteExactOutputSimulation",
    quoteExactOutputSimulation,
    quoteOutputError
  );
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

  // 使用 ref 存储执行函数，避免在 useEffect 中使用未定义的函数
  const executeSwapRef = useRef<(() => Promise<void>) | null>(null);

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

      // 授权交易确认成功，刷新授权额度
      refetchTokenInAllowance();
      setApprovalStep("approved");

      // 自动继续执行 swap
      // 使用 setTimeout 确保授权额度已刷新
      setTimeout(async () => {
        if (executeSwapRef.current) {
          try {
            setApprovalStep("swapping");
            await executeSwapRef.current();
          } catch (error) {
            console.error("自动继续交易失败:", error);
            setApprovalStep("idle");
          }
        }
      }, 1000); // 等待 1 秒确保授权额度已刷新
    }
  }, [isConfirmed, hash, approvalStep, refetchTokenInAllowance]);

  // 处理 token 授权
  const handleApprove = useCallback(
    async (requiredAmount: bigint) => {
      if (!tokenIn || !address) {
        throw new Error("缺少必要参数");
      }

      const currentAllowance = (tokenInAllowance as bigint) || BigInt(0);

      if (currentAllowance >= requiredAmount) {
        return; // 已有足够授权
      }

      try {
        setApprovalStep("approving");
        await writeContract({
          address: tokenIn,
          abi: ERC20Abi,
          functionName: "approve",
          args: [SWAP_ROUTER_ADDRESS, requiredAmount],
        });
      } catch (error) {
        console.error("授权失败:", error);
        setApprovalStep("idle");
        throw error;
      }
    },
    [tokenIn, address, tokenInAllowance, writeContract]
  );

  // 执行 exactInput 交易
  const executeExactInput = useCallback(async () => {
    if (
      !tokenIn ||
      !tokenOut ||
      !address ||
      !amountIn ||
      indexPath.length === 0 ||
      !selectedPool
    ) {
      throw new Error("缺少必要参数");
    }

    // 验证 sqrtPriceLimitX96 是否符合限价逻辑
    const zeroForOne = isZeroForOne(tokenIn, tokenOut);
    const validation = validateSqrtPriceLimitX96(
      BigInt(selectedPool.sqrtPriceX96),
      sqrtPriceLimitX96,
      selectedPool.tickLower,
      selectedPool.tickUpper,
      zeroForOne
    );

    if (!validation.isValid) {
      throw new Error(`限价验证失败: ${validation.reason}`);
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
    selectedPool,
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
      indexPath.length === 0 ||
      !selectedPool
    ) {
      throw new Error("缺少必要参数");
    }

    // 验证 sqrtPriceLimitX96 是否符合限价逻辑
    const zeroForOne = isZeroForOne(tokenIn, tokenOut);
    const validation = validateSqrtPriceLimitX96(
      BigInt(selectedPool.sqrtPriceX96),
      sqrtPriceLimitX96,
      selectedPool.tickLower,
      selectedPool.tickUpper,
      zeroForOne
    );

    if (!validation.isValid) {
      throw new Error(`限价验证失败: ${validation.reason}`);
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
    selectedPool,
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

    // 检查是否需要授权
    // 无论是 exactInput 还是 exactOutput，都需要 tokenIn 的授权
    if (tokenIn) {
      let requiredAmount: bigint;

      if (inputMode === "in") {
        // exactInput: 需要授权 amountIn
        requiredAmount = parseUnits(amountIn, 18);
      } else {
        // exactOutput: 需要授权预估的 amountIn（从 quoteExactOutputData 获取）
        if (!quoteExactOutputData) {
          throw new Error("无法获取预估的输入金额，请稍后再试");
        }
        requiredAmount = quoteExactOutputData as bigint;
        // 添加一些缓冲（10%）以确保有足够的授权
        requiredAmount = (requiredAmount * BigInt(110)) / BigInt(100);
      }

      const currentAllowance = (tokenInAllowance as bigint) || BigInt(0);

      if (currentAllowance < requiredAmount) {
        // 需要授权，先执行授权
        // 将执行函数存储到 ref 中，供授权确认后使用
        executeSwapRef.current = async () => {
          setApprovalStep("swapping");
          if (inputMode === "in") {
            await executeExactInput();
          } else {
            await executeExactOutput();
          }
        };
        await handleApprove(requiredAmount);
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
    quoteExactOutputData,
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
