<template>
  <n-card class="border border-slate-800 bg-slate-900/60">
    <template #header>
      <h2 class="text-lg font-semibold">Mercado en vivo</h2>
    </template>
    <div class="space-y-3">
      <div v-for="asset in assets" :key="asset.symbol" class="flex items-center justify-between rounded-lg bg-slate-800/60 p-3">
        <div>
          <p class="text-sm font-semibold text-slate-200">{{ asset.name }} <span class="text-xs text-slate-500">{{ asset.symbol }}</span></p>
          <p class="text-xs text-slate-500">Variación 24h: {{ asset.change.toFixed(2) }}%</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-emerald-400">{{ currency(asset.price) }}</p>
          <p class="text-xs text-slate-500">Volatilidad: {{ (asset.volatility * 100).toFixed(1) }}%</p>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { computed } from 'vue';
import NaiveUI from 'naive-ui';

const { NCard } = NaiveUI;

const props = defineProps({
  marketAssets: {
    type: Array,
    required: true
  }
});

const assets = computed(() =>
  props.marketAssets.map((asset) => {
    const history = asset.history ?? [];
    const reference = history[0]?.price ?? asset.price;
    const change = reference ? ((asset.price - reference) / reference) * 100 : 0;
    const prices = history.slice(-20).map((entry) => entry.price);
    const avg = prices.reduce((acc, value) => acc + value, 0) / (prices.length || 1);
    const variance = prices.reduce((acc, value) => acc + (value - avg) ** 2, 0) / (prices.length || 1);
    const volatility = Math.sqrt(variance) / (avg || 1);
    return {
      ...asset,
      change,
      volatility
    };
  })
);

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
</script>
