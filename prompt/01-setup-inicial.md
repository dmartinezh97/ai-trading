# Prompt 1: Setup Inicial y Estructura del Proyecto

## Objetivo
Crear la estructura base del proyecto con Astro, Vue 3, Tailwind CSS y configurar todas las dependencias necesarias.

## Comandos de Inicialización

```bash
# 1. Crear proyecto Astro
npm create astro@latest ai-trading-simulator -- --template minimal --typescript

# 2. Entrar al directorio
cd ai-trading-simulator

# 3. Instalar dependencias core
npm install vue @astrojs/vue @astrojs/tailwind
npm install pinia @pinia/nuxt
npm install chart.js vue-chartjs date-fns

# 4. Instalar UI framework (elegir uno)
# Opción A: Naive UI
npm install naive-ui @css-render/vue3-ssr

# Opción B: PrimeVue
npm install primevue primeicons

# 5. Instalar utilidades
npm install axios uuid lodash-es
npm install -D @types/lodash-es @types/uuid

# 6. Instalar dependencias para WebSocket
npm install socket.io-client

# 7. Instalar para cálculos financieros
npm install decimal.js
```

## Configuración de Astro (astro.config.mjs)

```javascript
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    vue({
      appEntrypoint: '/src/pages/_app'
    }), 
    tailwind()
  ],
  vite: {
    ssr: {
      external: ['naive-ui']
    }
  }
});
```

## Estructura de Carpetas

```
ai-trading-simulator/
├── src/
│   ├── components/
│   │   ├── trading/
│   │   │   ├── AITraderCard.vue
│   │   │   ├── PositionCard.vue
│   │   │   ├── TradeHistory.vue
│   │   │   └── MarketTicker.vue
│   │   ├── charts/
│   │   │   ├── BalanceChart.vue
│   │   │   ├── ProfitChart.vue
│   │   │   └── PerformanceMetrics.vue
│   │   ├── modals/
│   │   │   ├── TradeDetailsModal.vue
│   │   │   └── AnalysisModal.vue
│   │   └── common/
│   │       ├── LoadingSpinner.vue
│   │       └── NotificationToast.vue
│   │
│   ├── stores/
│   │   ├── traders.ts
│   │   ├── market.ts
│   │   ├── trades.ts
│   │   └── settings.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── marketData.ts
│   │   │   └── priceFeeds.ts
│   │   ├── trading/
│   │   │   ├── orderExecution.ts
│   │   │   └── riskManagement.ts
│   │   └── websocket/
│   │       └── priceUpdates.ts
│   │
│   ├── utils/
│   │   ├── calculations/
│   │   │   ├── pnl.ts
│   │   │   ├── commission.ts
│   │   │   └── metrics.ts
│   │   ├── strategies/
│   │   │   ├── momentum.ts
│   │   │   ├── meanRevert.ts
│   │   │   ├── breakout.ts
│   │   │   └── base.ts
│   │   ├── formatters/
│   │   │   ├── currency.ts
│   │   │   └── percentage.ts
│   │   └── constants/
│   │       ├── trading.ts
│   │       └── aiProfiles.ts
│   │
│   ├── types/
│   │   ├── trading.ts
│   │   ├── market.ts
│   │   └── ai.ts
│   │
│   ├── layouts/
│   │   └── TradingLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro
│   │   └── _app.ts
│   │
│   └── styles/
│       └── global.css
│
├── public/
│   └── assets/
│       └── ai-avatars/
│
└── package.json
```

## Archivo de configuración TypeScript (tsconfig.json)

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "preserve",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@stores/*": ["src/stores/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

## Configuración de Tailwind (tailwind.config.mjs)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ai-grok': '#8B5CF6',
        'ai-claude': '#06B6D4',
        'ai-chatgpt': '#10B981',
        'ai-gemini': '#F59E0B',
        'profit': '#10B981',
        'loss': '#EF4444',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'balance-update': 'balanceUpdate 0.5s ease-in-out',
      },
      keyframes: {
        balanceUpdate: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

## App Entry Point (src/pages/_app.ts)

```typescript
import type { App } from 'vue';
import { createPinia } from 'pinia';

// Si usas Naive UI
import { 
  create,
  NButton,
  NCard,
  NDataTable,
  NStatistic,
  NTag,
  NSpace,
  NGrid,
  NGridItem,
  NModal,
  NInput,
  NSelect,
  NDatePicker,
  NMessageProvider,
  NNotificationProvider
} from 'naive-ui';

export default (app: App) => {
  const pinia = createPinia();
  app.use(pinia);

  // Configurar Naive UI
  const naive = create({
    components: [
      NButton,
      NCard,
      NDataTable,
      NStatistic,
      NTag,
      NSpace,
      NGrid,
      NGridItem,
      NModal,
      NInput,
      NSelect,
      NDatePicker,
      NMessageProvider,
      NNotificationProvider
    ]
  });
  
  app.use(naive);
};
```

## Estilos Globales (src/styles/global.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-profit: 16 185 129;
    --color-loss: 239 68 68;
    --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100;
  }
}

@layer components {
  .card-base {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 
           border border-gray-200 dark:border-gray-700
           transition-all duration-300;
  }

  .btn-primary {
    @apply px-4 py-2 bg-blue-600 hover:bg-blue-700 
           text-white rounded-md font-medium
           transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-blue-500;
  }

  .profit-text {
    @apply text-green-600 dark:text-green-400;
  }

  .loss-text {
    @apply text-red-600 dark:text-red-400;
  }

  .loading-pulse {
    @apply animate-pulse bg-gray-200 dark:bg-gray-700 rounded;
  }
}

@layer utilities {
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.gray.400') transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: theme('colors.gray.400');
    border-radius: 3px;
  }
}
```

## Variables de Entorno (.env)

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

# Trading Configuration
VITE_INITIAL_BALANCE=10000
VITE_MAX_POSITION_SIZE=0.2
VITE_DEFAULT_COMMISSION=0.001

# Market Data Sources
VITE_CRYPTO_API_KEY=your_crypto_api_key
VITE_STOCK_API_KEY=your_stock_api_key

# Feature Flags
VITE_ENABLE_PAPER_TRADING=true
VITE_ENABLE_REAL_TIME_DATA=false
```

## Scripts en package.json

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx,.vue",
    "format": "prettier --write \"src/**/*.{ts,tsx,vue,astro}\"",
    "type-check": "vue-tsc --noEmit"
  }
}
```

## Siguiente Paso
Una vez configurado el proyecto base, el siguiente prompt será para implementar los tipos TypeScript y las interfaces necesarias para el sistema de trading.

## Verificación
Ejecuta estos comandos para verificar que todo está configurado correctamente:

```bash
npm run dev
# La aplicación debe iniciar en http://localhost:4321
```
