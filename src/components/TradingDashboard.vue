<template>
  <div class="space-y-8">
    <section>
      <div class="trader-grid">
        <AITrader v-for="trader in traderCards" :key="trader.id" :trader="trader" />
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="lg:col-span-2 space-y-6">
        <BalanceChart :traders="traderCards" />
        <TradeHistory :trades="tradesForTable" />
      </div>
      <div class="space-y-6">
        <StatsDashboard :traders="traderCards" />
        <MarketData :market-assets="marketAssets" />
        <OpenPositions :positions="openPositions" :asset-prices="assetPriceMap" />
        <TradeAnalysis :analyses="recentAnalyses" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useMarketStore } from '../stores/market';
import { useTradersStore } from '../stores/traders';
import { useTradesStore } from '../stores/trades';
import '../stores/pinia';

import AITrader from './AITrader.vue';
import BalanceChart from './BalanceChart.vue';
import MarketData from './MarketData.vue';
import OpenPositions from './OpenPositions.vue';
import TradeAnalysis from './TradeAnalysis.vue';
import TradeHistory from './TradeHistory.vue';
import StatsDashboard from './StatsDashboard.vue';

const marketStore = useMarketStore();
const tradersStore = useTradersStore();
const tradesStore = useTradesStore();

let intervalId;

const assetPriceMap = computed(() => {
  return marketStore.assets.reduce((acc, asset) => {
    acc[asset.symbol] = asset;
    return acc;
  }, {});
});

const traderCards = computed(() =>
  tradersStore.traderList.map((trader) => ({
    ...trader,
    dailyPnl: Number((trader.balance - trader.startOfDayBalance).toFixed(2))
  }))
);

const marketAssets = computed(() => marketStore.assets);

const openPositions = computed(() => tradesStore.openPositions);

const tradesForTable = computed(() => {
  const currentPrices = assetPriceMap.value;
  return [
    ...tradesStore.openPositions.map((trade) => {
      const price = currentPrices[trade.asset]?.price ?? trade.entryPrice;
      const pnl =
        trade.type === 'long'
          ? (price - trade.entryPrice) * trade.size
          : (trade.entryPrice - price) * trade.size;
      return {
        ...trade,
        pnl: Number(pnl.toFixed(2))
      };
    }),
    ...tradesStore.history
  ];
});

const recentAnalyses = computed(() => tradesStore.lastAnalyses);

const riskSizeMap = {
  Alta: 1.8,
  Media: 1.2,
  Baja: 0.8,
  Variable: 1.5
};

function selectAsset(trader) {
  const preferred = trader.preferredAssets;
  const pool = marketStore.assets.filter((asset) => preferred.includes(asset.symbol));
  const candidates = pool.length ? pool : marketStore.assets;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function buildAnalysis(trader, asset, type, price) {
  const sentiment = type === 'long' ? 'sesgo alcista' : 'sesgo bajista';
  const rationale = {
    Técnico: 'ruptura de media móvil y momentum positivo',
    Fundamental: 'noticias macro favorables y sólidos fundamentales',
    Mixta: 'confluencia de indicadores técnicos y sentimiento del mercado',
    Cuantitativa: 'señal estadística con alta probabilidad'
  };
  return `${trader.name} detecta ${sentiment} en ${asset.symbol} a ${price}. Basado en ${rationale[trader.analysisStyle]}.`;
}

function maybeOpenTrade(trader, timestamp) {
  const active = tradesStore.openPositions.filter((trade) => trade.aiTrader === trader.id);
  if (active.length >= 3) return;
  const shouldTrade = Math.random() < 0.4;
  if (!shouldTrade) return;
  const asset = selectAsset(trader);
  const size = Number((riskSizeMap[trader.riskTolerance] ?? 1) * (Math.random() * 0.6 + 0.4)).toFixed(2);
  const type = Math.random() > 0.5 ? 'long' : 'short';
  const price = asset.price;
  const analysis = buildAnalysis(trader, asset, type, price);
  const trade = tradesStore.createTrade({
    traderId: trader.id,
    asset: asset.symbol,
    type,
    entryPrice: price,
    size: Number(size),
    analysis,
    timestamp
  });
  tradersStore.setAnalysis(trader.id, analysis);
}

function maybeCloseTrades(trader, timestamp) {
  const currentPrices = assetPriceMap.value;
  tradesStore.openPositions
    .filter((trade) => trade.aiTrader === trader.id)
    .forEach((trade) => {
      const price = currentPrices[trade.asset]?.price ?? trade.entryPrice;
      const hitTp = trade.type === 'long' ? price >= trade.takeProfit : price <= trade.takeProfit;
      const hitSl = trade.type === 'long' ? price <= trade.stopLoss : price >= trade.stopLoss;
      const holdProbability = trader.riskTolerance === 'Baja' ? 0.2 : 0.35;
      const shouldClose = hitTp || hitSl || Math.random() > holdProbability;
      if (shouldClose) {
        const closed = tradesStore.closeTrade(trade.id, price, timestamp);
        if (closed) {
          tradersStore.updateBalance(trader.id, closed.pnl, { time: timestamp });
          tradersStore.registerTrade(trader.id, closed);
          const summary = `${trader.name} cierra ${trade.asset} con P&L de $${closed.pnl.toFixed(2)}.`;
          tradersStore.setAnalysis(trader.id, summary);
        }
      }
    });
}

function runSimulationTick() {
  const { timestamp } = marketStore.generateNextTick();
  tradersStore.traderList.forEach((trader) => {
    maybeCloseTrades(trader, timestamp);
    maybeOpenTrade(trader, timestamp);
  });
}

onMounted(() => {
  marketStore.generateNextTick();
  runSimulationTick();
  intervalId = setInterval(runSimulationTick, 1500);
});

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>
