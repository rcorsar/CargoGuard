// Клиент API. Пока сервер молчит, страница остаётся на своих демо-данных.
const ApiService = {
  baseUrl: APP_CONFIG.API_BASE_URL,
  isBackendConnected: false,

  async checkConnection() {
    try {
      const res = await fetch(`${this.baseUrl}/api/state`);
      if (!res.ok) return null;
      const data = await res.json();
      this.isBackendConnected = true;
      return data;
    } catch (e) {
      this.isBackendConnected = false;
      return null;
    }
  },

  async post(endpoint, payload) {
    return this._send("POST", endpoint, payload);
  },

  async remove(endpoint) {
    return this._send("DELETE", endpoint, null);
  },

  async _send(method, endpoint, payload) {
    if (!this.isBackendConnected) return { ok: false, offline: true, data: null };
    try {
      const options = { method, headers: {} };
      if (payload) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(payload);
      }
      const res = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      this.isBackendConnected = false;
      return { ok: false, offline: true, data: null };
    }
  }
};

function replaceOrder(order) {
  const index = AppState.orders.findIndex((item) => item.id === order.id);
  if (index >= 0) AppState.orders[index] = order;
  else AppState.orders.unshift(order);
}

function serverRefused(res) {
  if (!res || res.offline || res.ok) return false;
  const detail = res.data && res.data.detail ? res.data.detail : "Сервер отклонил действие";
  showToast(detail);
  return true;
}
