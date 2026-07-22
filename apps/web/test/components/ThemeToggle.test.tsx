import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { renderWithProviders, screen, userEvent } from '../utils';

const mockSetTheme = vi.fn();
let currentTheme = 'dark';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: currentTheme,
    setTheme: mockSetTheme,
    theme: currentTheme,
  }),
}));

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTheme = 'dark';
  });

  it('renders theme toggle button', () => {
    renderWithProviders(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders dark mode state with Sun icon', () => {
    currentTheme = 'dark';
    renderWithProviders(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders light mode state with Moon icon', () => {
    currentTheme = 'light';
    renderWithProviders(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles theme from dark to light on click', async () => {
    currentTheme = 'dark';
    renderWithProviders(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });

    await userEvent.click(toggleButton);

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('toggles theme from light to dark on click', async () => {
    currentTheme = 'light';
    renderWithProviders(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /toggle theme/i });

    await userEvent.click(toggleButton);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
