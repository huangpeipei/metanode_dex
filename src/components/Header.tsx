"use client";

import { ConnectWallet } from "./ConnectWallet";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { name: "交易", href: "/" },
  { name: "流动性池", href: "/pools" },
  { name: "头寸", href: "/positions" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-xl font-bold text-white">M</span>
            </div>
            <span className="text-xl font-bold gradient-text">MetaNode DEX</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Connect Wallet Button */}
          <div className="flex items-center">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </header>
  );
}

