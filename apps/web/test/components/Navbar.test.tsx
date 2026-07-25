import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navbar } from '../../components/layout/Navbar';
import { renderWithProviders, screen, userEvent } from '../utils';

let currentPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
}));

describe('Navbar Component UI/UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = '/dashboard';
  });

  it('renders brand logo, desktop navigation links, and theme toggle button', () => {
    renderWithProviders(<Navbar />);

    expect(screen.getByText('UnifyVault')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByTestId('connect-button')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('renders mobile hamburger toggle button', () => {
    renderWithProviders(<Navbar />);

    const toggleButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('opens mobile navigation menu when hamburger toggle is clicked', async () => {
    renderWithProviders(<Navbar />);

    const toggleButton = screen.getByRole('button', { name: /open navigation menu/i });
    await userEvent.click(toggleButton);

    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i });
    expect(mobileNav).toBeInTheDocument();
    expect(screen.getByText('Primary Navigation')).toBeInTheDocument();
    expect(screen.getByText('Protocol Tools')).toBeInTheDocument();
  });

  it('closes mobile menu when a mobile nav link is clicked', async () => {
    renderWithProviders(<Navbar />);

    const toggleButton = screen.getByRole('button', { name: /open navigation menu/i });
    await userEvent.click(toggleButton);

    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close navigation menu/i });
    await userEvent.click(closeButton);

    expect(
      screen.queryByRole('navigation', { name: /mobile navigation/i }),
    ).not.toBeInTheDocument();
  });
});
