// Administrator Module: Settings, 3% Commission, Tariffs, Order Management & Demo Reset
async function saveAdminSettings() {
  const commissionPct = parseFloat(document.getElementById("admCommissionPct").value);
  const tariff1 = parseInt(document.getElementById("admTariff1").value, 10);
  const tariff2 = parseInt(document.getElementById("admTariff2").value, 10);
  const tariff3 = parseInt(document.getElementById("admTariff3").value, 10);

  await ApiService.post("/api/admin/settings", {
    role: AppState.currentRole,
    commissionPct,
    tariff1,
    tariff2,
    tariff3
  }).then((res) => {
    if (ApiService.isBackendConnected && serverRefused(res)) return;
    applyAdminSettings(commissionPct, tariff1, tariff2, tariff3);
  });
}

function applyAdminSettings(commissionPct, tariff1, tariff2, tariff3) {
  if (!isNaN(commissionPct) && commissionPct >= 0 && commissionPct <= 25) {
    AppState.commissionRate = commissionPct / 100;
  }
  if (!isNaN(tariff1) && tariff1 > 0) AppState.tariffs["0-3"] = tariff1;
  if (!isNaN(tariff2) && tariff2 > 0) AppState.tariffs["3-20"] = tariff2;
  if (!isNaN(tariff3) && tariff3 > 0) AppState.tariffs["20+"] = tariff3;

  StorageService.saveState(AppState);
  updateCommissionPreview();
  renderAll();
  showToast("Параметры комиссии и тарифов сохранены");
}

async function adminDeleteOrder(boxId) {
  const res = await ApiService.remove(`/api/orders/${boxId}?role=${AppState.currentRole}`);
  if (ApiService.isBackendConnected && serverRefused(res)) return;
  AppState.orders = AppState.orders.filter((o) => o.id !== boxId);
  StorageService.saveState(AppState);
  renderAll();
  showToast(`Заказ ${boxId} удален Администратором`);
}

function adminResetDemoData() {
  const fresh = StorageService.resetState();
  AppState.commissionRate = fresh.commissionRate;
  AppState.tariffs = fresh.tariffs;
  AppState.users = fresh.users;
  AppState.orders = fresh.orders;
  AppState.logs = fresh.logs;
  renderAll();
  showToast("Демо-данные сброшены к исходному состоянию");
}

function renderAdminView() {
  const pct = Math.round(AppState.commissionRate * 100);
  document.getElementById("admCommissionPct").value = pct;
  document.getElementById("admTariff1").value = AppState.tariffs["0-3"];
  document.getElementById("admTariff2").value = AppState.tariffs["3-20"];
  document.getElementById("admTariff3").value = AppState.tariffs["20+"];

  const usersBody = document.getElementById("adminUsersBody");
  usersBody.innerHTML = "";
  AppState.users.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${u.id}</strong></td>
      <td><strong>${u.name}</strong></td>
      <td>${u.roleLabel}</td>
      <td>${u.point}</td>
      <td><span class="status-pill ok">${u.status}</span></td>
    `;
    usersBody.appendChild(tr);
  });

  const ordersBody = document.getElementById("adminOrdersBody");
  ordersBody.innerHTML = "";
  AppState.orders.forEach((o) => {
    const meta = getStageMeta(o.stage);
    const { commission } = calculateCommission(o.amount, AppState.commissionRate);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${o.id}</strong></td>
      <td>${o.name} (${o.weightKg} кг)</td>
      <td>${o.amount.toLocaleString("ru-RU")} ₽ (${pct}%: ${commission.toLocaleString("ru-RU")} ₽)</td>
      <td><span class="status-pill ${meta.cls}">${meta.label}</span></td>
      <td><button class="btn btn-sm btn-reject" onclick="adminDeleteOrder('${o.id}')">Удалить</button></td>
    `;
    ordersBody.appendChild(tr);
  });
}
