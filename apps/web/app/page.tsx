import Link from 'next/link';
import { ArrowUpRight, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { Container } from '../components/layout/Container';
import { PageWrapper } from '../components/layout/PageWrapper';

export default function Home() {
  return (
    <Container>
      <PageWrapper className="justify-center items-center text-center">
        <div className="max-w-3xl space-y-6 py-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Zap className="w-3.5 h-3.5" />
            <span>UnifyVault v1.0.0 Base Release Candidate</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-none">
            Multi-Asset Collateral <br />
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Blended L2 Yield
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            Automated liquidity and collateral rebalancing across multiple protocols on Base. Earn
            stable, risk-managed yield with instant redemptions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/deposit"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-lg hover:shadow-primary/25 transition-all w-full sm:w-auto"
            >
              <span>Launch App</span>
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-secondary hover:bg-accent border border-border text-foreground font-medium transition-colors w-full sm:w-auto"
            >
              View Analytics
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl pt-16 md:pt-24 text-left">
          <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300">
            <TrendingUp className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Blended Yield Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Dynamic algorithm rebalances funds to secure optimal risk-adjusted rates on Base L2.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300">
            <ShieldCheck className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Non-Custodial Architecture</h3>
            <p className="text-sm text-muted-foreground">
              Complete custody vaults protect deposit assets under audited governance rules.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300">
            <Zap className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Instant L2 Redemptions</h3>
            <p className="text-sm text-muted-foreground">
              Redeem vault shares instantly for underlying collateral with minimal slippage
              guarantees.
            </p>
          </div>
        </div>
      </PageWrapper>
    </Container>
  );
}
