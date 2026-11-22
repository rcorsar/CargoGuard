// Accounting Module: Client Data, Escrow Freeze, 3% Commission & Seller Payouts
function updateCommissionPreview() {
  const amountVal = parseInt(document.getElementById("accAmount").value, 10) || 0;
  const pct = Math.round(AppState.commissionRate * 100);
  const { commission, sellerPayout } = calculateCommission(amountVal, AppState.commissionRate);

  document.getElementById("previewCommPct").textContent = pct + "%";
  document.getElementById("previewCommRub").textContent = commission.toLocaleString("ru-RU") + " ₽";
  document.getElementById("previewSellerRub").textContent = sellerPayout.toLocaleString("ru-RU") + " ₽";
}

async function createOrderFromAccounting(event) {
  event.preventDefault();

  const buyer = document.getElementById("accBuyerName").value.trim();
  const buyerPhone = document.getElementById("accBuyerPhone").value.trim();
  const buyerAccount = document.getElementById("accBuyerAccount").value.trim();
  const seller = document.getElementById("accSellerName").value.trim();
  const sellerAccount = document.getElementById("accSellerAccount").value.trim();
  const name = document.getElementById("accItemName").value.trim();
  const specs = document.getElementById("accItemSpecs").value.trim() || "Стандартная комплектация";
  const weightKg = parseFloat(document.getElementById("accWeight").value);
  const amount = parseInt(document.getElementById("accAmount").value, 10);
  const actorName = document.getElementById("activeUserName").textContent;

  if (!buyer || !seller || !name || isNaN(weightKg) || weightKg <= 0 || isNaN(amount) || amount <= 0) {
    showToast("Заполните корректно данные клиента, товар, вес и сумму");
    return;
  }

  const group = determineWeightGroup(weightKg);
  const payRate = AppState.tariffs[group];
  const { commission } = calculateCommission(amount, AppState.commissionRate);
  const pct = Math.round(AppState.commissionRate * 100);
  const newId = `BOX-${401 + AppState.orders.length}`;
  const newQr = `5POST-QR-${Math.floor(10000 + Math.random() * 89999)}`;
  const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  const res = await ApiService.post("/api/orders", {
    role: AppState.currentRole,
    buyer, buyerPhone, buyerAccount, seller, sellerAccount, name, specs, weightKg, amount, actorName
  });
  if (ApiService.isBackendConnected) {
    if (serverRefused(res)) return;
    replaceOrder(res.data.order);
    if (res.data.log) AppState.logs.unshift(res.data.log);
    StorageService.saveState(AppState);
    document.getElementById("accOrderForm").reset();
    updateCommissionPreview();
    renderAll();
    showToast(`Заказ ${res.data.order.id} заморожен и передан контролеру`);
    return;
  }

  AppState.orders.unshift({
    id: newId,
    qr: newQr,
    group,
    weightKg,
    name,
    specs,
    seller,
    sellerAccount: sellerAccount || "40802810000000123456",
    buyer,
    buyerPhone: buyerPhone || "+7 (978) 000-00-00",
    buyerAccount: buyerAccount || "40817810000000654321",
    amount,
    commission: 0,
    sellerPayout: 0,
    dates: `22.11 ${nowStr} → 23.11 18:00`,
    defects: "Нет",
    pay: payRate,
    stage: "warehouse_send",
    moneyStatus: `Заморожены (Эскроу 5Post, план. комиссия ${pct}%: ${commission.toLocaleString("ru-RU")} ₽)`
  });

  AppState.logs.unshift({
    id: "LOG-" + (AppState.logs.length + 1),
    time: nowStr,
    boxId: newId,
    qr: newQr,
    flow: "Бухгалтерия",
    item: name,
    weight: `${weightKg} кг`,
    parties: `${buyer} → Эскроу 5Post`,
    status: `Оплата и заморозка ${amount.toLocaleString("ru-RU")} ₽ (комиссия ${pct}%: ${commission.toLocaleString("ru-RU")} ₽)`,
    actor: actorName + " (Бухгалтерия)",
    ok: true,
    pay: 0
  });

  StorageService.saveState(AppState);
  document.getElementById("accOrderForm").reset();
  updateCommissionPreview();
  renderAll();
  showToast(`Заказ ${newId} заморожен (${amount.toLocaleString("ru-RU")} ₽) и передан Контролеру`);
}

async function accountingCompleteDeal(boxId) {
  const order = AppState.orders.find((o) => o.id === boxId);
  if (!order) return;

  const actorName = document.getElementById("activeUserName").textContent;
  const { commission, sellerPayout } = calculateCommission(order.amount, AppState.commissionRate);
  const pct = Math.round(AppState.commissionRate * 100);

  const res = await ApiService.post(`/api/orders/${boxId}/complete`, {
    role: AppState.currentRole,
    actorName
  });
  if (ApiService.isBackendConnected) {
    if (serverRefused(res)) return;
    replaceOrder(res.data.order);
    if (res.data.log) AppState.logs.unshift(res.data.log);
    StorageService.saveState(AppState);
    renderAll();
    showToast(res.data.repeated ? `Сделка ${boxId} уже закрыта` : `Сделка ${boxId} закрыта`);
    return;
  }

  order.stage = "deal_closed";
  order.commission = commission;
  order.sellerPayout = sellerPayout;
  order.moneyStatus = `Выплачено продавцу ${sellerPayout.toLocaleString("ru-RU")} ₽ (Комиссия ${pct}%: ${commission.toLocaleString("ru-RU")} ₽)`;

  const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  AppState.logs.unshift({
    id: "LOG-" + (AppState.logs.length + 1),
    time: nowStr,
    boxId: order.id,
    qr: order.qr,
    flow: "Бухгалтерия",
    item: order.name,
    weight: `${order.weightKg} кг`,
    parties: `Эскроу 5Post → ${order.seller}`,
    status: `Сделка закрыта (комиссия ${pct}%: ${commission.toLocaleString("ru-RU")} ₽, продавцу: ${sellerPayout.toLocaleString("ru-RU")} ₽)`,
    actor: actorName + " (Бухгалтерия)",
    ok: true,
    pay: 0
  });

  StorageService.saveState(AppState);
  renderAll();
  showToast(`Сделка ${boxId} закрыта! Комиссия ${pct}%: ${commission.toLocaleString("ru-RU")} ₽`);
}

async function sendOrderToReturn(boxId) {
  const order = AppState.orders.find((o) => o.id === boxId);
  if (!order) return;

  const actorName = document.getElementById("activeUserName").textContent;
  const res = await ApiService.post(`/api/orders/${boxId}/return`, {
    role: AppState.currentRole,
    actorName
  });
  if (ApiService.isBackendConnected) {
    if (serverRefused(res)) return;
    replaceOrder(res.data.order);
    if (res.data.log) AppState.logs.unshift(res.data.log);
    StorageService.saveState(AppState);
    renderAll();
    showToast(`Заказ ${boxId} передан на проверку возврата`);
    return;
  }

  order.stage = "warehouse_return";
  order.moneyStatus = "Заморожены (Возврат из ПВЗ)";

  const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  AppState.logs.unshift({
    id: "LOG-" + (AppState.logs.length + 1),
    time: nowStr,
    boxId: order.id,
    qr: order.qr,
    flow: "ПВЗ → Возврат",
    item: order.name,
    weight: `${order.weightKg} кг`,
    parties: `${order.buyer} (отказ в ПВЗ)`,
    status: "Направлен на скан QR и проверку возврата",
    actor: actorName,
    ok: false,
    pay: 0
  });

  StorageService.saveState(AppState);
  renderAll();
  showToast(`Заказ ${boxId} передан на проверку возврата Контролеру`);
}

function renderAccountingView() {
  let frozenSum = 0;
  let commissionSum = 0;
  let paidSellersSum = 0;
  let refundedBuyersSum = 0;
  const pct = Math.round(AppState.commissionRate * 100);

  const tbody = document.getElementById("accountingOrdersBody");
  tbody.innerHTML = "";

  AppState.orders.forEach((o) => {
    const calc = calculateCommission(o.amount, AppState.commissionRate);
    if (["warehouse_send", "in_pvz", "warehouse_return"].includes(o.stage)) {
      frozenSum += o.amount;
    }
    if (o.stage === "deal_closed") {
      const actualComm = o.commission || calc.commission;
      commissionSum += actualComm;
      paidSellersSum += (o.amount - actualComm);
    }
    if (o.stage === "dispute_closed") {
      paidSellersSum += o.amount;
    }
    if (o.stage === "return_completed" || o.stage === "cancelled_defect") {
      refundedBuyersSum += o.amount;
    }

    const meta = getStageMeta(o.stage);
    let actionHtml = `<span style="font-size:11.5px; color:var(--text-muted);">Завершено</span>`;

    if (o.stage === "in_pvz") {
      actionHtml = `
        <div class="action-stack">
          <button class="btn btn-sm btn-approve" onclick="accountingCompleteDeal('${o.id}')">Забрал → Списать ${pct}%</button>
          <button class="btn btn-sm btn-outline" onclick="sendOrderToReturn('${o.id}')">Отказ → Возврат</button>
        </div>
      `;
    } else if (o.stage === "warehouse_send") {
      actionHtml = `<span style="font-size:11.5px; color:var(--accent-blue);">У Контролера (Отправка)</span>`;
    } else if (o.stage === "warehouse_return") {
      actionHtml = `<span style="font-size:11.5px; color:var(--accent-amber);">У Контролера (Возврат)</span>`;
    }

    const shownComm = o.stage === "deal_closed" ? (o.commission || calc.commission) : calc.commission;
    const shownPayout = o.amount - shownComm;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${o.id}</strong><br><span style="font-size:11px; color:var(--text-muted);">${o.qr}</span></td>
      <td><strong>${o.name}</strong><br><span style="font-size:11px; color:var(--text-muted);">${o.weightKg} кг (${o.group} кг)</span></td>
      <td>
        <strong>${o.buyer}</strong><br>
        <span style="font-size:11px; color:var(--text-muted);">${o.buyerPhone}</span><br>
        <span style="font-size:10.5px; color:var(--text-muted);">Счет: ${o.buyerAccount}</span>
      </td>
      <td>
        <strong>${o.seller}</strong><br>
        <span style="font-size:10.5px; color:var(--text-muted);">Счет: ${o.sellerAccount}</span>
      </td>
      <td>
        <strong>${o.amount.toLocaleString("ru-RU")} ₽</strong><br>
        <span style="font-size:11px; color:var(--accent-green);">Комиссия ${pct}%: ${shownComm.toLocaleString("ru-RU")} ₽</span><br>
        <span style="font-size:10.5px; color:var(--text-muted);">Продавцу: ${shownPayout.toLocaleString("ru-RU")} ₽</span>
      </td>
      <td><span class="status-pill ${meta.cls}">${meta.label}</span></td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("accKpiFrozen").textContent = frozenSum.toLocaleString("ru-RU") + " ₽";
  document.getElementById("accKpiComm").textContent = commissionSum.toLocaleString("ru-RU") + " ₽";
  document.getElementById("accKpiPaid").textContent = paidSellersSum.toLocaleString("ru-RU") + " ₽";
  document.getElementById("accKpiRefund").textContent = refundedBuyersSum.toLocaleString("ru-RU") + " ₽";
  document.getElementById("accCommHint").textContent = pct + "%";
  document.getElementById("accBadgeCount").textContent = AppState.orders.filter(
    (o) => o.stage === "in_pvz" || o.stage === "warehouse_send"
  ).length;
}
