// Global Constants: 3% Commission, Weight Groups, Default Tariffs, Stage Badges
const APP_CONFIG = {
  STORAGE_KEY: "cargoguard_5post_state_v1",
  THEME_KEY: "cargoguard_5post_theme_v1",
  API_BASE_URL: "http://127.0.0.1:8000",
  DEFAULT_COMMISSION_RATE: 0.03, // 3% комиссия от стоимости заказа
  DEFAULT_TARIFFS: {
    "0-3": 600,
    "3-20": 1100,
    "20+": 1750
  },
  STAGE_META: {
    warehouse_send: { label: "На проверке (Отправка)", cls: "info" },
    in_pvz: { label: "В ПВЗ покупателя", cls: "warn" },
    warehouse_return: { label: "Возврат (У контролера)", cls: "warn" },
    deal_closed: { label: "Сделка закрыта", cls: "ok" },
    return_completed: { label: "Возврат завершен", cls: "ok" },
    dispute_closed: { label: "Спор закрыт", cls: "bad" },
    cancelled_defect: { label: "Отмена заказа (Брак)", cls: "bad" }
  }
};

function determineWeightGroup(weightKg) {
  if (weightKg <= 3) return "0-3";
  if (weightKg <= 20) return "3-20";
  return "20+";
}

function calculateCommission(amount, rate) {
  const commission = Math.round(amount * rate);
  return { commission, sellerPayout: amount - commission };
}
