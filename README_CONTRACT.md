# Wagmi 合约调用指南

这个文档展示了如何在项目中使用 wagmi 调用智能合约。

## 基本用法

### 1. 读取合约数据 (Read Contract)

使用 `useReadContract` hook 读取合约的 view/pure 函数：

```tsx
import { useReadContract } from "wagmi";
import { stakeAbi } from "@/utils/stakeAbi";

function MyComponent() {
  const { data, isLoading, error } = useReadContract({
    address: "0x...", // 合约地址
    abi: stakeAbi,
    functionName: "getAllPools", // 函数名
    // args: [...], // 如果有参数
  });

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

### 2. 写入合约 (Write Contract)

使用 `useWriteContract` hook 调用需要发送交易的函数：

```tsx
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { stakeAbi } from "@/utils/stakeAbi";

function MyComponent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const handleCreatePool = async () => {
    await writeContract({
      address: "0x...",
      abi: stakeAbi,
      functionName: "createPool",
      args: [
        "0x...", // tokenA
        "0x...", // tokenB
        -887272, // tickLower
        887272, // tickUpper
        3000, // fee
      ],
    });
  };

  return (
    <button onClick={handleCreatePool} disabled={isPending || isConfirming}>
      {isPending || isConfirming ? "处理中..." : "创建池子"}
    </button>
  );
}
```

### 3. 监听合约事件 (Watch Events)

使用 `useWatchContractEvent` hook 监听合约事件：

```tsx
import { useWatchContractEvent } from "wagmi";
import { stakeAbi } from "@/utils/stakeAbi";

function MyComponent() {
  useWatchContractEvent({
    address: "0x...",
    abi: stakeAbi,
    eventName: "PoolCreated",
    onLogs(logs) {
      logs.forEach((log) => {
        console.log("新池子创建:", log.args);
      });
    },
  });

  return <div>正在监听事件...</div>;
}
```

## 使用自定义 Hook

项目提供了 `usePools` hook 来简化池子管理：

```tsx
import { usePools } from "@/hooks/usePools";

function PoolsPage() {
  const {
    pools,
    isLoadingPools,
    createPool,
    isPending,
    isConfirmed,
  } = usePools();

  const handleCreate = async () => {
    try {
      await createPool(
        "0x...", // tokenA
        "0x...", // tokenB
        -887272, // tickLower
        887272, // tickUpper
        3000 // fee
      );
    } catch (error) {
      console.error("创建失败:", error);
    }
  };

  return (
    <div>
      {isLoadingPools ? (
        <div>加载中...</div>
      ) : (
        pools.map((pool) => (
          <div key={pool.poolAddress}>
            {pool.token0} / {pool.token1}
          </div>
        ))
      )}
      <button onClick={handleCreate} disabled={isPending}>
        创建池子
      </button>
    </div>
  );
}
```

## 环境变量配置

在 `.env.local` 文件中设置合约地址：

```env
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
```

## 常用模式

### 读取 + 监听事件自动刷新

```tsx
const { data, refetch } = useReadContract({...});

useWatchContractEvent({
  address: "...",
  abi: stakeAbi,
  eventName: "PoolCreated",
  onLogs() {
    refetch(); // 事件触发时自动刷新数据
  },
});
```

### 错误处理

```tsx
const { error, writeContract } = useWriteContract();

try {
  await writeContract({...});
} catch (error) {
  if (error instanceof Error) {
    console.error("交易失败:", error.message);
    // 显示用户友好的错误信息
  }
}
```

### 交易状态管理

```tsx
const { writeContract, data: hash } = useWriteContract();
const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

// 根据状态显示不同的 UI
if (isLoading) return <div>等待确认...</div>;
if (isSuccess) return <div>交易成功!</div>;
if (isError) return <div>交易失败</div>;
```

## 更多资源

- [Wagmi 文档](https://wagmi.sh)
- [Viem 文档](https://viem.sh)
- [React Query 文档](https://tanstack.com/query)



