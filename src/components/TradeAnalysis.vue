<template>
  <n-card class="border border-slate-800 bg-slate-900/60">
    <template #header>
      <h2 class="text-lg font-semibold">Análisis de las IAs</h2>
    </template>
    <div v-if="analyses.length" class="space-y-3">
      <div v-for="analysis in analyses" :key="analysis.id" class="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>{{ traderLabel(analysis.aiTrader) }}</span>
          <span>{{ formatTime(analysis.timestamp) }}</span>
        </div>
        <p class="mt-2 text-sm text-slate-200">{{ analysis.summary }}</p>
      </div>
    </div>
    <n-empty v-else description="Aún no hay análisis" />
  </n-card>
</template>

<script setup>
import NaiveUI from 'naive-ui';

const { NCard, NEmpty } = NaiveUI;

const props = defineProps({
  analyses: {
    type: Array,
    required: true
  }
});

const traderLabel = (id) =>
  ({
    grok: 'Grok',
    claude: 'Claude',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini'
  })[id] ?? id;

const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('es-ES');
</script>
