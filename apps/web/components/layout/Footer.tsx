import * as React from 'react';
import { Container } from './Container';

export function Footer() {
  return (
    <footer className="w-full border-t border-border py-6 md:py-8 bg-background">
      <Container>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} UnifyVault Protocol. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://docs.unifyvault.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Documentation
            </a>
            <a
              href="https://github.com/UnifyVault"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://twitter.com/UnifyVault"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Twitter
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
