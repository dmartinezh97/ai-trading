<template>
  <n-card class="border border-slate-800 bg-slate-900/60">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Historial de trades</h2>
        <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Total: {{ filteredTrades.length }}</span>
          <span>·</span>
          <a class="cursor-pointer text-emerald-400 hover:underline" @click="exportCsv">Exportar CSV</a>
        </div>
      </div>
    </template>
    <div class="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <n-select v-model:value="filters.ai" :options="aiOptions" placeholder="IA" clearable size="small" />
      <n-select v-model:value="filters.asset" :options="assetOptions" placeholder="Activo" clearable size="small" />
      <n-select v-model:value="filters.type" :options="typeOptions" placeholder="Tipo" clearable size="small" />
      <n-select v-model:value="filters.status" :options="statusOptions" placeholder="Estado" clearable size="small" />
    </div>
    <n-data-table :columns="columns" :data="filteredTrades" :bordered="false" size="small" />
  </n-card>
</template>

<script setup>
import { computed, reactive } from 'vue';
import NaiveUI from 'naive-ui';

const { NCard, NDataTable, NSelect } = NaiveUI;

const props = defineProps({
  trades: {
    type: Array,
    required: true
  }
});

const filters = reactive({
  ai: null,
  asset: null,
  type: null,
  status: null
});

const aiMap = {
  grok: 'Grok',
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini'
};

const aiOptions = Object.entries(aiMap).map(([value, label]) => ({ label, value }));

const assetOptions = computed(() => {
  const assets = new Set(props.trades.map((trade) => trade.asset));
  return Array.from(assets).map((asset) => ({ label: asset, value: asset }));
});

const typeOptions = [
  { label: 'Largo', value: 'long' },
  { label: 'Corto', value: 'short' }
];

const statusOptions = [
  { label: 'Abierto', value: 'open' },
  { label: 'Cerrado', value: 'closed' }
];

const columns = [
  {
    title: 'IA',
    key: 'aiTrader',
    render: (row) => aiMap[row.aiTrader]
  },
  {
    title: 'Activo',
    key: 'asset'
  },
  {
    title: 'Tipo',
    key: 'type',
    render: (row) => (row.type === 'long' ? 'Largo' : 'Corto')
  },
  {
    title: 'Entrada',
    key: 'entryPrice',
    render: (row) => `$${row.entryPrice.toFixed(2)}`
  },
  {
    title: 'Salida',
    key: 'exitPrice',
    render: (row) => (row.exitPrice ? `$${row.exitPrice.toFixed(2)}` : '—')
  },
  {
    title: 'P&L',
    key: 'pnl',
    render: (row) => {
      const value = row.pnl ?? 0;
      return `<span style="color:${value >= 0 ? '#34d399' : '#f87171'}">$${value.toFixed(2)}</span>`;
    }
  },
  {
    title: 'Estado',
    key: 'status',
    render: (row) => (row.status === 'closed' ? 'Cerrado' : 'Abierto')
  },
  {
    title: 'Análisis',
    key: 'analysis'
  }
];

const filteredTrades = computed(() =>
  props.trades.filter((trade) => {
    if (filters.ai && trade.aiTrader !== filters.ai) return false;
    if (filters.asset && trade.asset !== filters.asset) return false;
    if (filters.type && trade.type !== filters.type) return false;
    if (filters.status && trade.status !== filters.status) return false;
    return true;
  })
);

const exportCsv = () => {
  const header = ['IA', 'Activo', 'Tipo', 'Entrada', 'Salida', 'P&L', 'Estado', 'Análisis'];
  const rows = filteredTrades.value.map((trade) => [
    aiMap[trade.aiTrader],
    trade.asset,
    trade.type,
    trade.entryPrice,
    trade.exitPrice ?? '',
    trade.pnl ?? '',
    trade.status,
    trade.analysis
  ]);
  const csv = [header, ...rows]
    .map((line) => line.map((cell) => `"${cell}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'trade-history.csv');
  link.click();
  URL.revokeObjectURL(url);
};
</script>
