import { defineStore } from 'pinia';

function buildTrade({ traderId, asset, type, entryPrice, size, analysis, timestamp }) {
  return {
    id: `${traderId}-${timestamp}`,
    aiTrader: traderId,
    asset,
    type,
    entryPrice,
    size,
    timestamp,
    status: 'open',
    analysis,
    stopLoss: Number((entryPrice * (type === 'long' ? 0.97 : 1.03)).toFixed(2)),
    takeProfit: Number((entryPrice * (type === 'long' ? 1.03 : 0.97)).toFixed(2))
  };
}

export const useTradesStore = defineStore('trades', {
  state: () => ({
    openPositions: [],
    history: [],
    analyses: []
  }),
  getters: {
    groupedByTrader: (state) => {
      return state.openPositions.reduce((acc, trade) => {
        acc[trade.aiTrader] = acc[trade.aiTrader] || [];
        acc[trade.aiTrader].push(trade);
        return acc;
      }, {});
    },
    lastAnalyses: (state) => {
      return state.analyses.slice(-8).reverse();
    }
  },
  actions: {
    createTrade(payload) {
      const trade = buildTrade(payload);
      this.openPositions.push(trade);
      this.analyses.push({
        id: trade.id,
        aiTrader: payload.traderId,
        summary: payload.analysis,
        timestamp: payload.timestamp
      });
      return trade;
    },
    closeTrade(tradeId, exitPrice, timestamp) {
      const index = this.openPositions.findIndex((trade) => trade.id === tradeId);
      if (index === -1) return null;
      const trade = this.openPositions[index];
      this.openPositions.splice(index, 1);
      const pnl = Number(
        (
          (trade.type === 'long'
            ? (exitPrice - trade.entryPrice) * trade.size
            : (trade.entryPrice - exitPrice) * trade.size)
        ).toFixed(2)
      );
      const closedTrade = {
        ...trade,
        status: 'closed',
        exitPrice: Number(exitPrice.toFixed(2)),
        pnl,
        closeTimestamp: timestamp
      };
      this.history.unshift(closedTrade);
      this.history = this.history.slice(0, 200);
      return closedTrade;
    }
  }
});
