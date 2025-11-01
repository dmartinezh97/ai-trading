<template>
  <n-card class="border border-slate-800 bg-slate-900/60">
    <template #header>
      <h2 class="text-lg font-semibold">Posiciones abiertas</h2>
    </template>
    <div v-if="positions.length" class="space-y-3">
      <div
        v-for="position in positions"
        :key="position.id"
        class="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner transition hover:border-slate-700"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-200">
              {{ position.asset }} · {{ position.type === 'long' ? 'Largo' : 'Corto' }}
            </p>
            <p class="text-xs text-slate-500">{{ formatTrader(position.aiTrader) }} · {{ distanceLabel(position) }}</p>
          </div>
          <div class="text-right text-sm">
            <p class="text-slate-400">Entrada {{ currency(position.entryPrice) }}</p>
            <p :class="position.unrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'">
              P&L {{ currency(position.unrealized) }}
            </p>
          </div>
        </div>
        <div class="mt-4 h-2 rounded-full bg-slate-800">
          <div
            class="h-2 rounded-full"
            :class="position.unrealized >= 0 ? 'bg-emerald-500' : 'bg-rose-500'"
            :style="{ width: position.progress + '%' }"
          ></div>
        </div>
      </div>
    </div>
    <n-empty v-else size="large" description="Sin posiciones activas" />
  </n-card>
</template>

<script setup>
import { computed } from 'vue';
import NaiveUI from 'naive-ui';

const { NCard, NEmpty } = NaiveUI;

const props = defineProps({
  positions: {
    type: Array,
    required: true
  },
  assetPrices: {
    type: Object,
    required: true
  }
});

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);

const formatTrader = (traderId) =>
  ({
    grok: 'Grok',
    claude: 'Claude',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini'
  })[traderId] ?? traderId;

const positions = computed(() =>
  props.positions.map((position) => {
    const price = props.assetPrices[position.asset]?.price ?? position.entryPrice;
    const movement =
      position.type === 'long'
        ? (price - position.entryPrice) * position.size
        : (position.entryPrice - price) * position.size;
    const range = Math.abs(position.takeProfit - position.stopLoss);
    const progress = Math.min(100, Math.max(0, (Math.abs(price - position.entryPrice) / range) * 100));
    return {
      ...position,
      unrealized: Number(movement.toFixed(2)),
      progress: Number(progress.toFixed(2))
    };
  })
);

const distanceLabel = (position) => {
  const price = props.assetPrices[position.asset]?.price ?? position.entryPrice;
  const toTp = Math.abs(position.takeProfit - price);
  const toSl = Math.abs(position.stopLoss - price);
  return `A TP ${toTp.toFixed(2)} · A SL ${toSl.toFixed(2)}`;
};
</script>
