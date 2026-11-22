// Ready-to-connect REST API Client for Backend Integration
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
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      this.isBackendConnected = false;
      return null;
    }
  },

  async remove(endpoint) {
    if (!this.isBackendConnected) return null;
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, { method: "DELETE" });
      return await res.json();
    } catch (e) {
      this.isBackendConnected = false;
      return null;
    }
  }
};
