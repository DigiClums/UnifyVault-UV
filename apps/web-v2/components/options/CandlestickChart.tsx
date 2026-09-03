'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { useOptionsProtocol } from '../../hooks/useOptionsProtocol';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts';
import { LineChart, Info } from 'lucide-react';

export function CandlestickChart() {
  const { indexData, selectedOption } = useOptionsProtocol();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const spotPrice = indexData.spotPriceUsd;
  const selectedStrike = selectedOption?.strike;
  const [timeframe, setTimeframe] = React.useState('15m');

  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const candleSeriesRef = React.useRef<ISeriesApi<'Candlestick'> | null>(null);

  const timeframes = ['1m', '5m', '15m', '30m', '1H', '4H', '1D'];

  React.useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const bgColor = isDark ? '#0D0D0D' : '#F7F6EE';
    const textColor = isDark ? '#9CA3AF' : '#4B5563';
    const gridColor = isDark ? '#1F2937' : '#E5E7EB';
    const borderColor = isDark ? '#374151' : '#D1D5DB';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: bgColor },
        textColor: textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isDark ? '#BFFF00' : '#10B981',
          width: 1,
          style: LineStyle.Dotted,
        },
        horzLine: {
          color: isDark ? '#BFFF00' : '#10B981',
          width: 1,
          style: LineStyle.Dotted,
        },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: borderColor,
        autoScale: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    const baseCandles: CandlestickData<Time>[] = [];
    const now = Math.floor(Date.now() / 1000);
    const intervalSec = 900;
    let currentOpen = spotPrice - 240;

    for (let i = 40; i >= 1; i--) {
      const time = (now - i * intervalSec) as Time;
      const volatility = 45;
      const change = (Math.sin(i * 0.4) + (Math.random() - 0.48)) * volatility;
      const close = currentOpen + change;
      const high = Math.max(currentOpen, close) + Math.random() * 25;
      const low = Math.min(currentOpen, close) - Math.random() * 25;

      baseCandles.push({
        time,
        open: currentOpen,
        high,
        low,
        close,
      });
      currentOpen = close;
    }

    baseCandles.push({
      time: now as Time,
      open: currentOpen,
      high: Math.max(currentOpen, spotPrice) + 10,
      low: Math.min(currentOpen, spotPrice) - 10,
      close: spotPrice,
    });

    candleSeries.setData(baseCandles);
    candleSeriesRef.current = candleSeries;
    chartRef.current = chart;

    if (selectedStrike) {
      candleSeries.createPriceLine({
        price: selectedStrike,
        color: isDark ? '#BFFF00' : '#F59E0B',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `Strike ${selectedStrike}`,
      });
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [selectedStrike, isDark]);

  React.useEffect(() => {
    if (candleSeriesRef.current) {
      const now = Math.floor(Date.now() / 1000) as Time;
      candleSeriesRef.current.update({
        time: now,
        open: spotPrice - 5,
        high: spotPrice + 12,
        low: spotPrice - 8,
        close: spotPrice,
      });
    }
  }, [spotPrice]);

  return (
    <div className="bg-background border-2 border-black dark:border-white/10 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] flex flex-col h-full min-h-[450px]">
      {/* Timeframe Controls & Indicators */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b-2 border-black dark:border-white/10 bg-surface gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-foreground uppercase">
            UV-NIFTY Index Spot Chart
          </span>
          <span className="text-sm font-mono font-black text-foreground">
            $
            {spotPrice.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-[#BFFF00]/20 text-[#5f8f00] dark:text-[#BFFF00] border border-[#BFFF00]/40">
            LIVE ●
          </span>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-black dark:border-white/10">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-lg transition-colors ${
                timeframe === tf
                  ? 'bg-black text-white dark:bg-[#BFFF00] dark:text-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-[380px]" />
    </div>
  );
}
