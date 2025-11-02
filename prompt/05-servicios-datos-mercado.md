# Prompt 5: Servicios de Datos de Mercado y APIs

## Objetivo
Implementar los servicios para obtener datos de mercado en tiempo real y simulados, gestionar conexiones WebSocket, y manejar múltiples fuentes de datos.

## Servicio Base de Datos (src/services/api/baseDataService.ts)

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiError } from '@/types';

export abstract class BaseDataService {
  protected client: AxiosInstance;
  protected baseURL: string;
  protected apiKey?: string;
  
  constructor(config: {
    baseURL: string;
    apiKey?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
        ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {})
      }
    });
    
    this.setupInterceptors();
  }
  
  protected setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Log requests en desarrollo
        if (import.meta.env.DEV) {
          console.log(`[${this.constructor.name}] Request:`, {
            method: config.method,
            url: config.url,
            params: config.params
          });
        }
        return config;
      },
      (error) => {
        console.error(`[${this.constructor.name}] Request Error:`, error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Retry logic para errores de rate limit
        if (error.response?.status === 429 && !originalRequest._retry) {
          originalRequest._retry = true;
          const retryAfter = parseInt(error.response.headers['retry-after'] || '1');
          
          await this.delay(retryAfter * 1000);
          return this.client(originalRequest);
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  protected handleError(error: any): ApiError {
    if (error.response) {
      // Error de respuesta del servidor
      return {
        code: error.response.data?.code || error.response.status.toString(),
        message: error.response.data?.message || error.message,
        details: error.response.data
      };
    } else if (error.request) {
      // Error de red
      return {
        code: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor',
        details: error.message
      };
    }
    
    // Error de configuración
    return {
      code: 'CLIENT_ERROR',
      message: error.message,
      details: error
    };
  }
  
  protected async makeRequest<T>(
    config: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<T>(config);
      return {
        success: true,
        data: response.data,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error,
        timestamp: new Date()
      };
    }
  }
  
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  abstract healthCheck(): Promise<boolean>;
}
```

## Servicio de Datos de Mercado (src/services/api/marketData.ts)

```typescript
import { BaseDataService } from './baseDataService';
import type { 
  Asset, 
  MarketData, 
  Ticker, 
  OrderBook,
  Candlestick,
  Timeframe 
} from '@/types';

export interface MarketDataProvider {
  getAssets(): Promise<Asset[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;
  getCandles(
    symbol: string, 
    timeframe: Timeframe, 
    limit?: number
  ): Promise<Candlestick[]>;
  getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    timeframe: Timeframe
  ): Promise<Candlestick[]>;
}

// Implementación para Binance (Crypto)
export class BinanceDataService extends BaseDataService implements MarketDataProvider {
  constructor() {
    super({
      baseURL: 'https://api.binance.com/api/v3',
      timeout: 5000
    });
  }
  
  async getAssets(): Promise<Asset[]> {
    const response = await this.makeRequest<any[]>({
      method: 'GET',
      url: '/exchangeInfo'
    });
    
    if (!response.success || !response.data) {
      throw new Error('Failed to fetch assets');
    }
    
    // Filtrar solo USDT pairs
    const symbols = response.data.symbols
      .filter((s: any) => s.quoteAsset === 'USDT' && s.status === 'TRADING')
      .slice(0, 20); // Limitar a 20 activos principales
    
    const assets: Asset[] = [];
    
    for (const symbol of symbols) {
      const ticker = await this.getTicker(symbol.symbol);
      assets.push({
        symbol: symbol.symbol,
        name: `${symbol.baseAsset}/${symbol.quoteAsset}`,
        type: 'crypto',
        exchange: 'Binance',
        currentPrice: ticker.lastPrice,
        priceChange24h: ticker.change,
        volume24h: ticker.volume,
        lastUpdate: new Date()
      });
    }
    
    return assets;
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const response = await this.makeRequest<any>({
      method: 'GET',
      url: '/ticker/24hr',
      params: { symbol }
    });
    
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch ticker for ${symbol}`);
    }
    
    const data = response.data;
    
    return {
      symbol,
      lastPrice: parseFloat(data.lastPrice),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      openPrice: parseFloat(data.openPrice),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteVolume: parseFloat(data.quoteVolume),
      openTime: new Date(data.openTime),
      closeTime: new Date(data.closeTime),
      change: parseFloat(data.priceChange),
      changePercent: parseFloat(data.priceChangePercent)
    };
  }
  
  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const response = await this.makeRequest<any>({
      method: 'GET',
      url: '/depth',
      params: { symbol, limit: depth }
    });
    
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch order book for ${symbol}`);
    }
    
    const data = response.data;
    
    const bids = data.bids.map(([price, qty]: string[]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
      total: parseFloat(price) * parseFloat(qty)
    }));
    
    const asks = data.asks.map(([price, qty]: string[]) => ({
      price: parseFloat(price),
      quantity: parseFloat(qty),
      total: parseFloat(price) * parseFloat(qty)
    }));
    
    const spread = asks[0].price - bids[0].price;
    const midPrice = (asks[0].price + bids[0].price) / 2;
    
    return {
      symbol,
      timestamp: new Date(),
      bids,
      asks,
      spread,
      midPrice
    };
  }
  
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 100
  ): Promise<Candlestick[]> {
    const response = await this.makeRequest<any[]>({
      method: 'GET',
      url: '/klines',
      params: {
        symbol,
        interval: this.mapTimeframe(timeframe),
        limit
      }
    });
    
    if (!response.success || !response.data) {
      throw new Error(`Failed to fetch candles for ${symbol}`);
    }
    
    return response.data.map((candle: any[]) => ({
      symbol,
      timestamp: new Date(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      timeframe
    }));
  }
  
  async getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    timeframe: Timeframe
  ): Promise<Candlestick[]> {
    const candles: Candlestick[] = [];
    const interval = this.getIntervalMs(timeframe);
    const limit = 1000; // Binance limit
    
    let currentTime = from.getTime();
    
    while (currentTime < to.getTime()) {
      const response = await this.makeRequest<any[]>({
        method: 'GET',
        url: '/klines',
        params: {
          symbol,
          interval: this.mapTimeframe(timeframe),
          startTime: currentTime,
          endTime: Math.min(currentTime + interval * limit, to.getTime()),
          limit
        }
      });
      
      if (response.success && response.data) {
        const batchCandles = response.data.map((candle: any[]) => ({
          symbol,
          timestamp: new Date(candle[0]),
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
          timeframe
        }));
        
        candles.push(...batchCandles);
        
        if (batchCandles.length < limit) {
          break; // No hay más datos
        }
        
        currentTime = batchCandles[batchCandles.length - 1].timestamp.getTime() + interval;
      } else {
        break;
      }
      
      // Rate limiting
      await this.delay(200);
    }
    
    return candles;
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest({
        method: 'GET',
        url: '/ping'
      });
      return response.success;
    } catch {
      return false;
    }
  }
  
  private mapTimeframe(timeframe: Timeframe): string {
    const mapping: Record<Timeframe, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
      '1M': '1M'
    };
    return mapping[timeframe];
  }
  
  private getIntervalMs(timeframe: Timeframe): number {
    const intervals: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    return intervals[timeframe];
  }
}

// Simulador de Datos (para desarrollo/testing)
export class SimulatedDataService extends BaseDataService implements MarketDataProvider {
  private assets: Map<string, Asset>;
  private priceGenerators: Map<string, PriceGenerator>;
  
  constructor() {
    super({
      baseURL: 'http://localhost:3000',
      timeout: 1000
    });
    
    this.assets = new Map();
    this.priceGenerators = new Map();
    this.initializeAssets();
  }
  
  private initializeAssets(): void {
    const cryptoAssets = [
      { symbol: 'BTCUSDT', name: 'Bitcoin/USDT', price: 45000, volatility: 0.02 },
      { symbol: 'ETHUSDT', name: 'Ethereum/USDT', price: 2500, volatility: 0.025 },
      { symbol: 'BNBUSDT', name: 'Binance Coin/USDT', price: 300, volatility: 0.03 },
      { symbol: 'ADAUSDT', name: 'Cardano/USDT', price: 0.5, volatility: 0.035 },
      { symbol: 'SOLUSDT', name: 'Solana/USDT', price: 100, volatility: 0.04 }
    ];
    
    const stockAssets = [
      { symbol: 'AAPL', name: 'Apple Inc.', price: 150, volatility: 0.015 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2800, volatility: 0.018 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', price: 300, volatility: 0.016 },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 800, volatility: 0.04 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 3300, volatility: 0.02 }
    ];
    
    [...cryptoAssets, ...stockAssets].forEach(assetData => {
      const asset: Asset = {
        symbol: assetData.symbol,
        name: assetData.name,
        type: assetData.symbol.includes('USDT') ? 'crypto' : 'stock',
        exchange: assetData.symbol.includes('USDT') ? 'Binance' : 'NASDAQ',
        currentPrice: assetData.price,
        priceChange24h: 0,
        volume24h: Math.random() * 1000000000,
        lastUpdate: new Date()
      };
      
      this.assets.set(asset.symbol, asset);
      this.priceGenerators.set(
        asset.symbol, 
        new PriceGenerator(assetData.price, assetData.volatility)
      );
    });
  }
  
  async getAssets(): Promise<Asset[]> {
    // Actualizar precios antes de devolver
    this.assets.forEach((asset, symbol) => {
      const generator = this.priceGenerators.get(symbol)!;
      const newPrice = generator.getNextPrice();
      const oldPrice = asset.currentPrice;
      
      asset.currentPrice = newPrice;
      asset.priceChange24h = newPrice - oldPrice;
      asset.lastUpdate = new Date();
    });
    
    return Array.from(this.assets.values());
  }
  
  async getTicker(symbol: string): Promise<Ticker> {
    const asset = this.assets.get(symbol);
    if (!asset) {
      throw new Error(`Asset ${symbol} not found`);
    }
    
    const generator = this.priceGenerators.get(symbol)!;
    const currentPrice = generator.getNextPrice();
    const spread = currentPrice * 0.001; // 0.1% spread
    
    return {
      symbol,
      lastPrice: currentPrice,
      bidPrice: currentPrice - spread / 2,
      askPrice: currentPrice + spread / 2,
      openPrice: generator.basePrice,
      highPrice: generator.dayHigh,
      lowPrice: generator.dayLow,
      volume: Math.random() * 100000000,
      quoteVolume: Math.random() * 50000000,
      openTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      closeTime: new Date(),
      change: currentPrice - generator.basePrice,
      changePercent: ((currentPrice - generator.basePrice) / generator.basePrice) * 100
    };
  }
  
  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBook> {
    const ticker = await this.getTicker(symbol);
    const midPrice = (ticker.bidPrice + ticker.askPrice) / 2;
    
    // Generar orden book simulado
    const bids: any[] = [];
    const asks: any[] = [];
    
    for (let i = 0; i < depth; i++) {
      const bidPrice = midPrice - (i + 1) * 0.01 * midPrice;
      const askPrice = midPrice + (i + 1) * 0.01 * midPrice;
      
      bids.push({
        price: bidPrice,
        quantity: Math.random() * 10,
        total: bidPrice * Math.random() * 10
      });
      
      asks.push({
        price: askPrice,
        quantity: Math.random() * 10,
        total: askPrice * Math.random() * 10
      });
    }
    
    return {
      symbol,
      timestamp: new Date(),
      bids,
      asks,
      spread: asks[0].price - bids[0].price,
      midPrice
    };
  }
  
  async getCandles(
    symbol: string,
    timeframe: Timeframe,
    limit: number = 100
  ): Promise<Candlestick[]> {
    const generator = this.priceGenerators.get(symbol);
    if (!generator) {
      throw new Error(`Asset ${symbol} not found`);
    }
    
    const intervalMs = this.getIntervalMs(timeframe);
    const candles: Candlestick[] = [];
    const now = Date.now();
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs);
      const { open, high, low, close, volume } = generator.generateCandle();
      
      candles.push({
        symbol,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        timeframe
      });
    }
    
    return candles;
  }
  
  async getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
    timeframe: Timeframe
  ): Promise<Candlestick[]> {
    // Para simulación, generar datos sintéticos
    const intervalMs = this.getIntervalMs(timeframe);
    const candles: Candlestick[] = [];
    let currentTime = from.getTime();
    
    const generator = this.priceGenerators.get(symbol);
    if (!generator) {
      throw new Error(`Asset ${symbol} not found`);
    }
    
    while (currentTime < to.getTime()) {
      const timestamp = new Date(currentTime);
      const { open, high, low, close, volume } = generator.generateCandle();
      
      candles.push({
        symbol,
        timestamp,
        open,
        high,
        low,
        close,
        volume,
        timeframe
      });
      
      currentTime += intervalMs;
    }
    
    return candles;
  }
  
  async healthCheck(): Promise<boolean> {
    return true; // Siempre saludable en simulación
  }
  
  private getIntervalMs(timeframe: Timeframe): number {
    const intervals: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    return intervals[timeframe];
  }
}

// Generador de precios para simulación
class PriceGenerator {
  basePrice: number;
  volatility: number;
  currentPrice: number;
  trend: number;
  dayHigh: number;
  dayLow: number;
  
  constructor(basePrice: number, volatility: number) {
    this.basePrice = basePrice;
    this.volatility = volatility;
    this.currentPrice = basePrice;
    this.trend = 0;
    this.dayHigh = basePrice;
    this.dayLow = basePrice;
  }
  
  getNextPrice(): number {
    // Random walk con tendencia
    const random = Math.random() - 0.5;
    const change = this.currentPrice * this.volatility * random;
    
    // Añadir tendencia suave
    this.trend = this.trend * 0.9 + random * 0.1;
    const trendComponent = this.currentPrice * this.trend * this.volatility * 0.5;
    
    this.currentPrice = Math.max(
      this.basePrice * 0.5,
      Math.min(this.basePrice * 2, this.currentPrice + change + trendComponent)
    );
    
    // Actualizar high/low
    this.dayHigh = Math.max(this.dayHigh, this.currentPrice);
    this.dayLow = Math.min(this.dayLow, this.currentPrice);
    
    return this.currentPrice;
  }
  
  generateCandle(): {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } {
    const open = this.currentPrice;
    const movements = Array.from({ length: 4 }, () => this.getNextPrice());
    const high = Math.max(open, ...movements);
    const low = Math.min(open, ...movements);
    const close = movements[movements.length - 1];
    
    return {
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000 * (high - low) / open
    };
  }
}
```

## Gestor de Fuentes de Datos (src/services/api/dataManager.ts)

```typescript
import { BinanceDataService } from './marketData';
import { SimulatedDataService } from './marketData';
import type { MarketDataProvider } from './marketData';
import type { Asset, AssetType } from '@/types';

export class DataManager {
  private providers: Map<string, MarketDataProvider>;
  private activeProvider: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTimeout: number = 5000; // 5 segundos
  
  constructor() {
    this.providers = new Map();
    this.cache = new Map();
    this.activeProvider = 'simulated';
    
    this.initializeProviders();
  }
  
  private initializeProviders(): void {
    // Inicializar proveedores
    this.providers.set('binance', new BinanceDataService());
    this.providers.set('simulated', new SimulatedDataService());
    
    // Añadir más proveedores según necesidad
    // this.providers.set('alpaca', new AlpacaDataService());
    // this.providers.set('yahoo', new YahooFinanceService());
  }
  
  setActiveProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not found`);
    }
    this.activeProvider = providerName;
    this.clearCache();
  }
  
  getProvider(): MarketDataProvider {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Active provider ${this.activeProvider} not found`);
    }
    return provider;
  }
  
  async getAssets(type?: AssetType): Promise<Asset[]> {
    const cacheKey = `assets_${type || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const assets = await this.getProvider().getAssets();
    const filtered = type 
      ? assets.filter(a => a.type === type)
      : assets;
    
    this.setCache(cacheKey, filtered);
    return filtered;
  }
  
  async getAssetsBySymbols(symbols: string[]): Promise<Asset[]> {
    const allAssets = await this.getAssets();
    return allAssets.filter(a => symbols.includes(a.symbol));
  }
  
  // Método para obtener datos de múltiples proveedores y combinarlos
  async getAggregatedData(symbol: string): Promise<{
    prices: Map<string, number>;
    consensus: number;
  }> {
    const prices = new Map<string, number>();
    const priceValues: number[] = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const ticker = await provider.getTicker(symbol);
        prices.set(name, ticker.lastPrice);
        priceValues.push(ticker.lastPrice);
      } catch (error) {
        console.error(`Error getting price from ${name}:`, error);
      }
    }
    
    // Calcular precio consenso (mediana)
    const consensus = this.calculateMedian(priceValues);
    
    return { prices, consensus };
  }
  
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  private clearCache(): void {
    this.cache.clear();
  }
  
  // Health check para todos los proveedores
  async checkProvidersHealth(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();
    
    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        health.set(name, isHealthy);
      } catch {
        health.set(name, false);
      }
    }
    
    return health;
  }
}

// Singleton
export const dataManager = new DataManager();
```

## Siguiente Paso
El próximo prompt implementará el sistema de WebSocket para actualizaciones en tiempo real y la gestión de órdenes.
