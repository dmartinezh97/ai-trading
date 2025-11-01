<template>
  <n-card :class="['border border-slate-800 bg-slate-900/60 backdrop-blur-sm transition', 'hover:border-slate-700']" size="small">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-800 text-2xl">
          {{ trader.avatar }}
        </div>
        <div>
          <p class="text-sm uppercase tracking-wide text-slate-400">{{ trader.name }}</p>
          <p class="text-xs text-slate-500">{{ trader.analysisStyle }} · Riesgo {{ trader.riskTolerance }}</p>
        </div>
      </div>
      <n-tag type="success" round>
        Balance {{ currency(trader.balance) }}
      </n-tag>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div>
        <p class="text-slate-500">P&L Diario</p>
        <p :class="trader.dailyPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ currency(trader.dailyPnl) }}</p>
      </div>
      <div>
        <p class="text-slate-500">Win rate</p>
        <p>{{ trader.stats.winRate }}%</p>
      </div>
      <div>
        <p class="text-slate-500">Mejor trade</p>
        <p>{{ trader.stats.bestTrade ? currency(trader.stats.bestTrade.pnl) : '—' }}</p>
      </div>
      <div>
        <p class="text-slate-500">Drawdown máx.</p>
        <p>{{ currency(-trader.stats.maxDrawdown) }}</p>
      </div>
    </div>

    <div class="mt-4 rounded-md bg-slate-800/70 p-3 text-xs leading-relaxed text-slate-300">
      <p class="mb-1 font-semibold text-slate-200">Último análisis</p>
      <p>{{ trader.lastAnalysis }}</p>
    </div>
  </n-card>
</template>

<script setup>
import NaiveUI from 'naive-ui';

const { NCard, NTag } = NaiveUI;

const props = defineProps({
  trader: {
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
</script>
