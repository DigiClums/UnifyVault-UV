'use client';

import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { ConnectButton } from '@rainbowme/rainbowkit';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-5xl text-center relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
            ✨ UnifyVault V2 Live on Base Mainnet
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-tight">
            Institutional-Grade <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Multi-Asset Crypto Index Vaults
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Deposit USDC collateral to mint{' '}
            <code className="text-blue-300 bg-blue-950/50 px-2 py-0.5 rounded font-mono">
              UVBTCETH
            </code>{' '}
            index shares representing 100% asset-backed, target-allocated ownership of Wrapped
            Bitcoin (cbBTC) and Ether (WETH).
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-500 transition-all hover:scale-105"
            >
              Launch App
            </Link>
            <div className="w-full sm:w-auto">
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Overview Section */}
      <section className="py-16 bg-[#111827]/40 border-y border-gray-800/80 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-8 backdrop-blur-md">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl font-bold mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold mb-2">Automated Index Balancing</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Maintains a target 60% cbBTC / 40% WETH strategy allocation with zero manual
                rebalancing drag for users.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-8 backdrop-blur-md">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl font-bold mb-4">
                🔐
              </div>
              <h3 className="text-xl font-bold mb-2">Passive Custody Isolation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Vault collateral is held in passive CustodyVault contracts, completely separated
                from Treasury protocol fee collection.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-8 backdrop-blur-md">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl font-bold mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold mb-2">Atomic DEX Swaps</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Executes single-block atomic swaps via Uniswap V3 Adapters with zero controller
                balance retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold mb-4">Battle-Tested Security Architecture</h2>
          <p className="text-gray-400 mb-12 max-w-2xl mx-auto">
            Engineered with strict invariant verification, defense-in-depth access control, and 100%
            test coverage.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl bg-[#111827] border border-gray-800">
              <span className="block text-3xl font-black text-emerald-400">335 / 335</span>
              <span className="text-xs text-gray-400 mt-1 block">Passing Tests</span>
            </div>
            <div className="p-6 rounded-xl bg-[#111827] border border-gray-800">
              <span className="block text-3xl font-black text-blue-400">15</span>
              <span className="text-xs text-gray-400 mt-1 block">Global Invariants</span>
            </div>
            <div className="p-6 rounded-xl bg-[#111827] border border-gray-800">
              <span className="block text-3xl font-black text-purple-400">13</span>
              <span className="text-xs text-gray-400 mt-1 block">Adversarial Scenarios</span>
            </div>
            <div className="p-6 rounded-xl bg-[#111827] border border-gray-800">
              <span className="block text-3xl font-black text-amber-400">0.10%</span>
              <span className="text-xs text-gray-400 mt-1 block">Flat Protocol Fee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action */}
      <section className="py-16 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30 border-t border-gray-800 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Invest in Crypto Indices?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Connect your Web3 wallet to deposit USDC collateral and mint UVBTCETH index shares
            instantly.
          </p>
          <div className="flex justify-center">
            <Link
              href="/deposit"
              className="rounded-xl bg-blue-600 px-10 py-4 font-bold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all hover:scale-105"
            >
              Deposit Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
