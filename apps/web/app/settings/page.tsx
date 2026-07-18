import * as React from 'react';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';

export default function Settings() {
  return (
    <Container>
      <PageWrapper className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">App Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure transaction tolerances, choose RPC node connections, and view metadata.
          </p>
        </div>

        {/* Empty responsive layout container */}
        <div className="min-h-[300px] rounded-xl border border-border bg-card/50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h3 className="text-base font-semibold text-white">Settings Management</h3>
            <p className="text-sm text-muted-foreground">
              Local user parameters and active network node configurations are currently offline.
              These elements will be enabled in a later module.
            </p>

            {/* TODO section */}
            <div className="p-4 rounded-lg bg-secondary/50 border border-border text-left space-y-2">
              <h4 className="text-xs font-bold uppercase text-primary tracking-wider">
                TODO: Module Integration
              </h4>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>
                  Implement localized state storage (e.g. localStorage) to persist slippage
                  preferences.
                </li>
                <li>
                  Add RPC node selection selectors to dynamically override Wagmi configurations.
                </li>
                <li>
                  Display current wallet connection details (chain name, latency, gas prices).
                </li>
                <li>Integrate advanced debugger modes for testnet operations.</li>
              </ul>
            </div>
          </div>
        </div>
      </PageWrapper>
    </Container>
  );
}
