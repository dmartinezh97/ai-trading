import { defineStore } from 'pinia';

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 31500 },
  { symbol: 'ETH', name: 'Ethereum', price: 2200 },
  { symbol: 'AAPL', name: 'Apple', price: 189 },
  { symbol: 'TSLA', name: 'Tesla', price: 172 }
];

function evolvePrice(price) {
  const drift = (Math.random() - 0.5) * 0.02; // +/-1%
  const volatility = Math.random() * 0.015;
  const shock = (Math.random() < 0.05 ? (Math.random() - 0.5) * 0.12 : 0);
  const next = price * (1 + drift + volatility + shock);
  return Math.max(next, price * 0.5, 5);
}

export const useMarketStore = defineStore('market', {
  state: () => ({
    assets: ASSETS.map((asset) => ({
      ...asset,
      history: [
        {
          time: Date.now(),
          price: asset.price
        }
      ]
    })),
    tick: 0
  }),
  getters: {
    assetsMap: (state) => {
      return state.assets.reduce((acc, asset) => {
        acc[asset.symbol] = asset;
        return acc;
      }, {});
    }
  },
  actions: {
    generateNextTick() {
      const timestamp = Date.now();
      this.assets = this.assets.map((asset) => {
        const nextPrice = Number(evolvePrice(asset.price).toFixed(2));
        const history = asset.history.slice(-120);
        history.push({ time: timestamp, price: nextPrice });
        return {
          ...asset,
          price: nextPrice,
          history
        };
      });
      this.tick += 1;
      return {
        timestamp,
        assets: this.assets.map((asset) => ({
          symbol: asset.symbol,
          name: asset.name,
          price: asset.price
        }))
      };
    }
  }
});
