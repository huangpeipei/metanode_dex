import { Header } from "@/src/components/Header";
import { TradeCard } from "@/src/components/TradeCard";

export default function TradePage() {
  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/20 via-purple-950/20 to-pink-950/20 pointer-events-none" />

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">
                <span className="gradient-text">交易</span>
              </h1>
              <p className="text-gray-400">选择代币进行兑换</p>
            </div>

            {/* Trade Card */}
            <TradeCard />
          </div>
        </main>
      </div>
    </div>
  );
}
