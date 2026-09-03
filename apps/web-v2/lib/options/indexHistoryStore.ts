import fs from 'fs';
import path from 'path';

export interface IndexObservation {
  timestamp: number; // unix timestamp in seconds
  price: number; // USD price
  blockNumber?: number;
  source: 'ON_CHAIN_INDEX_MANAGER' | 'KEEPER_OBSERVATION';
}

export interface OHLCV {
  time: number; // unix timestamp in seconds (bucket start)
  open: number;
  high: number;
  low: number;
  close: number;
}

export const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1H': 3600,
  '4H': 14400,
  '1D': 86400,
};

const STORE_PATH = path.resolve(process.cwd(), 'public', 'index-history.json');

export function getIndexObservations(): IndexObservation[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.observations)) {
        return data.observations;
      }
    }
  } catch (err) {
    console.error('Failed to read index history:', err);
  }
  return [];
}

export function recordIndexObservation(obs: IndexObservation): boolean {
  try {
    const observations = getIndexObservations();
    // Prevent duplicates within 5 seconds
    const isDuplicate = observations.some(
      (o) => Math.abs(o.timestamp - obs.timestamp) < 5 && Math.abs(o.price - obs.price) < 0.0001,
    );
    if (!isDuplicate) {
      observations.push(obs);
      // Sort chronologically
      observations.sort((a, b) => a.timestamp - b.timestamp);
      // Keep last 10,000 observations
      const trimmed = observations.slice(-10000);
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify({ observations: trimmed, lastUpdated: Date.now() }, null, 2),
      );
      return true;
    }
  } catch (err) {
    console.error('Failed to record index observation:', err);
  }
  return false;
}

/**
 * Aggregates raw observations into deterministic OHLC candlestick buckets.
 * Strict mathematical rules:
 * - Open = First observation in bucket
 * - High = Max observation in bucket
 * - Low = Min observation in bucket
 * - Close = Last observation in bucket
 * - No fake data: Empty buckets with zero observations are omitted (or represented as gap).
 */
export function aggregateOHLC(
  observations: IndexObservation[],
  timeframeKey: string,
  liveSpot?: number,
): OHLCV[] {
  const bucketSec = TIMEFRAME_SECONDS[timeframeKey] || 900;
  if (!observations || observations.length === 0) {
    if (liveSpot && liveSpot > 0) {
      const now = Math.floor(Date.now() / 1000);
      const bucketTime = Math.floor(now / bucketSec) * bucketSec;
      return [
        {
          time: bucketTime,
          open: liveSpot,
          high: liveSpot,
          low: liveSpot,
          close: liveSpot,
        },
      ];
    }
    return [];
  }

  // Group observations by bucket timestamp
  const buckets = new Map<number, number[]>();

  for (const obs of observations) {
    if (!obs.price || obs.price <= 0 || !obs.timestamp) continue;
    const bucketTime = Math.floor(obs.timestamp / bucketSec) * bucketSec;
    const list = buckets.get(bucketTime) || [];
    list.push(obs.price);
    buckets.set(bucketTime, list);
  }

  // If live spot is provided, merge it into current live bucket
  if (liveSpot && liveSpot > 0) {
    const now = Math.floor(Date.now() / 1000);
    const currentBucketTime = Math.floor(now / bucketSec) * bucketSec;
    const list = buckets.get(currentBucketTime) || [];
    list.push(liveSpot);
    buckets.set(currentBucketTime, list);
  }

  const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);
  const result: OHLCV[] = [];

  for (const bTime of sortedBucketTimes) {
    const prices = buckets.get(bTime)!;
    if (prices.length === 0) continue;

    const open = prices[0];
    const close = prices[prices.length - 1];
    let high = prices[0];
    let low = prices[0];

    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > high) high = prices[i];
      if (prices[i] < low) low = prices[i];
    }

    result.push({
      time: bTime,
      open,
      high,
      low,
      close,
    });
  }

  return result;
}
