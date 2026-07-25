'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Container } from '../../components/layout/Container';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { AddressDisplay } from '../../components/web3/AddressDisplay';
import { useWallet } from '../../hooks/useWallet';
import { useNetwork } from '../../hooks/useNetwork';
import { useProtocolDirectoryAddresses } from '../../hooks/useProtocolDirectoryAddresses';
import {
  usePreferencesStore,
  type SlippagePreset,
  type NumberFormatStyle,
  type CurrencyDisplay,
} from '../../store/usePreferencesStore';
import { cn } from '../../lib/utils/cn';
import { env } from '../../lib/config/env';
import { SUPPORTED_CHAINS, ACTIVE_CHAIN } from '../../lib/config/chains';
import {
  Settings,
  ArrowLeftRight,
  Wallet,
  Palette,
  Bell,
  Code2,
  Database,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  Plug,
  Globe,
  Server,
  Hash,
  Info,
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const GIT_COMMIT = '839c711';
const FRONTEND_VERSION = '1.0.0';
const PROTOCOL_VERSION = 'V2';

const NOTIFICATIONS_UNAVAILABLE = 'Notifications are not yet available.';
const AUTO_CONNECT_UNSUPPORTED = 'This wallet does not support auto-connect configuration.';

const SLIPPAGE_PRESETS: { value: SlippagePreset; label: string; bps: number }[] = [
  { value: '0.1', label: '0.1%', bps: 10 },
  { value: '0.5', label: '0.5%', bps: 50 },
  { value: '1', label: '1%', bps: 100 },
  { value: 'custom', label: 'Custom', bps: 0 },
];

const SLIPPAGE_MAX = 50; // max custom slippage as percentage

/* ------------------------------------------------------------------ */
/*  Utility Helpers                                                    */
/* ------------------------------------------------------------------ */

function validateCustomSlippage(value: string): string | null {
  if (value === '') return null; // allow empty while typing
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 'Enter a valid number';
  if (parsed <= 0) return 'Must be greater than 0%';
  if (parsed > SLIPPAGE_MAX) return `Maximum is ${SLIPPAGE_MAX}%`;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

/** Shared card wrapper used by every section. */
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.FC<React.ComponentProps<typeof Settings>>;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card/80 dark:bg-card/50 shadow-sm dark:shadow-none overflow-hidden',
        className,
      )}
    >
      <div className="flex items-start gap-3 p-5 pb-4 border-b border-border/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

/** Toggle switch reused throughout the page. */
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** A single row with label + description + control. */
function SettingRow({
  label,
  description,
  children,
  htmlFor,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-[44px]">
      <div className="space-y-0.5 min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground cursor-pointer select-none"
        >
          {label}
        </label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Transaction Settings                                      */
/* ------------------------------------------------------------------ */

function TransactionSettingsSection() {
  const {
    slippagePreset,
    customSlippage,
    confirmBeforeTx,
    expertMode,
    setSlippagePreset,
    setCustomSlippage,
    setConfirmBeforeTx,
    setExpertMode,
  } = usePreferencesStore();

  const [localCustom, setLocalCustom] = React.useState(customSlippage);
  const validationError = validateCustomSlippage(localCustom);

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // prevent multiple dots
    const sanitized = raw.split('.').length > 2 ? raw.slice(0, raw.lastIndexOf('.')) : raw;
    setLocalCustom(sanitized);
    if (validateCustomSlippage(sanitized) === null && sanitized !== '') {
      setCustomSlippage(sanitized);
    }
  };

  const handleSlippageSelect = (preset: SlippagePreset) => {
    setSlippagePreset(preset);
    if (preset !== 'custom') {
      setLocalCustom('');
      setCustomSlippage('');
    }
  };

  return (
    <SectionCard
      icon={ArrowLeftRight}
      title="Transaction Settings"
      description="Configure default slippage tolerance and transaction confirmation preferences."
    >
      {/* Slippage */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Default Slippage
        </p>
        <div className="flex flex-wrap gap-2">
          {SLIPPAGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSlippageSelect(preset.value)}
              className={cn(
                'px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all min-h-[40px]',
                slippagePreset === preset.value
                  ? 'bg-primary/15 text-primary border-primary/40 shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/30',
              )}
            >
              {preset.label}
              {preset.value !== 'custom' && (
                <span className="block text-[10px] opacity-70 font-normal">{preset.bps} BPS</span>
              )}
            </button>
          ))}
        </div>

        {slippagePreset === 'custom' && (
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={localCustom}
              onChange={handleCustomChange}
              placeholder="e.g. 2.5"
              aria-label="Custom slippage percentage"
              aria-invalid={!!validationError}
              aria-describedby={validationError ? 'slippage-error' : undefined}
              className={cn(
                'w-full max-w-[160px] rounded-lg border px-3 py-2 text-sm font-mono bg-background focus:outline-none focus:ring-2 transition-all',
                validationError
                  ? 'border-destructive focus:ring-destructive/30'
                  : 'border-border focus:ring-primary/30',
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              %
            </span>
            {validationError && (
              <p id="slippage-error" className="text-xs text-destructive mt-1.5" role="alert">
                {validationError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirmation & Expert Mode */}
      <div className="space-y-4 pt-1">
        <SettingRow
          label="Confirm Before Transactions"
          description="Show a confirmation dialog before submitting each transaction."
          htmlFor="confirm-tx"
        >
          <ToggleSwitch
            id="confirm-tx"
            checked={confirmBeforeTx}
            onChange={setConfirmBeforeTx}
            ariaLabel="Confirm transactions before submitting"
          />
        </SettingRow>

        <SettingRow
          label="Expert Mode"
          description="Allow high slippage values and disable transaction confirmation prompts."
          htmlFor="expert-mode"
        >
          <ToggleSwitch
            id="expert-mode"
            checked={expertMode}
            onChange={setExpertMode}
            ariaLabel="Toggle expert mode"
          />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Wallet Settings                                           */
/* ------------------------------------------------------------------ */

function WalletSettingsSection() {
  const { address, isConnected, connectorName } = useWallet();
  const { chain, chainId, isSupported, supportedChains } = useNetwork();

  if (!isConnected) {
    return (
      <SectionCard
        icon={Wallet}
        title="Wallet Settings"
        description="Manage your connected wallet and network preferences."
      >
        <div className="flex flex-col items-center py-6 text-center space-y-3">
          <div className="p-3 rounded-full bg-muted/50 border border-border">
            <Plug className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No Wallet Connected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your wallet to view and manage wallet settings.
            </p>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={Wallet}
      title="Wallet Settings"
      description="View connected wallet details and network information."
    >
      <div className="space-y-3">
        {/* Connected Wallet */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-sm text-muted-foreground">Connected Wallet</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground bg-secondary/60 px-2 py-1 rounded-md border border-border">
              {connectorName || 'Unknown'}
            </span>
            <AddressDisplay address={address} chars={4} />
          </div>
        </div>

        {/* Network */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-sm text-muted-foreground">Network</span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border',
                isSupported
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-destructive/10 border-destructive/20 text-destructive',
              )}
            >
              <span
                className={cn(
                  'block w-1.5 h-1.5 rounded-full',
                  isSupported ? 'bg-emerald-400' : 'bg-destructive',
                )}
              />
              {chain?.name || 'Unknown'}
              {!isSupported && <AlertTriangle className="w-3 h-3" />}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              Chain ID: {chainId ?? '—'}
            </span>
          </div>
        </div>

        {/* Wallet Provider */}
        <div className="flex items-center justify-between min-h-[44px]">
          <span className="text-sm text-muted-foreground">Wallet Provider</span>
          <span className="text-xs font-medium text-foreground bg-secondary/60 px-2 py-1 rounded-md border border-border">
            {connectorName || '—'}
          </span>
        </div>

        {/* Supported Networks */}
        <div className="flex items-start justify-between min-h-[44px]">
          <span className="text-sm text-muted-foreground pt-1">Supported Networks</span>
          <div className="flex flex-wrap gap-1.5 justify-end max-w-[260px]">
            {supportedChains.map((c) => (
              <span
                key={c.id}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary/50 border border-border text-muted-foreground"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Auto-connect */}
        <div className="flex items-center justify-between min-h-[44px] pt-2 border-t border-border/60">
          <span className="text-sm text-muted-foreground">Auto-connect</span>
          <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            {AUTO_CONNECT_UNSUPPORTED}
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Appearance                                                */
/* ------------------------------------------------------------------ */

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const {
    compactMode,
    numberFormat,
    currencyDisplay,
    setCompactMode,
    setNumberFormat,
    setCurrencyDisplay,
  } = usePreferencesStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <SectionCard
        icon={Palette}
        title="Appearance"
        description="Customize theme and display preferences."
      >
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-secondary/40 rounded-lg" />
          <div className="h-5 bg-secondary/40 rounded w-2/3" />
          <div className="h-5 bg-secondary/40 rounded w-1/2" />
        </div>
      </SectionCard>
    );
  }

  const THEME_OPTIONS: { value: string; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];

  return (
    <SectionCard
      icon={Palette}
      title="Appearance"
      description="Customize theme, layout density, and display preferences."
    >
      {/* Theme */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Theme</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Theme selection">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-semibold border transition-all min-h-[40px]',
                theme === opt.value
                  ? 'bg-primary/15 text-primary border-primary/40 shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/30',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <SettingRow
        label="Compact Mode"
        description="Reduce spacing and padding across the interface."
        htmlFor="compact-mode"
      >
        <ToggleSwitch
          id="compact-mode"
          checked={compactMode}
          onChange={setCompactMode}
          ariaLabel="Toggle compact mode"
        />
      </SettingRow>

      {/* Number Formatting */}
      <SettingRow
        label="Number Formatting"
        description="Choose how large numbers are displayed."
        htmlFor="number-format"
      >
        <select
          id="number-format"
          value={numberFormat}
          onChange={(e) => setNumberFormat(e.target.value as NumberFormatStyle)}
          aria-label="Number formatting style"
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[40px]"
        >
          <option value="standard">Standard (1,234.56)</option>
          <option value="compact">Compact (1.23K)</option>
        </select>
      </SettingRow>

      {/* Currency Display */}
      <SettingRow
        label="Currency Display"
        description="Select which currency denomination to show."
        htmlFor="currency-display"
      >
        <select
          id="currency-display"
          value={currencyDisplay}
          onChange={(e) => setCurrencyDisplay(e.target.value as CurrencyDisplay)}
          aria-label="Currency display preference"
          className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[40px]"
        >
          <option value="USD">USD</option>
          <option value="native">Native Token</option>
          <option value="both">Both</option>
        </select>
      </SettingRow>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Notifications                                             */
/* ------------------------------------------------------------------ */

function NotificationsSection() {
  return (
    <SectionCard
      icon={Bell}
      title="Notifications"
      description="Manage in-app alerts and transaction notifications."
    >
      <div className="space-y-4">
        {/* Deposit Success */}
        <SettingRow
          label="Deposit Success"
          description="Notify when a deposit transaction completes."
          htmlFor="notif-deposit"
        >
          <ToggleSwitch
            id="notif-deposit"
            checked={false}
            onChange={() => {}}
            disabled
            ariaLabel="Deposit success notifications (not yet available)"
          />
        </SettingRow>

        {/* Redeem Success */}
        <SettingRow
          label="Redeem Success"
          description="Notify when a redemption transaction completes."
          htmlFor="notif-redeem"
        >
          <ToggleSwitch
            id="notif-redeem"
            checked={false}
            onChange={() => {}}
            disabled
            ariaLabel="Redeem success notifications (not yet available)"
          />
        </SettingRow>

        {/* Protocol Pause Alerts */}
        <SettingRow
          label="Protocol Pause Alerts"
          description="Alert when the protocol enters or exits a paused state."
          htmlFor="notif-pause"
        >
          <ToggleSwitch
            id="notif-pause"
            checked={false}
            onChange={() => {}}
            disabled
            ariaLabel="Protocol pause notifications (not yet available)"
          />
        </SettingRow>

        {/* Oracle Warnings */}
        <SettingRow
          label="Oracle Warning Notifications"
          description="Warn when an oracle feed reports stale or invalid prices."
          htmlFor="notif-oracle"
        >
          <ToggleSwitch
            id="notif-oracle"
            checked={false}
            onChange={() => {}}
            disabled
            ariaLabel="Oracle warning notifications (not yet available)"
          />
        </SettingRow>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground mt-2">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>{NOTIFICATIONS_UNAVAILABLE}</span>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Developer Settings                                        */
/* ------------------------------------------------------------------ */

function DeveloperSettingsSection() {
  const { chainId } = useNetwork();
  const {
    controllerAddress,
    vaultAddress,
    indexTokenAddress,
    isLoading: addressesLoading,
  } = useProtocolDirectoryAddresses();
  const [expanded, setExpanded] = React.useState(false);

  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);

  const featureFlags: { name: string; enabled: boolean }[] = [
    { name: 'Deposit', enabled: true },
    { name: 'Redeem', enabled: true },
    { name: 'Portfolio', enabled: true },
    { name: 'Analytics', enabled: true },
    { name: 'Admin', enabled: true },
    { name: 'Governance', enabled: true },
    { name: 'Health', enabled: true },
    { name: 'Settings', enabled: true },
    { name: 'Notifications', enabled: false },
    { name: 'Auto-connect', enabled: false },
  ];

  return (
    <SectionCard
      icon={Code2}
      title="Developer Settings"
      description="Read-only protocol environment information and feature flags."
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px]"
        aria-expanded={expanded}
        aria-controls="developer-panel"
      >
        <span>{expanded ? 'Hide' : 'Show'} Developer Details</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded && (
        <div
          id="developer-panel"
          className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {/* Environment */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Server className="w-3 h-3" />
              Environment
            </span>
            <span className="text-xs font-mono font-medium text-foreground bg-secondary/60 px-2 py-0.5 rounded">
              {env.NEXT_PUBLIC_ACTIVE_CHAIN === 'base' || env.NEXT_PUBLIC_ACTIVE_CHAIN === '8453'
                ? 'Mainnet'
                : 'Testnet'}
            </span>
          </div>

          {/* Network */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              Network
            </span>
            <span className="text-xs font-mono font-medium text-foreground bg-secondary/60 px-2 py-0.5 rounded">
              {chain?.name ?? ACTIVE_CHAIN.name} ({chain?.id ?? ACTIVE_CHAIN.id})
            </span>
          </div>

          {/* Controller Address */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground">Controller Address</span>
            {addressesLoading ? (
              <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
            ) : (
              <AddressDisplay address={controllerAddress} chars={4} />
            )}
          </div>

          {/* Treasury Address */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground">Treasury Address</span>
            {addressesLoading ? (
              <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
            ) : (
              <AddressDisplay address={vaultAddress} chars={4} />
            )}
          </div>

          {/* Oracle Address – uses oracleManager from full protocol directory */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground">Oracle Address</span>
            {addressesLoading ? (
              <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
            ) : (
              <AddressDisplay address={indexTokenAddress} chars={4} />
            )}
          </div>

          {/* Protocol Version */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              Protocol Version
            </span>
            <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {PROTOCOL_VERSION}
            </span>
          </div>

          {/* Frontend Build Version */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground">Frontend Build Version</span>
            <span className="text-xs font-mono text-foreground bg-secondary/60 px-2 py-0.5 rounded">
              v{FRONTEND_VERSION}
            </span>
          </div>

          {/* Git Commit */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-xs text-muted-foreground">Git Commit</span>
            <span className="text-xs font-mono text-foreground bg-secondary/60 px-2 py-0.5 rounded">
              {GIT_COMMIT}
            </span>
          </div>

          {/* Feature Flags */}
          <div className="pt-2 border-t border-border/60">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              Feature Flags
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {featureFlags.map((flag) => (
                <div
                  key={flag.name}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs border',
                    flag.enabled
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                      : 'bg-muted/40 border-border text-muted-foreground',
                  )}
                >
                  <span>{flag.name}</span>
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      flag.enabled ? 'bg-emerald-400' : 'bg-muted-foreground/40',
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Section: Data Management                                           */
/* ------------------------------------------------------------------ */

function DataManagementSection() {
  const resetToDefaults = usePreferencesStore((s) => s.resetToDefaults);
  const [confirmAction, setConfirmAction] = React.useState<'clear' | 'reset' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleClearCache = () => {
    try {
      localStorage.removeItem('unifyvault-user-preferences');
      setFeedback('Cached preferences cleared.');
      setConfirmAction(null);
      setTimeout(() => setFeedback(null), 2500);
    } catch {
      setFeedback('Unable to clear preferences.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    setFeedback('Settings reset to defaults.');
    setConfirmAction(null);
    setTimeout(() => setFeedback(null), 2500);
  };

  const cancelConfirm = () => setConfirmAction(null);

  return (
    <SectionCard
      icon={Database}
      title="Data Management"
      description="Manage cached preferences and reset settings to their defaults."
    >
      {feedback && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary animate-in fade-in zoom-in-95 duration-200">
          <Check className="w-3.5 h-3.5" />
          {feedback}
        </div>
      )}

      {confirmAction ? (
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {confirmAction === 'clear'
                  ? 'Clear Cached Preferences?'
                  : 'Reset Settings to Defaults?'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {confirmAction === 'clear'
                  ? 'This will remove all locally stored preference data. Your theme and other settings will return to defaults.'
                  : 'All preferences will be restored to their original values. This action cannot be undone.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={cancelConfirm}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border border-border bg-secondary/60 text-foreground hover:bg-accent transition-colors min-h-[36px]"
            >
              Cancel
            </button>
            <button
              onClick={confirmAction === 'clear' ? handleClearCache : handleResetDefaults}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors min-h-[36px]"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setConfirmAction('clear')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-border bg-secondary/60 text-foreground hover:bg-accent hover:border-muted-foreground/30 transition-all min-h-[44px]"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            Clear Cached Preferences
          </button>
          <button
            onClick={() => setConfirmAction('reset')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium border border-border bg-secondary/60 text-foreground hover:bg-accent hover:border-muted-foreground/30 transition-all min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            Reset Settings to Defaults
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  return (
    <Container>
      <PageWrapper className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage transaction preferences, wallet configuration, appearance, and more.
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TransactionSettingsSection />
          <WalletSettingsSection />
          <AppearanceSection />
          <NotificationsSection />
          <div className="lg:col-span-2">
            <DeveloperSettingsSection />
          </div>
          <div className="lg:col-span-2">
            <DataManagementSection />
          </div>
        </div>
      </PageWrapper>
    </Container>
  );
}
