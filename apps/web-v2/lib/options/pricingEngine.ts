/**
 * Dynamic Black-Scholes & Oracle Math for UV-NIFTY Crypto Options
 * Implements accurate Greeks, Moneyness, and UVBE Oracle Normalization.
 */

import { OptionContractQuote, OptionType, ExpiryCycle, OptionMoneyness } from '../../types/options';

// Cumulative Standard Normal Distribution
function cdf(x: number): number {
  const p = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * Math.abs(x));
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const phi = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  const prob = 1.0 - phi * poly;

  return x >= 0 ? prob : 1.0 - prob;
}

// Probability Density Function
function pdf(x: number): number {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates theoretical Black-Scholes Option Premium and Greeks
 */
export function calculateBlackScholes({
  spotPrice,
  strike,
  timeToExpiryYears,
  volatility,
  riskFreeRate = 0.04, // 4% baseline risk free rate
  type,
}: {
  spotPrice: number;
  strike: number;
  timeToExpiryYears: number;
  volatility: number;
  riskFreeRate?: number;
  type: OptionType;
}) {
  const T = Math.max(0.0001, timeToExpiryYears);
  const S = Math.max(0.01, spotPrice);
  const K = Math.max(0.01, strike);
  const sigma = Math.max(0.05, volatility);
  const r = riskFreeRate;

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let premium = 0;
  let delta = 0;
  let theta = 0;

  const gamma = pdf(d1) / (S * sigma * Math.sqrt(T));
  const vega = (S * pdf(d1) * Math.sqrt(T)) / 100;

  if (type === 'CE') {
    premium = S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2);
    delta = cdf(d1);
    theta =
      (-((S * pdf(d1) * sigma) / (2 * Math.sqrt(T))) - r * K * Math.exp(-r * T) * cdf(d2)) / 365;
  } else {
    premium = K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1);
    delta = cdf(d1) - 1.0;
    theta =
      (-((S * pdf(d1) * sigma) / (2 * Math.sqrt(T))) + r * K * Math.exp(-r * T) * cdf(-d2)) / 365;
  }

  // Enforce minimum intrinsic value
  const intrinsic = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
  const safePremium = Math.max(intrinsic, Math.max(0.5, premium));

  return {
    premiumUsd: safePremium,
    intrinsicUsd: intrinsic,
    timeValueUsd: Math.max(0, safePremium - intrinsic),
    delta,
    gamma,
    theta,
    vega,
  };
}

/**
 * Normalizes USD Premium to UVBE using real-time Oracle UVBE/USD valuation.
 * Reverts to safe fallback if UVBE price is invalid.
 */
export function convertUsdToUvbe(amountUsd: number, uvbePriceUsd: number): number {
  if (!uvbePriceUsd || uvbePriceUsd <= 0) {
    return amountUsd; // 1:1 safe guard if oracle feed is offline
  }
  return amountUsd / uvbePriceUsd;
}

/**
 * Determines Option Moneyness based on Spot vs Strike
 */
export function getMoneyness(spotPrice: number, strike: number, type: OptionType): OptionMoneyness {
  const diffPct = Math.abs(spotPrice - strike) / spotPrice;
  if (diffPct <= 0.0035) {
    return 'ATM'; // Within +/- 0.35% range is At-The-Money
  }
  if (type === 'CE') {
    return spotPrice > strike ? 'ITM' : 'OTM';
  } else {
    return spotPrice < strike ? 'ITM' : 'OTM';
  }
}

/**
 * Builds a typed contract quote for a given strike
 */
export function buildOptionQuote({
  spotPrice,
  strike,
  expiryTimestamp,
  cycle,
  type,
  uvbePriceUsd,
  impliedVol = 0.58,
  lotSize = 0.01,
}: {
  spotPrice: number;
  strike: number;
  expiryTimestamp: number;
  cycle: ExpiryCycle;
  type: OptionType;
  uvbePriceUsd: number;
  impliedVol?: number;
  lotSize?: number;
}): OptionContractQuote {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = Math.max(60, expiryTimestamp - now);
  const timeToExpiryYears = secondsLeft / (365 * 24 * 3600);

  const bs = calculateBlackScholes({
    spotPrice,
    strike,
    timeToExpiryYears,
    volatility: impliedVol,
    type,
  });

  const premiumUvbe = convertUsdToUvbe(bs.premiumUsd, uvbePriceUsd);

  return {
    strike,
    expiryTimestamp,
    expiryLabel: formatExpiryDate(expiryTimestamp),
    cycle,
    type,
    premiumUsd: bs.premiumUsd,
    intrinsicValueUsd: bs.intrinsicUsd,
    timeValueUsd: bs.timeValueUsd,
    premiumUvbe,
    uvbePriceUsd,
    delta: bs.delta,
    theta: bs.theta,
    gamma: bs.gamma,
    vega: bs.vega,
    iv: impliedVol * 100,
    openInterest: Math.floor(120 + Math.abs(strike - spotPrice) * 1.5),
    volume24h: Math.floor(450 + Math.abs(strike - spotPrice) * 3.2),
    moneyness: getMoneyness(spotPrice, strike, type),
    lotSize,
  };
}

export function formatExpiryDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toUTCString().slice(5, 16); // e.g. "02 Sep 2026"
}
