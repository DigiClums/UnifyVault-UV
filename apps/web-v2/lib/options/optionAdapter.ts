/**
 * Contract Adapter & Live/Mock Feeds for UV-NIFTY Crypto Options
 * Provides clean typed APIs decoupling UI from pending contract deployments.
 */

import { UVNiftyIndexData, StrikeRow, ExpiryCycle, OptionType } from '../../types/options';
import { buildOptionQuote } from './pricingEngine';

/**
 * Generates dynamic strikes centered around spot price with realistic intervals
 */
export function generateStrikeLadder({
  spotPrice,
  expiryTimestamp,
  cycle,
  uvbePriceUsd,
  strikeCount = 9,
  strikeInterval = 250,
}: {
  spotPrice: number;
  expiryTimestamp: number;
  cycle: ExpiryCycle;
  uvbePriceUsd: number;
  strikeCount?: number;
  strikeInterval?: number;
}): StrikeRow[] {
  // Round spot price to nearest strike interval (ATM strike)
  const atmStrike = Math.round(spotPrice / strikeInterval) * strikeInterval;
  const halfCount = Math.floor(strikeCount / 2);
  const rows: StrikeRow[] = [];

  for (let i = -halfCount; i <= halfCount; i++) {
    const strike = atmStrike + i * strikeInterval;
    const isAtm = strike === atmStrike;

    const ce = buildOptionQuote({
      spotPrice,
      strike,
      expiryTimestamp,
      cycle,
      type: 'CE',
      uvbePriceUsd,
      impliedVol: 0.54 + Math.abs(i) * 0.02, // Volatility Smile
    });

    const pe = buildOptionQuote({
      spotPrice,
      strike,
      expiryTimestamp,
      cycle,
      type: 'PE',
      uvbePriceUsd,
      impliedVol: 0.54 + Math.abs(i) * 0.02,
    });

    rows.push({
      strike,
      isAtm,
      ce,
      pe,
    });
  }

  return rows;
}

/**
 * Calculates standardized Expiry Timestamps for 0-DTE, Daily, Weekly, Monthly
 */
export function getStandardExpiries(): { cycle: ExpiryCycle; timestamp: number; label: string }[] {
  const now = new Date();
  const utcNow = now.getTime();

  // 0-DTE: Today at 15:30 UTC
  const zeroDte = new Date(now);
  zeroDte.setUTCHours(15, 30, 0, 0);
  if (zeroDte.getTime() <= utcNow) {
    zeroDte.setUTCDate(zeroDte.getUTCDate() + 1);
  }

  // Daily: Tomorrow 15:30 UTC
  const daily = new Date(zeroDte);
  daily.setUTCDate(daily.getUTCDate() + 1);

  // Weekly: Upcoming Friday 15:30 UTC
  const weekly = new Date(now);
  const dayOfWeek = weekly.getUTCDay(); // 0 = Sun, 5 = Fri
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  weekly.setUTCDate(weekly.getUTCDate() + daysUntilFriday);
  weekly.setUTCHours(15, 30, 0, 0);

  // Monthly: Last Friday of Month
  const monthly = new Date(now);
  monthly.setUTCMonth(monthly.getUTCMonth() + 1, 0); // Last day of current month
  while (monthly.getUTCDay() !== 5) {
    monthly.setUTCDate(monthly.getUTCDate() - 1);
  }
  monthly.setUTCHours(15, 30, 0, 0);

  return [
    {
      cycle: '0-DTE',
      timestamp: Math.floor(zeroDte.getTime() / 1000),
      label: '0-DTE (Today 15:30 UTC)',
    },
    {
      cycle: 'DAILY',
      timestamp: Math.floor(daily.getTime() / 1000),
      label: 'Daily (Tomorrow 15:30 UTC)',
    },
    {
      cycle: 'WEEKLY',
      timestamp: Math.floor(weekly.getTime() / 1000),
      label: 'Weekly (Fri 15:30 UTC)',
    },
    {
      cycle: 'MONTHLY',
      timestamp: Math.floor(monthly.getTime() / 1000),
      label: 'Monthly (Month-End)',
    },
  ];
}

/**
 * Calculates live index composite from BTC and ETH prices
 */
export function calculateUVNiftySpot(
  btcPrice: number,
  ethPrice: number,
  btcWeight = 0.6,
  ethWeight = 0.4,
): number {
  return btcPrice * btcWeight + ethPrice * ethWeight;
}
