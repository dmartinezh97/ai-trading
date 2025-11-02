# Prompt 3: Funciones de Cálculo Financiero

## Objetivo
Implementar todas las funciones necesarias para calcular PnL, comisiones, métricas de rendimiento y gestión de riesgo.

## Cálculos de PnL (src/utils/calculations/pnl.ts)

```typescript
import Decimal from 'decimal.js';
import type { Position, PositionSide, Order } from '@/types/trading';

// Configurar Decimal.js para precisión financiera
Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calcula el PnL no realizado de una posición abierta
 */
export function calculateUnrealizedPnL(
  position: Position,
  currentPrice: number,
  includeCommission: boolean = true
): {
  pnl: number;
  pnlPercent: number;
  pnlPerShare: number;
} {
  const entry = new Decimal(position.entryPrice);
  const current = new Decimal(currentPrice);
  const quantity = new Decimal(position.quantity);
  
  let pnlPerShare: Decimal;
  
  if (position.side === 'long') {
    // Long: ganamos si el precio sube
    pnlPerShare = current.minus(entry);
  } else {
    // Short: ganamos si el precio baja
    pnlPerShare = entry.minus(current);
  }
  
  let totalPnL = pnlPerShare.times(quantity);
  
  // Restar comisiones si se solicita
  if (includeCommission) {
    const estimatedExitCommission = calculateCommission(
      current.times(quantity).toNumber(),
      position.asset.type
    );
    totalPnL = totalPnL.minus(position.commission).minus(estimatedExitCommission);
  }
  
  // Calcular porcentaje basado en el valor de entrada
  const entryValue = entry.times(quantity);
  const pnlPercent = totalPnL.dividedBy(entryValue).times(100);
  
  return {
    pnl: totalPnL.toNumber(),
    pnlPercent: pnlPercent.toNumber(),
    pnlPerShare: pnlPerShare.toNumber()
  };
}

/**
 * Calcula el PnL realizado de una posición cerrada
 */
export function calculateRealizedPnL(
  position: Position,
  exitPrice: number,
  exitQuantity?: number // Para cierres parciales
): {
  pnl: number;
  pnlPercent: number;
  pnlPerShare: number;
  roi: number;
} {
  const entry = new Decimal(position.entryPrice);
  const exit = new Decimal(exitPrice);
  const quantity = new Decimal(exitQuantity || position.quantity);
  
  let pnlPerShare: Decimal;
  
  if (position.side === 'long') {
    pnlPerShare = exit.minus(entry);
  } else {
    pnlPerShare = entry.minus(exit);
  }
  
  const totalPnL = pnlPerShare.times(quantity);
  
  // Calcular comisiones proporcionales si es cierre parcial
  const commissionRatio = quantity.dividedBy(position.quantity);
  const entryCommission = new Decimal(position.commission).times(commissionRatio);
  const exitCommission = calculateCommission(
    exit.times(quantity).toNumber(),
    position.asset.type
  );
  
  const netPnL = totalPnL.minus(entryCommission).minus(exitCommission);
  
  // Calcular métricas
  const entryValue = entry.times(quantity).plus(entryCommission);
  const pnlPercent = netPnL.dividedBy(entryValue).times(100);
  const roi = netPnL.dividedBy(entryValue.plus(exitCommission)).times(100);
  
  return {
    pnl: netPnL.toNumber(),
    pnlPercent: pnlPercent.toNumber(),
    pnlPerShare: pnlPerShare.toNumber(),
    roi: roi.toNumber()
  };
}

/**
 * Calcula el PnL de múltiples posiciones
 */
export function calculatePortfolioPnL(
  positions: Position[],
  currentPrices: Map<string, number>
): {
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  positions: Array<{
    id: string;
    symbol: string;
    pnl: number;
    pnlPercent: number;
  }>;
} {
  let totalRealized = new Decimal(0);
  let totalUnrealized = new Decimal(0);
  const positionsPnL: any[] = [];
  
  positions.forEach(position => {
    if (position.status === 'closed' && position.realizedPnL) {
      totalRealized = totalRealized.plus(position.realizedPnL);
      positionsPnL.push({
        id: position.id,
        symbol: position.asset.symbol,
        pnl: position.realizedPnL,
        pnlPercent: position.realizedPnLPercent || 0
      });
    } else if (position.status === 'open') {
      const currentPrice = currentPrices.get(position.asset.symbol);
      if (currentPrice) {
        const { pnl, pnlPercent } = calculateUnrealizedPnL(position, currentPrice);
        totalUnrealized = totalUnrealized.plus(pnl);
        positionsPnL.push({
          id: position.id,
          symbol: position.asset.symbol,
          pnl,
          pnlPercent
        });
      }
    }
  });
  
  return {
    totalPnL: totalRealized.plus(totalUnrealized).toNumber(),
    realizedPnL: totalRealized.toNumber(),
    unrealizedPnL: totalUnrealized.toNumber(),
    positions: positionsPnL
  };
}

/**
 * Calcula el PnL máximo y mínimo durante la vida de una posición
 */
export function calculatePnLExtremes(
  position: Position,
  priceHistory: Array<{ timestamp: Date; price: number }>
): {
  maxPnL: number;
  maxPnLPrice: number;
  maxPnLDate: Date;
  minPnL: number;
  minPnLPrice: number;
  minPnLDate: Date;
  currentToMax: number; // % desde el máximo
} {
  let maxPnL = -Infinity;
  let minPnL = Infinity;
  let maxPnLPrice = 0;
  let minPnLPrice = 0;
  let maxPnLDate = new Date();
  let minPnLDate = new Date();
  
  priceHistory.forEach(({ timestamp, price }) => {
    const { pnl } = calculateUnrealizedPnL(position, price, false);
    
    if (pnl > maxPnL) {
      maxPnL = pnl;
      maxPnLPrice = price;
      maxPnLDate = timestamp;
    }
    
    if (pnl < minPnL) {
      minPnL = pnl;
      minPnLPrice = price;
      minPnLDate = timestamp;
    }
  });
  
  const currentPnL = position.unrealizedPnL;
  const currentToMax = maxPnL > 0 ? ((maxPnL - currentPnL) / maxPnL) * 100 : 0;
  
  return {
    maxPnL,
    maxPnLPrice,
    maxPnLDate,
    minPnL,
    minPnLPrice,
    minPnLDate,
    currentToMax
  };
}
```

## Cálculo de Comisiones (src/utils/calculations/commission.ts)

```typescript
import Decimal from 'decimal.js';
import { AssetType, CommissionStructure } from '@/types/trading';

// Estructuras de comisiones por defecto
const DEFAULT_COMMISSIONS: Record<AssetType, CommissionStructure> = {
  crypto: {
    type: 'percentage',
    rate: 0.001, // 0.1%
    minimumCharge: 0
  },
  stock: {
    type: 'tiered',
    rate: 0.005, // 0.5% por defecto
    minimumCharge: 1,
    tierBreakpoints: [
      { volume: 0, rate: 0.005 },
      { volume: 10000, rate: 0.004 },
      { volume: 50000, rate: 0.003 },
      { volume: 100000, rate: 0.002 }
    ]
  }
};

/**
 * Calcula la comisión para una transacción
 */
export function calculateCommission(
  transactionValue: number,
  assetType: AssetType,
  customStructure?: CommissionStructure
): number {
  const structure = customStructure || DEFAULT_COMMISSIONS[assetType];
  const value = new Decimal(transactionValue);
  let commission: Decimal;
  
  switch (structure.type) {
    case 'percentage':
      commission = value.times(structure.rate);
      break;
      
    case 'fixed':
      commission = new Decimal(structure.rate);
      break;
      
    case 'tiered':
      // Encontrar el tier aplicable
      const tier = structure.tierBreakpoints
        ?.sort((a, b) => b.volume - a.volume)
        .find(t => transactionValue >= t.volume) || { volume: 0, rate: structure.rate };
      
      commission = value.times(tier.rate);
      break;
      
    default:
      commission = new Decimal(0);
  }
  
  // Aplicar cargo mínimo si existe
  if (structure.minimumCharge && commission.lessThan(structure.minimumCharge)) {
    commission = new Decimal(structure.minimumCharge);
  }
  
  return commission.toNumber();
}

/**
 * Calcula la comisión total para múltiples transacciones
 */
export function calculateTotalCommissions(
  transactions: Array<{
    value: number;
    assetType: AssetType;
  }>
): {
  total: number;
  byAssetType: Record<AssetType, number>;
  average: number;
} {
  let total = new Decimal(0);
  const byAssetType: Partial<Record<AssetType, number>> = {};
  
  transactions.forEach(tx => {
    const commission = calculateCommission(tx.value, tx.assetType);
    total = total.plus(commission);
    
    if (!byAssetType[tx.assetType]) {
      byAssetType[tx.assetType] = 0;
    }
    byAssetType[tx.assetType]! += commission;
  });
  
  return {
    total: total.toNumber(),
    byAssetType: byAssetType as Record<AssetType, number>,
    average: transactions.length > 0 ? total.dividedBy(transactions.length).toNumber() : 0
  };
}

/**
 * Calcula el slippage estimado
 */
export function calculateSlippage(
  orderType: 'market' | 'limit',
  orderSize: number,
  averageVolume: number,
  volatility: number // 0-1
): number {
  if (orderType === 'limit') {
    return 0; // Las órdenes limit no tienen slippage
  }
  
  // Factor de impacto basado en el tamaño relativo de la orden
  const sizeFactor = Math.min(orderSize / averageVolume, 0.1);
  
  // Slippage base: 0.05% para baja volatilidad, hasta 0.5% para alta
  const baseSlippage = 0.0005 + (volatility * 0.0045);
  
  // Slippage adicional por tamaño de orden
  const sizeSlippage = sizeFactor * 0.002;
  
  return baseSlippage + sizeSlippage;
}

/**
 * Calcula el costo total de una transacción (commission + slippage)
 */
export function calculateTransactionCost(
  transactionValue: number,
  assetType: AssetType,
  orderType: 'market' | 'limit',
  orderSize: number,
  marketData: {
    averageVolume: number;
    volatility: number;
  }
): {
  commission: number;
  slippage: number;
  slippageValue: number;
  totalCost: number;
  effectivePrice: number;
} {
  const commission = calculateCommission(transactionValue, assetType);
  const slippageRate = calculateSlippage(
    orderType,
    orderSize,
    marketData.averageVolume,
    marketData.volatility
  );
  
  const slippageValue = transactionValue * slippageRate;
  const totalCost = commission + slippageValue;
  
  // Precio efectivo después de costos
  const effectivePrice = (transactionValue + totalCost) / orderSize;
  
  return {
    commission,
    slippage: slippageRate,
    slippageValue,
    totalCost,
    effectivePrice
  };
}
```

## Métricas de Rendimiento (src/utils/calculations/metrics.ts)

```typescript
import Decimal from 'decimal.js';
import type { Position, TradeHistory } from '@/types/trading';

/**
 * Calcula métricas de rendimiento para un conjunto de trades
 */
export function calculatePerformanceMetrics(
  trades: TradeHistory[],
  initialBalance: number,
  currentBalance: number,
  timeframeDays: number
): PerformanceMetrics {
  const stats = calculateTradeStatistics(trades);
  const returns = calculateReturns(trades, initialBalance);
  const risk = calculateRiskMetrics(trades, returns.daily);
  
  return {
    // Métricas básicas
    totalTrades: trades.length,
    winningTrades: stats.wins,
    losingTrades: stats.losses,
    winRate: stats.winRate,
    
    // P&L
    grossProfit: stats.grossProfit,
    grossLoss: stats.grossLoss,
    netProfit: stats.netProfit,
    averageWin: stats.avgWin,
    averageLoss: stats.avgLoss,
    largestWin: stats.maxWin,
    largestLoss: stats.maxLoss,
    
    // Ratios
    profitFactor: stats.profitFactor,
    expectancy: stats.expectancy,
    payoffRatio: stats.payoffRatio,
    
    // Returns
    totalReturn: returns.total,
    totalReturnPercent: returns.totalPercent,
    dailyReturn: returns.avgDaily,
    monthlyReturn: returns.avgMonthly,
    annualizedReturn: returns.annualized,
    
    // Risk metrics
    sharpeRatio: risk.sharpe,
    sortinoRatio: risk.sortino,
    calmarRatio: risk.calmar,
    maxDrawdown: risk.maxDrawdown,
    maxDrawdownDuration: risk.maxDrawdownDays,
    volatility: risk.volatility,
    downsideDeviation: risk.downsideDeviation,
    
    // Eficiencia
    profitPerTrade: stats.netProfit / trades.length,
    winLossRatio: stats.wins / Math.max(stats.losses, 1),
    consecutiveWins: stats.maxConsecutiveWins,
    consecutiveLosses: stats.maxConsecutiveLosses,
    
    // Time metrics
    averageHoldTime: calculateAverageHoldTime(trades),
    timeInMarket: calculateTimeInMarket(trades, timeframeDays),
    
    // Kelly Criterion
    kellyPercentage: calculateKellyCriterion(stats.winRate, stats.payoffRatio)
  };
}

interface TradeStats {
  wins: number;
  losses: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  profitFactor: number;
  expectancy: number;
  payoffRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

function calculateTradeStatistics(trades: TradeHistory[]): TradeStats {
  let wins = 0;
  let losses = 0;
  let grossProfit = new Decimal(0);
  let grossLoss = new Decimal(0);
  let maxWin = 0;
  let maxLoss = 0;
  let currentStreak = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let lastTradeWin: boolean | null = null;
  
  trades.forEach(trade => {
    const pnl = trade.performance.pnl;
    
    if (pnl > 0) {
      wins++;
      grossProfit = grossProfit.plus(pnl);
      maxWin = Math.max(maxWin, pnl);
      
      if (lastTradeWin === true) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
      lastTradeWin = true;
      
    } else if (pnl < 0) {
      losses++;
      grossLoss = grossLoss.plus(Math.abs(pnl));
      maxLoss = Math.min(maxLoss, pnl);
      
      if (lastTradeWin === false) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
      lastTradeWin = false;
    }
  });
  
  const winRate = trades.length > 0 ? wins / trades.length : 0;
  const avgWin = wins > 0 ? grossProfit.dividedBy(wins).toNumber() : 0;
  const avgLoss = losses > 0 ? grossLoss.dividedBy(losses).toNumber() : 0;
  const profitFactor = grossLoss.greaterThan(0) 
    ? grossProfit.dividedBy(grossLoss).toNumber() 
    : grossProfit.greaterThan(0) ? Infinity : 0;
  
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  return {
    wins,
    losses,
    winRate,
    grossProfit: grossProfit.toNumber(),
    grossLoss: grossLoss.toNumber(),
    netProfit: grossProfit.minus(grossLoss).toNumber(),
    avgWin,
    avgLoss,
    maxWin,
    maxLoss,
    profitFactor,
    expectancy,
    payoffRatio,
    maxConsecutiveWins,
    maxConsecutiveLosses
  };
}

/**
 * Calcula el ratio de Sharpe
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% anual por defecto
): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const excessReturns = returns.map(r => r - riskFreeRate / 252); // Daily risk-free rate
  const stdDev = calculateStandardDeviation(excessReturns);
  
  return stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252) : 0;
}

/**
 * Calcula el ratio de Sortino
 */
export function calculateSortinoRatio(
  returns: number[],
  targetReturn: number = 0
): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < targetReturn);
  const downsideDeviation = calculateStandardDeviation(downsideReturns);
  
  return downsideDeviation > 0 
    ? (avgReturn - targetReturn) / downsideDeviation * Math.sqrt(252) 
    : avgReturn > targetReturn ? Infinity : 0;
}

/**
 * Calcula el máximo drawdown
 */
export function calculateMaxDrawdown(
  equityCurve: Array<{ date: Date; value: number }>
): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
  startDate: Date;
  endDate: Date;
  duration: number; // en días
} {
  if (equityCurve.length < 2) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      startDate: new Date(),
      endDate: new Date(),
      duration: 0
    };
  }
  
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let peak = equityCurve[0].value;
  let peakDate = equityCurve[0].date;
  let drawdownStart = equityCurve[0].date;
  let drawdownEnd = equityCurve[0].date;
  let maxDuration = 0;
  
  equityCurve.forEach(point => {
    if (point.value > peak) {
      peak = point.value;
      peakDate = point.date;
    }
    
    const drawdown = peak - point.value;
    const drawdownPercent = (drawdown / peak) * 100;
    
    if (drawdownPercent > maxDrawdownPercent) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
      drawdownStart = peakDate;
      drawdownEnd = point.date;
      maxDuration = Math.ceil(
        (drawdownEnd.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  });
  
  return {
    maxDrawdown,
    maxDrawdownPercent,
    startDate: drawdownStart,
    endDate: drawdownEnd,
    duration: maxDuration
  };
}

/**
 * Calcula el Kelly Criterion para el tamaño óptimo de posición
 */
export function calculateKellyCriterion(
  winRate: number,
  payoffRatio: number
): number {
  // Kelly % = (p * b - q) / b
  // donde p = probabilidad de ganar, q = probabilidad de perder, b = ratio de ganancia
  const q = 1 - winRate;
  const kelly = (winRate * payoffRatio - q) / payoffRatio;
  
  // Limitar al 25% como máximo (Kelly completo es muy agresivo)
  return Math.max(0, Math.min(kelly, 0.25));
}

/**
 * Calcula desviación estándar
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Calcula tiempo promedio de holding
 */
function calculateAverageHoldTime(trades: TradeHistory[]): number {
  if (trades.length === 0) return 0;
  
  const holdTimes = trades.map(trade => trade.performance.holdingTime || 0);
  return holdTimes.reduce((sum, time) => sum + time, 0) / trades.length;
}

/**
 * Calcula porcentaje de tiempo en el mercado
 */
function calculateTimeInMarket(trades: TradeHistory[], totalDays: number): number {
  if (trades.length === 0 || totalDays === 0) return 0;
  
  const totalMinutesInMarket = trades.reduce(
    (sum, trade) => sum + (trade.performance.holdingTime || 0),
    0
  );
  
  const totalMinutes = totalDays * 24 * 60;
  return (totalMinutesInMarket / totalMinutes) * 100;
}

// Interfaces para los retornos
interface Returns {
  daily: number[];
  total: number;
  totalPercent: number;
  avgDaily: number;
  avgMonthly: number;
  annualized: number;
}

interface RiskMetrics {
  sharpe: number;
  sortino: number;
  calmar: number;
  maxDrawdown: number;
  maxDrawdownDays: number;
  volatility: number;
  downsideDeviation: number;
}

interface PerformanceMetrics {
  // Trade statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // P&L metrics
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Performance ratios
  profitFactor: number;
  expectancy: number;
  payoffRatio: number;
  
  // Return metrics
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  monthlyReturn: number;
  annualizedReturn: number;
  
  // Risk metrics
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  volatility: number;
  downsideDeviation: number;
  
  // Efficiency metrics
  profitPerTrade: number;
  winLossRatio: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Time metrics
  averageHoldTime: number;
  timeInMarket: number;
  
  // Position sizing
  kellyPercentage: number;
}

// Función auxiliar para calcular returns
function calculateReturns(trades: TradeHistory[], initialBalance: number): Returns {
  // Implementación simplificada - expandir según necesidad
  const totalPnL = trades.reduce((sum, trade) => sum + trade.performance.pnl, 0);
  const totalPercent = (totalPnL / initialBalance) * 100;
  
  return {
    daily: [], // Calcular basado en timestamps
    total: totalPnL,
    totalPercent,
    avgDaily: totalPercent / 252, // Asumiendo año de trading
    avgMonthly: totalPercent / 12,
    annualized: totalPercent
  };
}

// Función auxiliar para calcular métricas de riesgo
function calculateRiskMetrics(trades: TradeHistory[], dailyReturns: number[]): RiskMetrics {
  // Implementación simplificada - expandir según necesidad
  return {
    sharpe: calculateSharpeRatio(dailyReturns),
    sortino: calculateSortinoRatio(dailyReturns),
    calmar: 0, // Implementar
    maxDrawdown: 0, // Usar calculateMaxDrawdown
    maxDrawdownDays: 0,
    volatility: calculateStandardDeviation(dailyReturns),
    downsideDeviation: 0 // Implementar
  };
}
```

## Gestión de Stop Loss y Take Profit (src/utils/calculations/stopLoss.ts)

```typescript
import Decimal from 'decimal.js';
import type { Position, StopLossConfig, TakeProfitConfig } from '@/types/trading';

/**
 * Calcula el precio de stop loss basado en la configuración
 */
export function calculateStopLoss(
  entryPrice: number,
  side: 'long' | 'short',
  config: StopLossConfig,
  marketData?: {
    atr?: number;
    support?: number;
    resistance?: number;
  }
): number {
  const entry = new Decimal(entryPrice);
  let stopLoss: Decimal;
  
  switch (config.type) {
    case 'percentage':
      const percentageMove = entry.times(config.value / 100);
      stopLoss = side === 'long' 
        ? entry.minus(percentageMove)
        : entry.plus(percentageMove);
      break;
      
    case 'fixed':
      stopLoss = side === 'long'
        ? entry.minus(config.value)
        : entry.plus(config.value);
      break;
      
    case 'atr':
      if (!marketData?.atr) {
        throw new Error('ATR value required for ATR-based stop loss');
      }
      const atrDistance = new Decimal(marketData.atr).times(config.value);
      stopLoss = side === 'long'
        ? entry.minus(atrDistance)
        : entry.plus(atrDistance);
      break;
      
    case 'support':
      if (!marketData?.support || !marketData?.resistance) {
        throw new Error('Support/Resistance levels required');
      }
      // Para long, usar support; para short, usar resistance
      if (side === 'long') {
        stopLoss = new Decimal(marketData.support).times(1 - config.value / 100);
      } else {
        stopLoss = new Decimal(marketData.resistance).times(1 + config.value / 100);
      }
      break;
      
    default:
      throw new Error(`Unknown stop loss type: ${config.type}`);
  }
  
  return stopLoss.toNumber();
}

/**
 * Calcula el precio de take profit basado en la configuración
 */
export function calculateTakeProfit(
  entryPrice: number,
  side: 'long' | 'short',
  config: TakeProfitConfig,
  stopLoss?: number,
  marketData?: {
    resistance?: number;
    support?: number;
  }
): number {
  const entry = new Decimal(entryPrice);
  let takeProfit: Decimal;
  
  switch (config.type) {
    case 'percentage':
      const percentageMove = entry.times(config.value / 100);
      takeProfit = side === 'long'
        ? entry.plus(percentageMove)
        : entry.minus(percentageMove);
      break;
      
    case 'fixed':
      takeProfit = side === 'long'
        ? entry.plus(config.value)
        : entry.minus(config.value);
      break;
      
    case 'resistance':
      if (!marketData?.resistance || !marketData?.support) {
        throw new Error('Support/Resistance levels required');
      }
      // Para long, usar resistance; para short, usar support
      if (side === 'long') {
        takeProfit = new Decimal(marketData.resistance).times(1 - config.value / 100);
      } else {
        takeProfit = new Decimal(marketData.support).times(1 + config.value / 100);
      }
      break;
      
    case 'risk_reward':
      if (!stopLoss) {
        throw new Error('Stop loss required for risk/reward calculation');
      }
      const risk = new Decimal(Math.abs(entryPrice - stopLoss));
      const reward = risk.times(config.value);
      takeProfit = side === 'long'
        ? entry.plus(reward)
        : entry.minus(reward);
      break;
      
    default:
      throw new Error(`Unknown take profit type: ${config.type}`);
  }
  
  return takeProfit.toNumber();
}

/**
 * Actualiza el stop loss para trailing stop
 */
export function updateTrailingStop(
  position: Position,
  currentPrice: number,
  trailingDistance: number,
  isPercentage: boolean = false
): number | null {
  const current = new Decimal(currentPrice);
  const currentStop = new Decimal(position.stopLoss);
  let newStop: Decimal;
  
  if (isPercentage) {
    const distance = current.times(trailingDistance / 100);
    newStop = position.side === 'long'
      ? current.minus(distance)
      : current.plus(distance);
  } else {
    newStop = position.side === 'long'
      ? current.minus(trailingDistance)
      : current.plus(trailingDistance);
  }
  
  // Solo actualizar si mejora el stop loss
  if (position.side === 'long') {
    // Para long, el nuevo stop debe ser mayor que el actual
    return newStop.greaterThan(currentStop) ? newStop.toNumber() : null;
  } else {
    // Para short, el nuevo stop debe ser menor que el actual
    return newStop.lessThan(currentStop) ? newStop.toNumber() : null;
  }
}

/**
 * Calcula los niveles de take profit parcial
 */
export function calculatePartialTakeProfits(
  entryPrice: number,
  takeProfit: number,
  partialConfig: Array<{ percentage: number; atProfit: number }>
): Array<{
  price: number;
  percentage: number;
  quantity: number;
}> {
  const entry = new Decimal(entryPrice);
  const tp = new Decimal(takeProfit);
  const totalDistance = tp.minus(entry).abs();
  
  return partialConfig.map(config => {
    const distance = totalDistance.times(config.atProfit / 100);
    const price = entry.greaterThan(tp)
      ? entry.minus(distance)
      : entry.plus(distance);
    
    return {
      price: price.toNumber(),
      percentage: config.percentage,
      quantity: 0 // Se calculará basado en la posición real
    };
  });
}

/**
 * Calcula el riesgo en dinero para una posición
 */
export function calculatePositionRisk(
  entryPrice: number,
  stopLoss: number,
  quantity: number,
  side: 'long' | 'short'
): number {
  const entry = new Decimal(entryPrice);
  const stop = new Decimal(stopLoss);
  const qty = new Decimal(quantity);
  
  const priceRisk = side === 'long'
    ? entry.minus(stop)
    : stop.minus(entry);
  
  return priceRisk.times(qty).abs().toNumber();
}

/**
 * Calcula el tamaño de posición basado en el riesgo deseado
 */
export function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number,
  side: 'long' | 'short'
): {
  quantity: number;
  positionValue: number;
  riskAmount: number;
} {
  const balance = new Decimal(accountBalance);
  const riskAmount = balance.times(riskPercentage / 100);
  const entry = new Decimal(entryPrice);
  const stop = new Decimal(stopLoss);
  
  const priceRisk = side === 'long'
    ? entry.minus(stop).abs()
    : stop.minus(entry).abs();
  
  if (priceRisk.equals(0)) {
    throw new Error('Invalid stop loss - no price risk');
  }
  
  const quantity = riskAmount.dividedBy(priceRisk);
  const positionValue = quantity.times(entry);
  
  return {
    quantity: quantity.toNumber(),
    positionValue: positionValue.toNumber(),
    riskAmount: riskAmount.toNumber()
  };
}

/**
 * Valida si el precio actual ha alcanzado SL o TP
 */
export function checkStopLossOrTakeProfit(
  position: Position,
  currentPrice: number
): {
  hitStopLoss: boolean;
  hitTakeProfit: boolean;
  exitPrice?: number;
  reason?: 'stop_loss' | 'take_profit';
} {
  const current = new Decimal(currentPrice);
  const sl = new Decimal(position.stopLoss);
  const tp = new Decimal(position.takeProfit);
  
  if (position.side === 'long') {
    if (current.lessThanOrEqualTo(sl)) {
      return {
        hitStopLoss: true,
        hitTakeProfit: false,
        exitPrice: sl.toNumber(),
        reason: 'stop_loss'
      };
    }
    if (current.greaterThanOrEqualTo(tp)) {
      return {
        hitStopLoss: false,
        hitTakeProfit: true,
        exitPrice: tp.toNumber(),
        reason: 'take_profit'
      };
    }
  } else {
    if (current.greaterThanOrEqualTo(sl)) {
      return {
        hitStopLoss: true,
        hitTakeProfit: false,
        exitPrice: sl.toNumber(),
        reason: 'stop_loss'
      };
    }
    if (current.lessThanOrEqualTo(tp)) {
      return {
        hitStopLoss: false,
        hitTakeProfit: true,
        exitPrice: tp.toNumber(),
        reason: 'take_profit'
      };
    }
  }
  
  return {
    hitStopLoss: false,
    hitTakeProfit: false
  };
}
```

## Uso de las funciones

```typescript
// Ejemplo de uso en un servicio
import { 
  calculateUnrealizedPnL, 
  calculateCommission, 
  calculateStopLoss,
  calculatePositionSize 
} from '@/utils/calculations';

// En un componente o store
const position = {
  entryPrice: 50000,
  currentPrice: 52000,
  quantity: 0.5,
  side: 'long',
  asset: { type: 'crypto' }
};

const { pnl, pnlPercent } = calculateUnrealizedPnL(position, 52000);
const commission = calculateCommission(26000, 'crypto');

const stopLoss = calculateStopLoss(50000, 'long', {
  type: 'percentage',
  value: 2 // 2% stop loss
});

const { quantity } = calculatePositionSize(
  10000,  // balance
  1,      // risk 1%
  50000,  // entry
  49000,  // stop loss
  'long'
);
```

## Siguiente Paso
El próximo prompt implementará las estrategias de trading: momentum, mean reversion, breakout, etc.
