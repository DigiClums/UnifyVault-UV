import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddressDisplay } from '../../components/web3/AddressDisplay';
import { renderWithProviders, screen, userEvent } from '../utils';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('AddressDisplay Component', () => {
  const sampleAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fallback dash when address is undefined', () => {
    renderWithProviders(<AddressDisplay address={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders shortened address with default chars', () => {
    renderWithProviders(<AddressDisplay address={sampleAddress} />);
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });

  it('renders formatted address when custom chars prop is configured', () => {
    renderWithProviders(<AddressDisplay address={sampleAddress} chars={6} />);
    expect(screen.getByText('0x123456...567890')).toBeInTheDocument();
  });

  it('copies address to clipboard when copy button is clicked', async () => {
    renderWithProviders(<AddressDisplay address={sampleAddress} />);
    const copyButton = screen.getByRole('button', { name: /copy contract address/i });

    await userEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(sampleAddress);
  });

  it('renders correct block explorer link', () => {
    renderWithProviders(<AddressDisplay address={sampleAddress} />);
    const explorerLink = screen.getByRole('link', { name: /view address on explorer/i });

    expect(explorerLink).toBeInTheDocument();
    expect(explorerLink).toHaveAttribute('target', '_blank');
    expect(explorerLink.getAttribute('href')).toContain(sampleAddress);
    expect(explorerLink.getAttribute('href')).toContain('sepolia.basescan.org');
  });
});
