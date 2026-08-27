import { KlineCandle, OrderBookData } from '../types/binance';
import { UserSettings } from '../types/settings';
import {
  AllIndicatorsResult,
  SRLevel,
  FibonacciLevels
} from '../types/indicators';
import {
  SignalType,
  TrendDirection,
  ConfidenceLevel,
  TradingRecommendation,
  AnalysisSummary,
  ChartSignalMarker
} from '../types/signals';
import {
  calculateRSI,
  calculateEMA,
  calculateEMASeries,
  calculateSMA,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateADX,
  calculateATR,
  calculateParabolicSAR,
  calculateVolume,
  calculateSRLevels,
  calculateFibonacci
} from '../indicators';

export class SignalEngine {
  /**
   * Run full technical analysis pipeline on candlestick and order book data
   */
  public static analyze(
    symbol: string,
    timeframe: string,
    candles: KlineCandle[],
    orderBook: OrderBookData | null,
    settings: UserSettings,
    priceChange24h?: number
  ): AnalysisSummary {
    if (!candles || candles.length === 0) {
      throw new Error('Candles data is empty');
    }

    const currentPrice = candles[candles.length - 1].close;
    const closes = candles.map((c) => c.close);
    const params = settings.indicatorParams;
    const active = settings.indicators;

    // 1. Calculate Individual Indicators
    const indicators: AllIndicatorsResult = {};
    const weightedScores: { score: number; weight: number }[] = [];

    // RSI
    if (active.rsi) {
      const rsiRes = calculateRSI(
        closes,
        params.rsi.period,
        params.rsi.oversold,
        params.rsi.overbought
      );
      indicators.rsi = rsiRes;
      weightedScores.push({ score: rsiRes.score, weight: 1.2 });
    }

    // EMA
    if (active.ema) {
      const emaRes = calculateEMA(closes, params.ema.fast, params.ema.slow);
      indicators.ema = emaRes;
      weightedScores.push({ score: emaRes.score, weight: 1.5 });
    }

    // SMA
    if (active.sma) {
      const smaRes = calculateSMA(closes, params.sma.fast, params.sma.slow);
      indicators.sma = smaRes;
      weightedScores.push({ score: smaRes.score, weight: 0.8 });
    }

    // MACD
    if (active.macd) {
      const macdRes = calculateMACD(
        closes,
        params.macd.fast,
        params.macd.slow,
        params.macd.signal
      );
      indicators.macd = macdRes;
      weightedScores.push({ score: macdRes.score, weight: 1.4 });
    }

    // Bollinger Bands
    if (active.bb) {
      const bbRes = calculateBollingerBands(closes, params.bb.period, params.bb.stddev);
      indicators.bb = bbRes;
      weightedScores.push({ score: bbRes.score, weight: 1.0 });
    }

    // Stochastic
    if (active.stoch) {
      const stochRes = calculateStochastic(
        candles,
        params.stoch.k,
        params.stoch.d,
        params.stoch.oversold,
        params.stoch.overbought
      );
      indicators.stoch = stochRes;
      weightedScores.push({ score: stochRes.score, weight: 1.0 });
    }

    // ADX
    if (active.adx) {
      const adxRes = calculateADX(candles, params.adx.period, params.adx.threshold);
      indicators.adx = adxRes;
      weightedScores.push({ score: adxRes.score, weight: 1.3 });
    }

    // ATR
    if (active.atr) {
      const atrRes = calculateATR(candles, params.atr.period);
      indicators.atr = atrRes;
    }

    // Parabolic SAR
    if (active.sar) {
      const sarRes = calculateParabolicSAR(candles, params.sar.step, params.sar.max);
      indicators.sar = sarRes;
      weightedScores.push({ score: sarRes.score, weight: 1.1 });
    }

    // Volume
    if (active.volume) {
      const volRes = calculateVolume(candles, params.volume.period);
      indicators.volume = volRes;
      weightedScores.push({ score: volRes.score, weight: 1.0 });
    }

    // Support / Resistance & Fibonacci
    let srLevels: SRLevel[] = [];
    if (active.srLevels) {
      srLevels = calculateSRLevels(candles);
      indicators.srLevels = srLevels;
    }

    let fibonacci: FibonacciLevels | null = null;
    if (active.fibonacci) {
      fibonacci = calculateFibonacci(candles);
      indicators.fibonacci = fibonacci;
    }

    // OrderBook Pressure bonus
    if (orderBook) {
      if (orderBook.pressure === 'BUY_PRESSURE') {
        weightedScores.push({ score: 30, weight: 0.8 });
      } else if (orderBook.pressure === 'SELL_PRESSURE') {
        weightedScores.push({ score: -30, weight: 0.8 });
      }
    }

    // 2. Synthesize Composite Score (-100 to +100)
    let totalScore = 0;
    let totalWeight = 0;

    for (const item of weightedScores) {
      totalScore += item.score * item.weight;
      totalWeight += item.weight;
    }

    const compositeScore =
      totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;

    // 3. Determine Overall Signal and Trend Direction
    let signal: SignalType = 'NEUTRAL';
    if (compositeScore >= 45) signal = 'STRONG_BUY';
    else if (compositeScore >= 20) signal = 'BUY';
    else if (compositeScore <= -45) signal = 'STRONG_SELL';
    else if (compositeScore <= -20) signal = 'SELL';

    let trend: TrendDirection = 'SIDEWAYS';
    if (indicators.ema && indicators.ema.trend !== 'NEUTRAL') {
      trend = indicators.ema.trend === 'UPTREND' ? 'BULLISH' : 'BEARISH';
    } else if (indicators.adx && indicators.adx.trendDirection !== 'NEUTRAL') {
      trend = indicators.adx.trendDirection;
    } else if (compositeScore > 15) {
      trend = 'BULLISH';
    } else if (compositeScore < -15) {
      trend = 'BEARISH';
    }

    // 4. Calculate Confidence Level
    let confidence: ConfidenceLevel = 'MEDIUM';
    const agreeingCount = weightedScores.filter((ws) =>
      compositeScore > 0 ? ws.score > 10 : ws.score < -10
    ).length;
    const agreeRatio = weightedScores.length > 0 ? agreeingCount / weightedScores.length : 0;

    if (agreeRatio >= 0.7 && Math.abs(compositeScore) >= 40) {
      confidence = 'HIGH';
    } else if (agreeRatio < 0.4 || Math.abs(compositeScore) < 20) {
      confidence = 'LOW';
    }

    // 5. Generate Dynamic TP/SL & Trading Recommendation
    const recommendation = this.generateRecommendation(
      currentPrice,
      signal,
      confidence,
      indicators,
      srLevels,
      settings
    );

    // 6. Generate historical Buy / Sell signal markers on chart candles
    const signalMarkers = this.generateHistoricalMarkers(candles, settings);

    return {
      symbol,
      timeframe,
      currentPrice,
      priceChange24h,
      timestamp: Date.now(),
      trend,
      signal,
      compositeScore,
      confidence,
      indicators,
      recommendation,
      orderBook,
      srLevels,
      fibonacci,
      signalMarkers
    };
  }

  /**
   * Build smart Take Profit / Stop Loss and Leverage plan
   */
  private static generateRecommendation(
    currentPrice: number,
    signal: SignalType,
    confidence: ConfidenceLevel,
    indicators: AllIndicatorsResult,
    srLevels: SRLevel[],
    settings: UserSettings
  ): TradingRecommendation {
    const isLong = signal === 'STRONG_BUY' || signal === 'BUY';
    const isShort = signal === 'STRONG_SELL' || signal === 'SELL';
    const type = isLong ? 'LONG' : isShort ? 'SHORT' : 'HOLD';

    const reasons: string[] = [];

    if (indicators.rsi) {
      if (indicators.rsi.state === 'OVERSOLD') reasons.push(`RSI Oversold Territory (${indicators.rsi.value})`);
      if (indicators.rsi.state === 'OVERBOUGHT') reasons.push(`RSI Overbought Territory (${indicators.rsi.value})`);
    }
    if (indicators.ema && indicators.ema.crossover !== 'NONE') {
      reasons.push(
        indicators.ema.crossover === 'BULLISH_CROSS'
          ? 'EMA Golden Cross (Bullish Crossover)'
          : 'EMA Death Cross (Bearish Crossover)'
      );
    }
    if (indicators.macd && indicators.macd.crossover !== 'NONE') {
      reasons.push(
        indicators.macd.crossover === 'BULLISH_CROSS'
          ? 'MACD Bullish Histogram Crossover'
          : 'MACD Bearish Histogram Crossover'
      );
    }
    if (indicators.bb?.isSqueezed) {
      reasons.push('Bollinger Bands Volatility Squeeze Detected');
    }
    if (indicators.sar?.reversal) {
      reasons.push(`Parabolic SAR Trend Reversal (${indicators.sar.trend})`);
    }

    if (reasons.length === 0) {
      reasons.push('Consolidation / Neutral Market Conditions');
    }

    // Default fallback ATR distance (~1.5% of price if ATR not ready)
    const atrValue = indicators.atr?.atr || currentPrice * 0.015;
    const multSL = settings.indicatorParams.atr.multiplierSL || 1.5;
    const multTP = settings.indicatorParams.atr.multiplierTP || 2.5;

    const stopDistance = atrValue * multSL;
    const tpDistance = atrValue * multTP;

    let stopLoss = 0;
    let takeProfit1 = 0;
    let takeProfit2 = 0;
    let takeProfit3 = 0;
    let suggestedLeverage = 1;

    if (isLong) {
      // Find nearest support below price for SL refinement
      const nearestSupport = srLevels.find((s) => s.type === 'SUPPORT' && s.price < currentPrice);
      stopLoss = nearestSupport ? Math.min(nearestSupport.price * 0.995, currentPrice - stopDistance) : currentPrice - stopDistance;

      // Resistance targets
      const nearestRes = srLevels.find((r) => r.type === 'RESISTANCE' && r.price > currentPrice);
      takeProfit1 = nearestRes ? nearestRes.price : currentPrice + tpDistance * 0.7;
      takeProfit2 = currentPrice + tpDistance * 1.3;
      takeProfit3 = currentPrice + tpDistance * 2.0;

      suggestedLeverage = confidence === 'HIGH' ? 5 : confidence === 'MEDIUM' ? 3 : 2;
    } else if (isShort) {
      // Find nearest resistance above price for SL refinement
      const nearestResistance = srLevels.find((r) => r.type === 'RESISTANCE' && r.price > currentPrice);
      stopLoss = nearestResistance ? Math.max(nearestResistance.price * 1.005, currentPrice + stopDistance) : currentPrice + stopDistance;

      // Support targets
      const nearestSup = srLevels.find((s) => s.type === 'SUPPORT' && s.price < currentPrice);
      takeProfit1 = nearestSup ? nearestSup.price : currentPrice - tpDistance * 0.7;
      takeProfit2 = currentPrice - tpDistance * 1.3;
      takeProfit3 = currentPrice - tpDistance * 2.0;

      suggestedLeverage = confidence === 'HIGH' ? 5 : confidence === 'MEDIUM' ? 3 : 2;
    } else {
      stopLoss = currentPrice - stopDistance;
      takeProfit1 = currentPrice + tpDistance;
      takeProfit2 = currentPrice + tpDistance * 1.5;
      takeProfit3 = currentPrice + tpDistance * 2.0;
      suggestedLeverage = 1;
    }

    const risk = Math.abs(currentPrice - stopLoss);
    const reward = Math.abs(takeProfit1 - currentPrice);
    const riskRewardRatio = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 1;

    return {
      type,
      entryPrice: Math.round(currentPrice * 100) / 100,
      stopLoss: Math.round(stopLoss * 100) / 100,
      takeProfit1: Math.round(takeProfit1 * 100) / 100,
      takeProfit2: Math.round(takeProfit2 * 100) / 100,
      takeProfit3: Math.round(takeProfit3 * 100) / 100,
      riskRewardRatio,
      suggestedLeverage,
      confidence,
      reasons
    };
  }

  /**
   * Scan candle history to detect precise Buy & Sell pivot markers for chart visualization
   */
  public static generateHistoricalMarkers(
    candles: KlineCandle[],
    settings: UserSettings
  ): ChartSignalMarker[] {
    if (!candles || candles.length < 30) return [];

    const markers: ChartSignalMarker[] = [];
    const closes = candles.map((c) => c.close);
    const fastPeriod = settings.indicatorParams.ema.fast || 20;
    const slowPeriod = settings.indicatorParams.ema.slow || 50;

    // Precalculate EMA series
    const fastEma = calculateEMASeries(closes, fastPeriod);
    const slowEma = calculateEMASeries(closes, slowPeriod);
    const offset = slowPeriod - fastPeriod;

    let lastMarkerIndex = -10;
    const minDistanceBetweenMarkers = 6; // minimum 6 bars between signals to avoid clutter

    for (let i = 30; i < candles.length; i++) {
      if (i - lastMarkerIndex < minDistanceBetweenMarkers) continue;

      const currentCandle = candles[i];
      const prevCandle = candles[i - 1];

      // 1. EMA Crossover
      const slowIdx = i - (slowPeriod - 1);
      const prevSlowIdx = slowIdx - 1;
      let emaBuy = false;
      let emaSell = false;

      if (slowIdx >= 1 && slowIdx < slowEma.length) {
        const curFast = fastEma[slowIdx + offset];
        const prevFast = fastEma[prevSlowIdx + offset];
        const curSlow = slowEma[slowIdx];
        const prevSlow = slowEma[prevSlowIdx];

        if (prevFast <= prevSlow && curFast > curSlow) emaBuy = true;
        if (prevFast >= prevSlow && curFast < curSlow) emaSell = true;
      }

      // 2. RSI Extreme Reversal
      const windowCloses = closes.slice(0, i + 1);
      const rsiResult = calculateRSI(windowCloses, 14);
      const prevRsiResult = calculateRSI(closes.slice(0, i), 14);

      const rsiBuy = (prevRsiResult.value ?? 50) <= 30 && (rsiResult.value ?? 50) > 30;
      const rsiSell = (prevRsiResult.value ?? 50) >= 70 && (rsiResult.value ?? 50) < 70;

      // 3. Price breakout candle
      const isStrongBullCandle = currentCandle.close > currentCandle.open && currentCandle.close > prevCandle.high;
      const isStrongBearCandle = currentCandle.close < currentCandle.open && currentCandle.close < prevCandle.low;

      if ((emaBuy || rsiBuy) && isStrongBullCandle) {
        markers.push({
          index: i,
          time: currentCandle.openTime,
          price: currentCandle.low,
          type: emaBuy && rsiBuy ? 'STRONG_BUY' : 'BUY',
          reason: emaBuy ? 'EMA Bullish Cross' : 'RSI Oversold Bounce'
        });
        lastMarkerIndex = i;
      } else if ((emaSell || rsiSell) && isStrongBearCandle) {
        markers.push({
          index: i,
          time: currentCandle.openTime,
          price: currentCandle.high,
          type: emaSell && rsiSell ? 'STRONG_SELL' : 'SELL',
          reason: emaSell ? 'EMA Bearish Cross' : 'RSI Overbought Drop'
        });
        lastMarkerIndex = i;
      }
    }

    return markers;
  }
}
