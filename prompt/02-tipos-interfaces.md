# Prompt 2: Tipos e Interfaces TypeScript

## Objetivo
Definir todos los tipos e interfaces TypeScript necesarios para el sistema de trading, asegurando type safety en toda la aplicación.

## Tipos de Trading (src/types/trading.ts)

```typescript
import { Decimal } from 'decimal.js';

// Tipos base
export type AssetType = 'crypto' | 'stock';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type PositionSide = 'long' | 'short';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';
export type PositionStatus = 'open' | 'closed' | 'liquidated';

// Interfaz para un activo tradeable
export interface Asset {
  symbol: string;
  name: string;
  type: AssetType;
  exchange: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap?: number;
  lastUpdate: Date;
}

// Interfaz para una orden
export interface Order {
  id: string;
  aiTraderId: string;
  assetSymbol: string;
  side: PositionSide;
  type: OrderType;
  quantity: number;
  price: number;
  stopPrice?: number;
  limitPrice?: number;
  status: OrderStatus;
  createdAt: Date;
  filledAt?: Date;
  filledPrice?: number;
  commission: number;
  slippage: number;
}

// Interfaz para una posición
export interface Position {
  id: string;
  orderId: string;
  aiTraderId: string;
  asset: Asset;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  status: PositionStatus;
  openedAt: Date;
  closedAt?: Date;
  exitPrice?: number;
  
  // Métricas calculadas
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  commission: number;
  holdingTime?: number; // en minutos
  
  // Risk metrics
  riskAmount: number; // Cantidad en riesgo
  rewardAmount: number; // Ganancia potencial
  riskRewardRatio: number;
  
  // Progress indicators
  slProgress: number; // % hacia stop loss
  tpProgress: number; // % hacia take profit
  currentProgress: number; // % posición actual
}

// Interfaz para análisis de trading
export interface TradeAnalysis {
  id: string;
  aiTraderId: string;
  timestamp: Date;
  assetSymbol: string;
  strategy: TradingStrategy;
  signal: TradeSignal;
  confidence: number; // 0-100
  reasoning: string;
  technicalIndicators: TechnicalIndicators;
  marketConditions: MarketConditions;
  riskAssessment: RiskAssessment;
}

// Señales de trading
export interface TradeSignal {
  action: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  suggestedEntry?: number;
  suggestedStopLoss?: number;
  suggestedTakeProfit?: number;
  suggestedPositionSize?: number;
}

// Indicadores técnicos
export interface TechnicalIndicators {
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  movingAverages?: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema20: number;
  };
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
  volume?: {
    current: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  support?: number;
  resistance?: number;
}

// Condiciones del mercado
export interface MarketConditions {
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'high' | 'medium' | 'low';
  momentum: 'strong' | 'moderate' | 'weak';
  marketPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown';
}

// Evaluación de riesgo
export interface RiskAssessment {
  riskLevel: 'high' | 'medium' | 'low';
  maxDrawdown: number;
  volatilityRisk: number;
  liquidityRisk: number;
  correlationRisk: number;
  overallScore: number; // 0-100
}

// Estrategias de trading
export type TradingStrategy = 
  | 'momentum'
  | 'meanRevert'
  | 'breakout'
  | 'rangeTrading'
  | 'trendFollowing'
  | 'scalping'
  | 'swingTrading'
  | 'arbitrage';

// Historial de trades
export interface TradeHistory {
  position: Position;
  orders: Order[];
  analysis: TradeAnalysis;
  performance: TradePerformance;
}

// Performance de un trade
export interface TradePerformance {
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingTime: number;
  maxDrawdown: number;
  maxProfit: number;
  efficiency: number; // 0-100
}

// Configuración de comisiones
export interface CommissionStructure {
  type: 'percentage' | 'fixed' | 'tiered';
  rate: number;
  minimumCharge?: number;
  tierBreakpoints?: Array<{
    volume: number;
    rate: number;
  }>;
}

// Stop Loss y Take Profit
export interface StopLossConfig {
  type: 'percentage' | 'fixed' | 'atr' | 'support';
  value: number;
  trailingStop?: boolean;
  trailingStopDistance?: number;
}

export interface TakeProfitConfig {
  type: 'percentage' | 'fixed' | 'resistance' | 'risk_reward';
  value: number;
  partialTakeProfit?: Array<{
    percentage: number;
    atProfit: number;
  }>;
}
```

## Tipos de IA (src/types/ai.ts)

```typescript
import { TradingStrategy, Position, TradeHistory } from './trading';

// Perfiles de IA
export interface AIProfile {
  id: AITraderId;
  name: string;
  avatar: string;
  personality: AIPersonality;
  tradingStyle: TradingStyle;
  riskProfile: RiskProfile;
  preferences: TradingPreferences;
  performance: AIPerformance;
}

export type AITraderId = 'grok' | 'claude' | 'chatgpt' | 'gemini';

// Personalidad de la IA
export interface AIPersonality {
  description: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  decisionMaking: 'aggressive' | 'conservative' | 'balanced' | 'adaptive';
}

// Estilo de trading
export interface TradingStyle {
  primaryStrategies: TradingStrategy[];
  timeframe: 'scalping' | 'day_trading' | 'swing' | 'position';
  preferredAssets: Array<'crypto' | 'tech_stocks' | 'blue_chips' | 'commodities'>;
  technicalVsFundamental: number; // 0-100 (0 = solo fundamental, 100 = solo técnico)
}

// Perfil de riesgo
export interface RiskProfile {
  riskTolerance: 'low' | 'medium' | 'high' | 'dynamic';
  maxPositionSize: number; // % del capital
  maxDrawdown: number; // % máximo de pérdida
  maxOpenPositions: number;
  useStopLoss: boolean;
  useTakeProfit: boolean;
  pyramiding: boolean; // Añadir a posiciones ganadoras
  hedging: boolean; // Abrir posiciones opuestas
}

// Preferencias de trading
export interface TradingPreferences {
  favoritePatterns: string[];
  avoidPatterns: string[];
  marketHours: 'all' | 'regular' | 'extended';
  newsTrading: boolean;
  earningsTrading: boolean;
  correlationAware: boolean;
}

// Performance de la IA
export interface AIPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  currentStreak: {
    type: 'winning' | 'losing';
    count: number;
  };
  bestTrade: {
    symbol: string;
    pnl: number;
    date: Date;
  };
  worstTrade: {
    symbol: string;
    pnl: number;
    date: Date;
  };
}

// Estado del trader IA
export interface AITraderState {
  id: AITraderId;
  profile: AIProfile;
  balance: number;
  initialBalance: number;
  availableBalance: number;
  marginUsed: number;
  openPositions: Position[];
  pendingOrders: Order[];
  tradeHistory: TradeHistory[];
  currentAnalysis: TradeAnalysis | null;
  isActive: boolean;
  lastActivity: Date;
  
  // Métricas en tiempo real
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalPnL: number;
  currentEquity: number;
  marginLevel: number;
}

// Decisiones de la IA
export interface AIDecision {
  aiTraderId: AITraderId;
  timestamp: Date;
  decision: 'open_long' | 'open_short' | 'close_position' | 'hold' | 'adjust_position';
  targetAsset?: string;
  targetPositionId?: string;
  reasoning: string;
  confidence: number;
  alternativeActions: Array<{
    action: string;
    confidence: number;
    reasoning: string;
  }>;
}

// Estado mental de la IA (para simular comportamiento más realista)
export interface AIMarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral' | 'uncertain';
  fearGreedIndex: number; // 0-100
  confidenceLevel: number; // 0-100
  recentPerformanceImpact: number; // -100 a 100
  marketStress: number; // 0-100
}
```

## Tipos de Mercado (src/types/market.ts)

```typescript
// Datos de mercado
export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  bid?: number;
  ask?: number;
  spread?: number;
}

// Candlestick data
export interface Candlestick extends MarketData {
  timeframe: Timeframe;
}

export type Timeframe = 
  | '1m' | '5m' | '15m' | '30m' 
  | '1h' | '4h' | '1d' | '1w' | '1M';

// Order book
export interface OrderBook {
  symbol: string;
  timestamp: Date;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

// Ticker
export interface Ticker {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  openTime: Date;
  closeTime: Date;
  change: number;
  changePercent: number;
}

// Eventos de mercado
export interface MarketEvent {
  id: string;
  type: 'news' | 'earnings' | 'economic' | 'technical';
  importance: 'high' | 'medium' | 'low';
  timestamp: Date;
  title: string;
  description: string;
  affectedAssets: string[];
  expectedImpact: 'positive' | 'negative' | 'neutral';
  actualImpact?: 'positive' | 'negative' | 'neutral';
}

// Estado del mercado
export interface MarketState {
  isOpen: boolean;
  nextOpen?: Date;
  nextClose?: Date;
  currentSession: 'pre-market' | 'regular' | 'after-hours' | 'closed';
  holidays: MarketHoliday[];
}

export interface MarketHoliday {
  date: Date;
  name: string;
  markets: string[];
}

// Datos de websocket
export interface WebSocketMessage {
  type: 'price' | 'trade' | 'orderbook' | 'news' | 'alert';
  data: any;
  timestamp: Date;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: Date;
  volume?: number;
}

export interface TradeUpdate {
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: Date;
}

// Configuración de feeds de datos
export interface DataFeedConfig {
  provider: 'binance' | 'alpaca' | 'yahoo' | 'simulated';
  apiKey?: string;
  apiSecret?: string;
  testMode: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}
```

## Tipos de Utilidades (src/types/utils.ts)

```typescript
// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Filters
export interface TradeFilters {
  aiTraderId?: string;
  symbol?: string;
  status?: PositionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minPnL?: number;
  maxPnL?: number;
}

// Notifications
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  aiTraderId?: string;
  relatedEntity?: {
    type: 'trade' | 'position' | 'analysis';
    id: string;
  };
}

// Settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr' | 'de';
  timezone: string;
  dateFormat: string;
  numberFormat: {
    decimals: number;
    thousandsSeparator: string;
    decimalSeparator: string;
  };
  notifications: {
    trades: boolean;
    analysis: boolean;
    marketEvents: boolean;
    systemAlerts: boolean;
  };
  simulation: {
    speed: number; // 1x, 2x, 5x, 10x
    startDate?: Date;
    endDate?: Date;
    initialBalance: number;
    commissionRate: number;
  };
}
```

## Uso de los Tipos

```typescript
// Ejemplo de uso en un componente
import type { AITraderState, Position, TradeAnalysis } from '@/types';

// En stores
import { defineStore } from 'pinia';
import type { AITraderState } from '@/types/ai';

export const useAITraderStore = defineStore('aiTrader', {
  state: (): { traders: Record<string, AITraderState> } => ({
    traders: {}
  })
});
```

## Siguiente Paso
El próximo prompt se centrará en implementar las funciones de cálculo: PnL, comisiones, métricas de rendimiento, etc.
