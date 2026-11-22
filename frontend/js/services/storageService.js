// LocalStorage Persistence Service (keeps state across page reloads)
const StorageService = {
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  createDefaultState() {
    return {
      commissionRate: APP_CONFIG.DEFAULT_COMMISSION_RATE,
      tariffs: this.clone(APP_CONFIG.DEFAULT_TARIFFS),
      users: this.clone(MOCK_USERS),
      orders: this.clone(MOCK_ORDERS),
      logs: this.clone(MOCK_LOGS)
    };
  },

  loadState() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
      if (!raw) return this.createDefaultState();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.orders) || !Array.isArray(parsed.logs)) {
        return this.createDefaultState();
      }
      return parsed;
    } catch (e) {
      return this.createDefaultState();
    }
  },

  saveState(stateObj) {
    try {
      const payload = {
        commissionRate: stateObj.commissionRate,
        tariffs: stateObj.tariffs,
        users: stateObj.users,
        orders: stateObj.orders,
        logs: stateObj.logs
      };
      localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignore storage quota errors in private browsing
    }
  },

  resetState() {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
    return this.createDefaultState();
  }
};
