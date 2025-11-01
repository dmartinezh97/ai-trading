<template>
  <n-card class="border border-slate-800 bg-slate-900/60">
    <template #header>
      <h2 class="text-lg font-semibold">Estadísticas clave</h2>
    </template>
    <div class="grid gap-4 sm:grid-cols-2">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300"
      >
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ stat.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-slate-100">{{ stat.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ stat.subtitle }}</p>
      </div>
    </div>
  </n-card>
</template>

<script setup>
import { computed } from 'vue';
import NaiveUI from 'naive-ui';

const { NCard } = NaiveUI;

const props = defineProps({
  traders: {
    type: Array,
    required: true
  }
});

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);

const stats = computed(() => {
  const balances = props.traders.map((trader) => trader.balance);
  const best = props.traders.reduce((acc, trader) => (trader.balance > acc.balance ? trader : acc), props.traders[0]);
  const worst = props.traders.reduce((acc, trader) => (trader.balance < acc.balance ? trader : acc), props.traders[0]);
  const avgWinRate =
    props.traders.reduce((acc, trader) => acc + trader.stats.winRate, 0) / (props.traders.length || 1);
  const totalPnl = props.traders.reduce((acc, trader) => acc + (trader.balance - trader.startOfDayBalance), 0);
  return [
    {
      label: 'Balance medio',
      value: currency(balances.reduce((a, b) => a + b, 0) / (balances.length || 1)),
      subtitle: 'Promedio de las cuatro estrategias'
    },
    {
      label: 'Mejor desempeño',
      value: `${best?.name ?? '—'} · ${currency(best?.balance ?? 0)}`,
      subtitle: 'Mayor balance actual'
    },
    {
      label: 'Peor desempeño',
      value: `${worst?.name ?? '—'} · ${currency(worst?.balance ?? 0)}`,
      subtitle: 'Balance más bajo'
    },
    {
      label: 'Win rate promedio',
      value: `${avgWinRate.toFixed(1)}%`,
      subtitle: 'Éxito medio ponderado'
    },
    {
      label: 'P&L agregado',
      value: currency(totalPnl),
      subtitle: 'Ganancia o pérdida global acumulada'
    }
  ];
});
</script>
