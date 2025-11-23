import { Header } from "@/src/components/Header";

interface Pool {
  id: string;
  pair: string;
  token1: { symbol: string; logo: string };
  token2: { symbol: string; logo: string };
  tvl: string;
  volume24h: string;
  volume7d: string;
  fees24h: string;
  apy: string;
}

export default function PoolsPage() {
  // 示例数据
  const pools: Pool[] = [
    {
      id: "1",
      pair: "ETH/USDT",
      token1: { symbol: "ETH", logo: "🔷" },
      token2: { symbol: "USDT", logo: "💵" },
      tvl: "$12,543,210",
      volume24h: "$2,345,678",
      volume7d: "$15,234,567",
      fees24h: "$2,345",
      apy: "12.5%",
    },
    {
      id: "2",
      pair: "BTC/ETH",
      token1: { symbol: "BTC", logo: "🟠" },
      token2: { symbol: "ETH", logo: "🔷" },
      tvl: "$8,234,567",
      volume24h: "$1,456,789",
      volume7d: "$9,876,543",
      fees24h: "$1,456",
      apy: "15.2%",
    },
    {
      id: "3",
      pair: "USDC/USDT",
      token1: { symbol: "USDC", logo: "💙" },
      token2: { symbol: "USDT", logo: "💵" },
      tvl: "$5,123,456",
      volume24h: "$890,123",
      volume7d: "$6,234,567",
      fees24h: "$890",
      apy: "8.3%",
    },
    {
      id: "4",
      pair: "BNB/ETH",
      token1: { symbol: "BNB", logo: "🟡" },
      token2: { symbol: "ETH", logo: "🔷" },
      tvl: "$3,456,789",
      volume24h: "$567,890",
      volume7d: "$3,456,789",
      fees24h: "$567",
      apy: "18.7%",
    },
    {
      id: "5",
      pair: "MATIC/USDT",
      token1: { symbol: "MATIC", logo: "🟣" },
      token2: { symbol: "USDT", logo: "💵" },
      tvl: "$2,345,678",
      volume24h: "$345,678",
      volume7d: "$2,345,678",
      fees24h: "$345",
      apy: "22.1%",
    },
    {
      id: "6",
      pair: "SOL/ETH",
      token1: { symbol: "SOL", logo: "🟢" },
      token2: { symbol: "ETH", logo: "🔷" },
      tvl: "$4,567,890",
      volume24h: "$678,901",
      volume7d: "$4,567,890",
      fees24h: "$678",
      apy: "16.8%",
    },
  ];

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
                <span className="gradient-text">流动性池</span>
              </h1>
              <p className="text-gray-400">浏览所有可用的流动性池</p>
            </div>
            <button className="mt-4 md:mt-0 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-indigo-500/50">
              创建新池子
            </button>
          </div>

          {/* Pools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="glass rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white/20 flex items-center justify-center text-xl">
                        {pool.token1.logo}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 border-2 border-white/20 flex items-center justify-center text-xl">
                        {pool.token2.logo}
                      </div>
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">
                        {pool.pair}
                      </div>
                      <div className="text-xs text-gray-400">
                        {pool.token1.symbol} / {pool.token2.symbol}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">TVL</span>
                    <span className="text-white font-semibold">{pool.tvl}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">24h 交易量</span>
                    <span className="text-white font-semibold">
                      {pool.volume24h}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">7d 交易量</span>
                    <span className="text-white font-semibold">
                      {pool.volume7d}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">24h 费用</span>
                    <span className="text-white font-semibold">
                      {pool.fees24h}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm text-gray-400">APY</span>
                    <span className="text-green-400 font-bold text-lg">
                      {pool.apy}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors">
                  查看详情
                </button>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">总池数</div>
              <div className="text-2xl font-bold text-white">
                {pools.length}
              </div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">总 TVL</div>
              <div className="text-2xl font-bold text-white">$36.3M</div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">24h 总交易量</div>
              <div className="text-2xl font-bold text-white">$6.3M</div>
            </div>
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">24h 总费用</div>
              <div className="text-2xl font-bold text-white">$6.3K</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
