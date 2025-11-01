import { defineStore } from 'pinia';

const BASE_BALANCE = 10000;

const strategies = {
  grok: {
    id: 'grok',
    name: 'Grok',
    color: 'grok',
    avatar: '🤖',
    riskTolerance: 'Alta',
    preferredAssets: ['BTC', 'ETH'],
    analysisStyle: 'Técnico'
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    color: 'claude',
    avatar: '🧠',
    riskTolerance: 'Media',
    preferredAssets: ['AAPL', 'TSLA', 'ETH'],
    analysisStyle: 'Fundamental'
  },
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    color: 'chatgpt',
    avatar: '💡',
    riskTolerance: 'Baja',
    preferredAssets: ['AAPL', 'TSLA'],
    analysisStyle: 'Mixta'
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    color: 'gemini',
    avatar: '🌌',
    riskTolerance: 'Variable',
    preferredAssets: ['BTC', 'ETH', 'TSLA'],
    analysisStyle: 'Cuantitativa'
  }
};

export const useTradersStore = defineStore('traders', {
  state: () => ({
    traders: Object.values(strategies).reduce((acc, trader) => {
      acc[trader.id] = {
        ...trader,
        balance: BASE_BALANCE,
        startOfDayBalance: BASE_BALANCE,
        balanceHistory: [
          {
            time: Date.now(),
            balance: BASE_BALANCE
          }
        ],
        lastAnalysis: 'Inicializando estrategia...',
        stats: {
          bestTrade: null,
          worstTrade: null,
          winRate: 0,
          totalTrades: 0,
          wins: 0,
          maxDrawdown: 0,
          peakBalance: BASE_BALANCE
        }
      };
      return acc;
    }, {})
  }),
  getters: {
    traderList: (state) => Object.values(state.traders)
  },
  actions: {
    updateBalance(traderId, delta, meta = {}) {
      const trader = this.traders[traderId];
      if (!trader) return;
      trader.balance = Number((trader.balance + delta).toFixed(2));
      trader.balanceHistory.push({ time: meta.time ?? Date.now(), balance: trader.balance });
      trader.balanceHistory = trader.balanceHistory.slice(-240);
      trader.stats.peakBalance = Math.max(trader.stats.peakBalance, trader.balance);
      const drawdown = trader.stats.peakBalance - trader.balance;
      trader.stats.maxDrawdown = Math.max(trader.stats.maxDrawdown, Number(drawdown.toFixed(2)));
    },
    registerTrade(traderId, trade) {
      const trader = this.traders[traderId];
      if (!trader) return;
      trader.stats.totalTrades += 1;
      if (trade.pnl && trade.pnl > 0) {
        trader.stats.wins += 1;
      }
      trader.stats.winRate = trader.stats.totalTrades
        ? Number(((trader.stats.wins / trader.stats.totalTrades) * 100).toFixed(1))
        : 0;
      if (!trader.stats.bestTrade || (trade.pnl ?? -Infinity) > (trader.stats.bestTrade.pnl ?? -Infinity)) {
        trader.stats.bestTrade = trade;
      }
      if (!trader.stats.worstTrade || (trade.pnl ?? Infinity) < (trader.stats.worstTrade.pnl ?? Infinity)) {
        trader.stats.worstTrade = trade;
      }
    },
    setAnalysis(traderId, analysis) {
      const trader = this.traders[traderId];
      if (!trader) return;
      trader.lastAnalysis = analysis;
    }
  }
});
