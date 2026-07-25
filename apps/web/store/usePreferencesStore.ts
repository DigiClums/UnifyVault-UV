import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SlippagePreset = '0.1' | '0.5' | '1' | 'custom';
export type NumberFormatStyle = 'standard' | 'compact';
export type CurrencyDisplay = 'USD' | 'native' | 'both';

export interface UserPreferences {
  // Transaction
  slippagePreset: SlippagePreset;
  customSlippage: string; // stored as percentage string, e.g. "2.5"
  confirmBeforeTx: boolean;
  expertMode: boolean;

  // Appearance
  compactMode: boolean;
  numberFormat: NumberFormatStyle;
  currencyDisplay: CurrencyDisplay;
}

export interface PreferencesState extends UserPreferences {
  // Derived – the effective slippage BPS value
  effectiveSlippageBps: () => number;

  // Actions
  setSlippagePreset: (preset: SlippagePreset) => void;
  setCustomSlippage: (value: string) => void;
  setConfirmBeforeTx: (enabled: boolean) => void;
  setExpertMode: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setNumberFormat: (format: NumberFormatStyle) => void;
  setCurrencyDisplay: (display: CurrencyDisplay) => void;
  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  slippagePreset: '0.5',
  customSlippage: '',
  confirmBeforeTx: true,
  expertMode: false,
  compactMode: false,
  numberFormat: 'standard',
  currencyDisplay: 'USD',
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFERENCES,

      effectiveSlippageBps: () => {
        const { slippagePreset, customSlippage } = get();
        if (slippagePreset === 'custom') {
          const parsed = parseFloat(customSlippage);
          if (isNaN(parsed) || parsed <= 0) return 50; // fallback to 0.5%
          return Math.round(parsed * 100); // convert percentage to BPS
        }
        const presets: Record<Exclude<SlippagePreset, 'custom'>, number> = {
          '0.1': 10, // 0.1% = 10 BPS
          '0.5': 50, // 0.5% = 50 BPS
          '1': 100, // 1% = 100 BPS
        };
        return presets[slippagePreset];
      },

      setSlippagePreset: (preset) => set({ slippagePreset: preset }),
      setCustomSlippage: (value) => set({ customSlippage: value }),
      setConfirmBeforeTx: (enabled) => set({ confirmBeforeTx: enabled }),
      setExpertMode: (enabled) => set({ expertMode: enabled }),
      setCompactMode: (enabled) => set({ compactMode: enabled }),
      setNumberFormat: (format) => set({ numberFormat: format }),
      setCurrencyDisplay: (display) => set({ currencyDisplay: display }),
      resetToDefaults: () => set({ ...DEFAULT_PREFERENCES }),
    }),
    {
      name: 'unifyvault-user-preferences',
      version: 1,
    },
  ),
);
