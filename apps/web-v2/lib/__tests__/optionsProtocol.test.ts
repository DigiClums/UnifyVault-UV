import { describe, it, expect } from 'vitest';
import { calculateBlackScholes, convertUsdToUvbe, getMoneyness } from '../options/pricingEngine';
import { generateStrikeLadder, calculateUVNiftySpot } from '../options/optionAdapter';

describe('UVBE Options Protocol Math & Pricing Engine', () => {
  it('correctly computes UV-NIFTY spot price from 60% cbBTC and 40% WETH weights', () => {
    const btc = 90000;
    const eth = 3000;
    const spot = calculateUVNiftySpot(btc, eth, 0.6, 0.4);
    // (90000 * 0.6) + (3000 * 0.4) = 54000 + 1200 = 55200
    expect(spot).toBe(55200);
  });

  it('normalizes USD premium to UVBE token dynamically without hardcoding $1 peg', () => {
    const premiumUsd = 100;
    const uvbeAtHalfDollar = 0.5;
    const uvbeAtTwoDollars = 2.0;

    expect(convertUsdToUvbe(premiumUsd, uvbeAtHalfDollar)).toBe(200); // 100 / 0.5 = 200 UVBE
    expect(convertUsdToUvbe(premiumUsd, uvbeAtTwoDollars)).toBe(50); // 100 / 2.0 = 50 UVBE
  });

  it('calculates valid Black-Scholes Call and Put premiums and Greeks', () => {
    const spotPrice = 65000;
    const strike = 65000; // ATM
    const timeToExpiryYears = 1 / 365; // 1 day
    const volatility = 0.6; // 60% IV

    const ce = calculateBlackScholes({
      spotPrice,
      strike,
      timeToExpiryYears,
      volatility,
      type: 'CE',
    });

    const pe = calculateBlackScholes({
      spotPrice,
      strike,
      timeToExpiryYears,
      volatility,
      type: 'PE',
    });

    expect(ce.premiumUsd).toBeGreaterThan(0);
    expect(pe.premiumUsd).toBeGreaterThan(0);
    expect(ce.delta).toBeGreaterThan(0.4);
    expect(ce.delta).toBeLessThan(0.6);
    expect(pe.delta).toBeGreaterThan(-0.6);
    expect(pe.delta).toBeLessThan(-0.4);
  });

  it('correctly classifies Moneyness for Call and Put options', () => {
    const spot = 65000;
    expect(getMoneyness(spot, 65000, 'CE')).toBe('ATM');
    expect(getMoneyness(spot, 64000, 'CE')).toBe('ITM');
    expect(getMoneyness(spot, 66000, 'CE')).toBe('OTM');

    expect(getMoneyness(spot, 65000, 'PE')).toBe('ATM');
    expect(getMoneyness(spot, 66000, 'PE')).toBe('ITM');
    expect(getMoneyness(spot, 64000, 'PE')).toBe('OTM');
  });

  it('generates symmetric strike ladders with ATM highlighted', () => {
    const ladder = generateStrikeLadder({
      spotPrice: 65240,
      expiryTimestamp: Math.floor(Date.now() / 1000) + 86400,
      cycle: '0-DTE',
      uvbePriceUsd: 1.25,
      strikeCount: 7,
      strikeInterval: 250,
    });

    expect(ladder.length).toBe(7);
    const atmRow = ladder.find((r) => r.isAtm);
    expect(atmRow).toBeDefined();
    expect(atmRow?.strike).toBe(65250); // Nearest 250 interval
  });
});
