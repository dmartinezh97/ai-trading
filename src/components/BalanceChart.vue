<template>
  <n-card class="h-full border border-slate-800 bg-slate-900/60">
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Balance en tiempo real</h2>
        <span class="text-xs text-slate-400">Actualización cada segundo</span>
      </div>
    </template>
    <div class="h-80">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </n-card>
</template>

<script setup>
import { computed, watch } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Tooltip,
  Legend
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import NaiveUI from 'naive-ui';

const { NCard } = NaiveUI;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip, Legend);

const props = defineProps({
  traders: {
    type: Array,
    required: true
  }
});

const palette = {
  grok: '#FF6B6B',
  claude: '#4ECDC4',
  chatgpt: '#1A56DB',
  gemini: '#845EF7'
};

const chartData = computed(() => {
  return {
    labels: props.traders[0]?.balanceHistory.map((point) => point.time) ?? [],
    datasets: props.traders.map((trader) => ({
      label: trader.name,
      borderColor: palette[trader.id],
      backgroundColor: `${palette[trader.id]}33`,
      borderWidth: 2,
      data: trader.balanceHistory.map((point) => ({ x: point.time, y: point.balance })),
      tension: 0.35
    }))
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'nearest'
  },
  plugins: {
    legend: {
      labels: {
        color: '#cbd5f5'
      }
    },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
      }
    }
  },
  scales: {
    x: {
      type: 'time',
      time: {
        tooltipFormat: 'HH:mm:ss'
      },
      ticks: {
        color: '#94a3b8'
      },
      grid: {
        color: '#1e293b'
      }
    },
    y: {
      ticks: {
        color: '#94a3b8',
        callback: (value) => `$${value}`
      },
      grid: {
        color: '#1e293b'
      }
    }
  }
};

watch(
  () => props.traders.map((trader) => trader.balanceHistory.length),
  () => {
    // noop - computed handles reactivity, but watch keeps chart responsive when data changes
  }
);
</script>
