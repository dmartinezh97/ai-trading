# Prompt 4 (Continuación): Estrategia Breakout

## Estrategia Breakout (src/utils/strategies/breakout.ts)

```typescript
import { BaseStrategy, StrategyContext, StrategyResult } from './base';
import type { Candlestick, TradeSignal } from '@/types';

export interface BreakoutConfig {
  lookbackPeriod: number; // Período para identificar rangos
  breakoutThreshold: number; // % por encima/debajo del rango
  volumeMultiplier: number; // Multiplicador de volumen requerido
  confirmationCandles: number; // Velas de confirmación
  falseBreakoutFilter: boolean;
  minRangeSize: number; // Tamaño mínimo del rango en %
  maxRangeSize: number; // Tamaño máximo del rango en %
}

export class BreakoutStrategy extends BaseStrategy {
  private config: BreakoutConfig;
  
  constructor(config?: Partial<BreakoutConfig>) {
    super({
      name: 'Breakout',
      timeframe: '1h',
      lookbackPeriod: 24,
      minConfidence: 70,
      parameters: config || {}
    });
    
    this.config = {
      lookbackPeriod: 24,
      breakoutThreshold: 0.5, // 0.5% por encima/debajo
      volumeMultiplier: 1.5,
      confirmationCandles: 2,
      falseBreakoutFilter: true,
      minRangeSize: 1, // 1% mínimo
      maxRangeSize: 5, // 5% máximo
      ...config
    };
  }
  
  analyze(context: StrategyContext): StrategyResult {
    if (!this.validateConditions(context)) {
      return this.createNeutralResult('Condiciones no válidas para breakout');
    }
    
    const { candles, indicators, asset } = context;
    const currentPrice = asset.currentPrice;
    
    // Identificar rangos de consolidación
    const range = this.identifyRange(candles);
    if (!range) {
      return this.createNeutralResult('No se detectó rango de consolidación');
    }
    
    // Analizar breakout
    const breakoutSignal = this.analyzeBreakout(currentPrice, range, candles);
    const volumeConfirmation = this.confirmVolume(indicators.volume);
    const momentumStrength = this.analyzeMomentum(candles, range);
    const patternQuality = this.assessPatternQuality(candles, range);
    
    // Verificar falsos breakouts si está habilitado
    let falseBreakoutRisk = 0;
    if (this.config.falseBreakoutFilter) {
      falseBreakoutRisk = this.assessFalseBreakoutRisk(candles, range);
    }
    
    // Determinar señal
    let signal: TradeSignal['action'] = 'hold';
    let strength: TradeSignal['strength'] = 'weak';
    
    if (breakoutSignal !== 0 && volumeConfirmation && falseBreakoutRisk < 0.5) {
      signal = breakoutSignal > 0 ? 'buy' : 'sell';
      strength = Math.abs(momentumStrength) > 0.7 ? 'strong' : 'moderate';
    }
    
    // Calcular niveles
    const atr = this.calculateATR(candles);
    let entry = currentPrice;
    let stopLoss = 0;
    let takeProfit = 0;
    
    if (signal === 'buy') {
      entry = range.resistance * (1 + this.config.breakoutThreshold / 100);
      stopLoss = range.resistance * 0.99; // Justo debajo de la resistencia rota
      takeProfit = entry + (range.resistance - range.support) * 1.5; // 1.5x el rango
    } else if (signal === 'sell') {
      entry = range.support * (1 - this.config.breakoutThreshold / 100);
      stopLoss = range.support * 1.01; // Justo encima del soporte roto
      takeProfit = entry - (range.resistance - range.support) * 1.5;
    }
    
    const confidence = this.calculateConfidence({
      breakout: Math.abs(breakoutSignal) * 100,
      volume: volumeConfirmation ? 80 : 20,
      momentum: Math.abs(momentumStrength) * 100,
      pattern: patternQuality * 100,
      falseBreakout: (1 - falseBreakoutRisk) * 100
    });
    
    return {
      signal: {
        action: signal,
        strength,
        suggestedEntry: entry,
        suggestedStopLoss: stopLoss,
        suggestedTakeProfit: takeProfit,
        suggestedPositionSize: this.calculatePositionSize(confidence, strength)
      },
      confidence,
      reasoning: this.generateReasoning({
        signal,
        range,
        breakoutSignal,
        volumeConfirmation,
        momentumStrength,
        falseBreakoutRisk
      }),
      keyLevels: {
        entry,
        stopLoss,
        takeProfit,
        support: [range.support],
        resistance: [range.resistance]
      },
      additionalData: {
        range,
        breakoutType: breakoutSignal > 0 ? 'resistance' : 'support',
        rangeSize: ((range.resistance - range.support) / range.support) * 100
      }
    };
  }
  
  validateConditions(context: StrategyContext): boolean {
    const { candles, marketConditions } = context;
    
    if (candles.length < this.config.lookbackPeriod * 2) {
      return false;
    }
    
    // Breakouts funcionan mejor después de consolidación
    if (marketConditions.volatility === 'low' && 
        marketConditions.trend === 'sideways') {
      return true;
    }
    
    // También pueden funcionar en inicio de nuevas tendencias
    if (marketConditions.marketPhase === 'accumulation' ||
        marketConditions.marketPhase === 'distribution') {
      return true;
    }
    
    return false;
  }
  
  protected getConfidenceWeights(): Record<string, number> {
    return {
      breakout: 0.3,
      volume: 0.25,
      momentum: 0.2,
      pattern: 0.15,
      falseBreakout: 0.1
    };
  }
  
  private identifyRange(candles: Candlestick[]): {
    support: number;
    resistance: number;
    touches: number;
    strength: number;
  } | null {
    const lookback = candles.slice(-this.config.lookbackPeriod);
    const highs = lookback.map(c => c.high);
    const lows = lookback.map(c => c.low);
    
    // Encontrar niveles de soporte y resistencia
    const resistance = Math.max(...highs) * 0.998; // Pequeño margen
    const support = Math.min(...lows) * 1.002;
    
    // Verificar tamaño del rango
    const rangeSize = ((resistance - support) / support) * 100;
    if (rangeSize < this.config.minRangeSize || rangeSize > this.config.maxRangeSize) {
      return null;
    }
    
    // Contar toques de soporte/resistencia
    let supportTouches = 0;
    let resistanceTouches = 0;
    
    lookback.forEach(candle => {
      if (Math.abs(candle.low - support) / support < 0.005) {
        supportTouches++;
      }
      if (Math.abs(candle.high - resistance) / resistance < 0.005) {
        resistanceTouches++;
      }
    });
    
    const totalTouches = supportTouches + resistanceTouches;
    if (totalTouches < 4) {
      return null; // No suficientes toques para confirmar rango
    }
    
    // Calcular fuerza del rango
    const pricesWithinRange = lookback.filter(c => 
      c.high <= resistance && c.low >= support
    ).length;
    const strength = pricesWithinRange / lookback.length;
    
    if (strength < 0.7) {
      return null; // Rango no bien definido
    }
    
    return {
      support,
      resistance,
      touches: totalTouches,
      strength
    };
  }
  
  private analyzeBreakout(
    currentPrice: number,
    range: { support: number; resistance: number },
    candles: Candlestick[]
  ): number {
    const recentCandles = candles.slice(-this.config.confirmationCandles);
    const breakoutUp = currentPrice > range.resistance * (1 + this.config.breakoutThreshold / 100);
    const breakoutDown = currentPrice < range.support * (1 - this.config.breakoutThreshold / 100);
    
    if (breakoutUp) {
      // Verificar confirmación
      const confirmed = recentCandles.every(c => c.close > range.resistance);
      return confirmed ? 1 : 0.5;
    } else if (breakoutDown) {
      const confirmed = recentCandles.every(c => c.close < range.support);
      return confirmed ? -1 : -0.5;
    }
    
    return 0;
  }
  
  private confirmVolume(volume?: { current: number; average: number }): boolean {
    if (!volume) return false;
    
    return volume.current > volume.average * this.config.volumeMultiplier;
  }
  
  private analyzeMomentum(
    candles: Candlestick[],
    range: { support: number; resistance: number }
  ): number {
    const recentCandles = candles.slice(-5);
    const momentum = recentCandles.map((c, i) => {
      if (i === 0) return 0;
      return (c.close - recentCandles[i-1].close) / recentCandles[i-1].close;
    });
    
    const avgMomentum = momentum.reduce((a, b) => a + b, 0) / momentum.length;
    
    // Normalizar basado en el tamaño del rango
    const rangeSize = (range.resistance - range.support) / range.support;
    return avgMomentum / rangeSize;
  }
  
  private assessPatternQuality(
    candles: Candlestick[],
    range: { support: number; resistance: number; strength: number }
  ): number {
    // Evaluar la calidad del patrón de consolidación
    let quality = range.strength;
    
    // Bonus por compresión de volatilidad
    const recentATR = this.calculateATR(candles.slice(-14));
    const historicalATR = this.calculateATR(candles.slice(-50, -14));
    
    if (historicalATR > 0 && recentATR < historicalATR * 0.7) {
      quality += 0.2; // Volatilidad comprimida es buena para breakouts
    }
    
    return Math.min(quality, 1);
  }
  
  private assessFalseBreakoutRisk(
    candles: Candlestick[],
    range: { support: number; resistance: number }
  ): number {
    // Buscar breakouts fallidos previos
    let falseBreakouts = 0;
    const lookback = candles.slice(-50);
    
    for (let i = 1; i < lookback.length - 1; i++) {
      const candle = lookback[i];
      const nextCandle = lookback[i + 1];
      
      // False breakout up
      if (candle.close > range.resistance && nextCandle.close < range.resistance) {
        falseBreakouts++;
      }
      // False breakout down
      if (candle.close < range.support && nextCandle.close > range.support) {
        falseBreakouts++;
      }
    }
    
    return Math.min(falseBreakouts / 5, 1); // Normalizar a 0-1
  }
  
  private calculatePositionSize(confidence: number, strength: string): number {
    // Breakouts pueden usar tamaños más agresivos si la confianza es alta
    const baseSize = 0.02; // 2% base
    const confidenceFactor = confidence / 100;
    const strengthFactor = strength === 'strong' ? 1.5 : strength === 'moderate' ? 1.2 : 0.8;
    
    return Math.min(baseSize * confidenceFactor * strengthFactor, 0.05); // Max 5%
  }
  
  private generateReasoning(data: any): string {
    const parts: string[] = ['Análisis Breakout:'];
    
    if (data.range) {
      parts.push(`Rango detectado: $${data.range.support.toFixed(2)} - $${data.range.resistance.toFixed(2)}`);
    }
    
    if (data.breakoutSignal > 0) {
      parts.push('Ruptura alcista confirmada');
    } else if (data.breakoutSignal < 0) {
      parts.push('Ruptura bajista confirmada');
    }
    
    if (data.volumeConfirmation) {
      parts.push('Volumen confirma el breakout');
    } else {
      parts.push('Volumen insuficiente');
    }
    
    if (data.momentumStrength > 0.5) {
      parts.push('Momentum fuerte apoya la ruptura');
    }
    
    if (data.falseBreakoutRisk > 0.5) {
      parts.push('⚠️ Alto riesgo de falso breakout');
    }
    
    return parts.join('. ');
  }
  
  private createNeutralResult(reasoning: string): StrategyResult {
    return {
      signal: {
        action: 'hold',
        strength: 'weak'
      },
      confidence: 0,
      reasoning,
      keyLevels: {}
    };
  }
}
```

## Factory de Estrategias (src/utils/strategies/index.ts)

```typescript
import { MomentumStrategy } from './momentum';
import { MeanReversionStrategy } from './meanRevert';
import { BreakoutStrategy } from './breakout';
import type { TradingStrategy, AITraderId } from '@/types';
import type { BaseStrategy } from './base';

export class StrategyFactory {
  private strategies: Map<TradingStrategy, BaseStrategy>;
  
  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }
  
  private initializeStrategies(): void {
    // Configuraciones por defecto para cada estrategia
    this.strategies.set('momentum', new MomentumStrategy());
    this.strategies.set('meanRevert', new MeanReversionStrategy());
    this.strategies.set('breakout', new BreakoutStrategy());
  }
  
  getStrategy(type: TradingStrategy): BaseStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Strategy ${type} not found`);
    }
    return strategy;
  }
  
  // Obtener estrategia personalizada para cada IA
  getStrategyForAI(aiId: AITraderId, strategyType: TradingStrategy): BaseStrategy {
    const baseStrategy = this.getStrategy(strategyType);
    
    // Personalizar parámetros según la IA
    switch (aiId) {
      case 'grok':
        // Grok es más agresivo
        if (strategyType === 'momentum') {
          return new MomentumStrategy({
            rsiOverbought: 75,
            rsiOversold: 25,
            trendStrength: 1.5
          });
        }
        break;
        
      case 'claude':
        // Claude es más conservador
        if (strategyType === 'meanRevert') {
          return new MeanReversionStrategy({
            zScoreThreshold: 2.5,
            minReversion: 1.5
          });
        }
        break;
        
      case 'chatgpt':
        // ChatGPT es equilibrado
        return baseStrategy;
        
      case 'gemini':
        // Gemini prefiere breakouts
        if (strategyType === 'breakout') {
          return new BreakoutStrategy({
            confirmationCandles: 3,
            falseBreakoutFilter: true
          });
        }
        break;
    }
    
    return baseStrategy;
  }
  
  // Combinar múltiples estrategias
  combineStrategies(
    strategies: Array<{ strategy: BaseStrategy; weight: number }>,
    context: any
  ): any {
    const results = strategies.map(({ strategy, weight }) => ({
      result: strategy.analyze(context),
      weight
    }));
    
    // Ponderar señales
    let totalWeight = 0;
    let weightedConfidence = 0;
    let buySignals = 0;
    let sellSignals = 0;
    
    results.forEach(({ result, weight }) => {
      totalWeight += weight;
      weightedConfidence += result.confidence * weight;
      
      if (result.signal.action === 'buy') {
        buySignals += weight;
      } else if (result.signal.action === 'sell') {
        sellSignals += weight;
      }
    });
    
    // Determinar señal combinada
    let finalAction: 'buy' | 'sell' | 'hold' = 'hold';
    if (buySignals > totalWeight * 0.6) {
      finalAction = 'buy';
    } else if (sellSignals > totalWeight * 0.6) {
      finalAction = 'sell';
    }
    
    return {
      signal: {
        action: finalAction,
        strength: weightedConfidence > 70 ? 'strong' : 
                  weightedConfidence > 50 ? 'moderate' : 'weak'
      },
      confidence: weightedConfidence / totalWeight,
      reasoning: 'Señal combinada de múltiples estrategias',
      strategies: results.map(r => r.result)
    };
  }
}

// Exportar todo
export * from './base';
export * from './momentum';
export * from './meanRevert';
export * from './breakout';
```

## Selector de Estrategia Inteligente (src/utils/strategies/selector.ts)

```typescript
import type { MarketConditions, TradingStrategy, AIProfile } from '@/types';

export class StrategySelector {
  /**
   * Selecciona la mejor estrategia basada en las condiciones del mercado
   */
  static selectBestStrategy(
    marketConditions: MarketConditions,
    aiProfile: AIProfile
  ): TradingStrategy {
    const { trend, volatility, momentum, marketPhase } = marketConditions;
    const { tradingStyle, riskProfile } = aiProfile;
    
    // Matriz de decisión basada en condiciones
    if (trend === 'sideways' && volatility === 'low') {
      // Mercado lateral con baja volatilidad -> Mean Reversion
      return 'meanRevert';
    }
    
    if ((trend === 'bullish' || trend === 'bearish') && momentum === 'strong') {
      // Tendencia fuerte -> Momentum
      return 'momentum';
    }
    
    if (marketPhase === 'accumulation' || 
        (volatility === 'low' && momentum === 'weak')) {
      // Fase de acumulación o compresión -> Breakout
      return 'breakout';
    }
    
    // Considerar preferencias de la IA
    if (tradingStyle.primaryStrategies.length > 0) {
      // Verificar si alguna estrategia preferida es apropiada
      for (const strategy of tradingStyle.primaryStrategies) {
        if (this.isStrategyAppropriate(strategy, marketConditions)) {
          return strategy;
        }
      }
    }
    
    // Default basado en perfil de riesgo
    if (riskProfile.riskTolerance === 'high') {
      return 'momentum';
    } else if (riskProfile.riskTolerance === 'low') {
      return 'meanRevert';
    }
    
    return 'breakout'; // Default
  }
  
  /**
   * Verifica si una estrategia es apropiada para las condiciones actuales
   */
  static isStrategyAppropriate(
    strategy: TradingStrategy,
    conditions: MarketConditions
  ): boolean {
    switch (strategy) {
      case 'momentum':
        return conditions.momentum !== 'weak' && 
               conditions.trend !== 'sideways';
               
      case 'meanRevert':
        return conditions.volatility !== 'high' &&
               (conditions.trend === 'sideways' || conditions.momentum === 'weak');
               
      case 'breakout':
        return conditions.volatility === 'low' ||
               conditions.marketPhase === 'accumulation';
               
      default:
        return true;
    }
  }
  
  /**
   * Calcula scores para cada estrategia
   */
  static getStrategyScores(
    conditions: MarketConditions
  ): Record<TradingStrategy, number> {
    const scores: Partial<Record<TradingStrategy, number>> = {};
    
    // Score para Momentum
    scores.momentum = 0;
    if (conditions.trend !== 'sideways') scores.momentum += 30;
    if (conditions.momentum === 'strong') scores.momentum += 40;
    if (conditions.volatility === 'high') scores.momentum += 20;
    if (conditions.marketPhase === 'markup') scores.momentum += 10;
    
    // Score para Mean Reversion
    scores.meanRevert = 0;
    if (conditions.trend === 'sideways') scores.meanRevert += 40;
    if (conditions.volatility === 'medium') scores.meanRevert += 30;
    if (conditions.momentum === 'weak') scores.meanRevert += 20;
    if (conditions.marketPhase === 'distribution') scores.meanRevert += 10;
    
    // Score para Breakout
    scores.breakout = 0;
    if (conditions.volatility === 'low') scores.breakout += 35;
    if (conditions.marketPhase === 'accumulation') scores.breakout += 35;
    if (conditions.momentum === 'moderate') scores.breakout += 20;
    if (conditions.trend === 'sideways') scores.breakout += 10;
    
    return scores as Record<TradingStrategy, number>;
  }
}
```

## Siguiente Paso
El próximo prompt implementará los servicios de obtención de datos de mercado y gestión de APIs.
