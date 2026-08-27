import { KlineCandle, RawBinanceKline, OrderBookData, OrderBookEntry, Timeframe } from '../types/binance';

export class BinanceApiService {
  private static readonly SPOT_BASE_URL = 'https://api.binance.com/api/v3';
  private static readonly FUTURES_BASE_URL = 'https://fapi.binance.com/fapi/v1';

  /**
   * Fetch Klines (Candlestick data)
   */
  public static async fetchKlines(
    symbol: string,
    interval: Timeframe = '4h',
    limit: number = 200,
    isFutures: boolean = false
  ): Promise<KlineCandle[]> {
    const baseUrl = isFutures ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL;
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `${baseUrl}/klines?symbol=${cleanSymbol}&interval=${interval}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        // If futures failed, try spot fallback
        if (isFutures) {
          return this.fetchKlines(symbol, interval, limit, false);
        }
        throw new Error(`Binance API Error: ${response.status} ${response.statusText}`);
      }

      const rawData: RawBinanceKline[] = await response.json();
      return rawData.map((kline) => ({
        openTime: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        closeTime: kline[6]
      }));
    } catch (error) {
      console.error('[BinanceApiService] Failed to fetch klines:', error);
      return [];
    }
  }

  /**
   * Fetch 24hr Ticker Price Change Statistics
   */
  public static async fetch24hrTicker(
    symbol: string,
    isFutures: boolean = false
  ): Promise<{ priceChangePercent: number; lastPrice: number } | null> {
    const baseUrl = isFutures ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL;
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `${baseUrl}/ticker/24hr?symbol=${cleanSymbol}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      return {
        priceChangePercent: parseFloat(data.priceChangePercent),
        lastPrice: parseFloat(data.lastPrice)
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch Order Book Depth data
   */
  public static async fetchOrderBook(
    symbol: string,
    limit: number = 100,
    isFutures: boolean = false
  ): Promise<OrderBookData | null> {
    const baseUrl = isFutures ? this.FUTURES_BASE_URL : this.SPOT_BASE_URL;
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const url = `${baseUrl}/depth?symbol=${cleanSymbol}&limit=${limit}`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const bids: OrderBookEntry[] = (data.bids || []).map((b: [string, string]) => ({
        price: parseFloat(b[0]),
        quantity: parseFloat(b[1])
      }));

      const asks: OrderBookEntry[] = (data.asks || []).map((a: [string, string]) => ({
        price: parseFloat(a[0]),
        quantity: parseFloat(a[1])
      }));

      if (bids.length === 0 || asks.length === 0) return null;

      const totalBidVolume = bids.reduce((acc, b) => acc + b.quantity, 0);
      const totalAskVolume = asks.reduce((acc, a) => acc + a.quantity, 0);

      const totalBidValue = bids.reduce((acc, b) => acc + b.price * b.quantity, 0);
      const totalAskValue = asks.reduce((acc, a) => acc + a.price * a.quantity, 0);

      const volumeRatio = totalAskVolume > 0 ? totalBidVolume / totalAskVolume : 1;
      const valueRatio = totalAskValue > 0 ? totalBidValue / totalAskValue : 1;
      const bidAskRatio = Math.round(((volumeRatio + valueRatio) / 2) * 100) / 100;

      let pressure: OrderBookData['pressure'] = 'NEUTRAL';
      if (bidAskRatio >= 1.2) pressure = 'BUY_PRESSURE';
      else if (bidAskRatio <= 0.8) pressure = 'SELL_PRESSURE';

      const spread = asks[0].price - bids[0].price;
      const spreadPercent = bids[0].price > 0 ? (spread / bids[0].price) * 100 : 0;

      return {
        bids: bids.slice(0, 10),
        asks: asks.slice(0, 10),
        bidAskRatio,
        pressure,
        totalBidVolume: Math.round(totalBidVolume * 100) / 100,
        totalAskVolume: Math.round(totalAskVolume * 100) / 100,
        totalBidValue: Math.round(totalBidValue),
        totalAskValue: Math.round(totalAskValue),
        spread: Math.round(spread * 100) / 100,
        spreadPercent: Math.round(spreadPercent * 1000) / 1000
      };
    } catch (error) {
      console.error('[BinanceApiService] Failed to fetch depth:', error);
      return null;
    }
  }
}
