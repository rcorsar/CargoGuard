// Controller & AI-Camera Inspection Module (BPMN: AI-System + Controller lanes)
function getBoxesForCurrentDirection() {
  const targetStage = AppState.currentDirection === "send" ? "warehouse_send" : "warehouse_return";
  return AppState.orders.filter((o) => o.stage === targetStage);
}

function populateBoxesDropdown() {
  const selectEl = document.getElementById("boxSelect");
  const available = getBoxesForCurrentDirection();
  selectEl.innerHTML = "";

  if (available.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = AppState.currentDirection === "send"
      ? "Нет посылок на отправку (создайте в Бухгалтерии)"
      : "Нет возвратов из ПВЗ";
    selectEl.appendChild(opt);
    AppState.currentBox = null;
    resetCameraCard(true);
    return;
  }

  available.forEach((box) => {
    const opt = document.createElement("option");
    opt.value = box.id;
    opt.textContent = `${box.id} • ${box.weightKg} кг • ${box.name}`;
    selectEl.appendChild(opt);
  });

  if (!AppState.currentBox || !available.some((b) => b.id === AppState.currentBox.id)) {
    selectBoxById(available[0].id);
  } else {
    selectEl.value = AppState.currentBox.id;
  }
}

function onBoxSelectChange() {
  const id = document.getElementById("boxSelect").value;
  if (id) selectBoxById(id);
}

function onWeightCategoryChange() {
  const chosenGroup = document.getElementById("weightCategorySelect").value;
  const match = getBoxesForCurrentDirection().find((b) => b.group === chosenGroup);
  if (match) {
    document.getElementById("boxSelect").value = match.id;
    selectBoxById(match.id);
  } else {
    showToast(`В категории ${chosenGroup} кг нет коробок в текущей очереди`);
  }
}

function selectBoxById(boxId) {
  const found = AppState.orders.find((b) => b.id === boxId);
  if (!found) return;
  AppState.currentBox = found;

  document.getElementById("weightCategorySelect").value = found.group;
  document.getElementById("autoWeightInput").value = found.weightKg + " кг";
  document.getElementById("tariffBadge").textContent = "+" + found.pay + " ₽";
  resetCameraCard(false);
}

function resetCameraCard(isEmpty) {
  AppState.qrScanned = false;
  AppState.isScanningNow = false;

  const camBox = document.getElementById("aiCamContainer");
  camBox.classList.remove("scanned", "scanning");
  document.getElementById("camPulse").className = "pulse-dot";
  document.getElementById("camFeedStage").classList.remove("visible");
  document.getElementById("scanTimestamp").textContent = isEmpty ? "—" : "Ожидание";

  document.getElementById("camStatusText").textContent = isEmpty
    ? "Очередь пуста"
    : `Коробка ${AppState.currentBox.id} на столе (${AppState.currentDirection === "send" ? "отправка" : "возврат"})`;

  ["valQr", "valName", "valSpecs", "valWeight", "valSeller", "valBuyer", "valDates", "valDefects"].forEach((id) => {
    document.getElementById(id).textContent = "—";
  });

  const scanBtn = document.getElementById("btnScanQR");
  scanBtn.disabled = isEmpty;
  scanBtn.textContent = AppState.currentDirection === "send"
    ? "🔍 Сканировать QR-код (ИИ-система)"
    : "🔍 Прием возврата и скан QR-кода (ИИ-система)";

  document.querySelectorAll(".chk-step").forEach((el) => (el.checked = false));
  document.getElementById("inspectorComment").value = "";
  validateChecklist();
}

function startAICameraScan() {
  if (AppState.isScanningNow || !AppState.currentBox) return;
  AppState.isScanningNow = true;
  const box = AppState.currentBox;

  const camBox = document.getElementById("aiCamContainer");
  const stage = document.getElementById("camFeedStage");
  const stageMsg = document.getElementById("camStageMessage");
  const scanBtn = document.getElementById("btnScanQR");
  const pulse = document.getElementById("camPulse");

  camBox.classList.remove("scanned");
  camBox.classList.add("scanning");
  pulse.className = "pulse-dot scanning";
  stage.classList.add("visible");
  scanBtn.disabled = true;

  document.getElementById("camStatusText").textContent = "Открытие камеры...";
  stageMsg.innerHTML = "📷 <strong>Открытие камеры...</strong>";
  scanBtn.textContent = "⏳ Открытие камеры...";

  setTimeout(() => {
    document.getElementById("camStatusText").textContent = "Сканирование QR...";
    stageMsg.innerHTML = "🤖 <strong>Чтение QR-кода " + box.qr + "...</strong>";
    scanBtn.textContent = "⏳ Сканирование...";
  }, 550);

  setTimeout(async () => {
    AppState.isScanningNow = false;
    AppState.qrScanned = true;
    const nowStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (ApiService.isBackendConnected) {
      const photoRes = await ApiService.post(`/api/orders/${box.id}/photo-card`, {
        role: AppState.currentRole,
        actorName: document.getElementById("activeUserName").textContent
      });
      if (photoRes && photoRes.ok && photoRes.data && photoRes.data.order) {
        replaceOrder(photoRes.data.order);
        if (photoRes.data.log) AppState.logs.unshift(photoRes.data.log);
        renderAll();
      }
    }

    stage.classList.remove("visible");
    camBox.classList.remove("scanning");
    camBox.classList.add("scanned");
    pulse.className = "pulse-dot active";

    document.getElementById("camStatusText").textContent = "✅ QR отсканирован ИИ-системой";
    document.getElementById("scanTimestamp").textContent = nowStr;

    document.getElementById("valQr").textContent = box.qr;
    document.getElementById("valName").textContent = box.name;
    document.getElementById("valSpecs").textContent = box.specs;
    document.getElementById("valWeight").textContent = `${box.weightKg} кг (${box.group} кг)`;
    document.getElementById("valSeller").textContent = box.seller;
    document.getElementById("valBuyer").textContent = `${box.buyer} (${box.amount.toLocaleString("ru-RU")} ₽)`;
    document.getElementById("valDates").textContent = box.dates;
    document.getElementById("valDefects").textContent = box.defects;

    scanBtn.disabled = false;
    scanBtn.textContent = "🔄 Пересканировать QR-код";

    showToast("Отсканировано: " + box.name);
    validateChecklist();
  }, 1250);
}

function setInspectionDirection(dir) {
  AppState.currentDirection = dir;
  document.getElementById("modeSendCard").className = "mode-card" + (dir === "send" ? " active-send" : "");
  document.getElementById("modeReturnCard").className = "mode-card" + (dir === "return" ? " active-return" : "");

  if (dir === "send") {
    document.getElementById("chkLabel1").textContent = "Коробка вскрыта под камерой, товар соответствует описанию";
    document.getElementById("chkLabel2").textContent = "Серийный номер и пломбы совпадают";
    document.getElementById("chkLabel3").textContent = "Брак и повреждения отсутствуют";
    document.getElementById("btnGreenApprove").textContent = "✅ Товар без брака → Доставка в ПВЗ";
    document.getElementById("btnRedReject").textContent = "❌ Брак → Возврат продавцу (3 дня) / утилизация";
  } else {
    document.getElementById("chkLabel1").textContent = "Возврат вскрыт под камерой: подмены нет";
    document.getElementById("chkLabel2").textContent = "Серийный номер и пломбы совпадают с отправкой";
    document.getElementById("chkLabel3").textContent = "Товар в порядке, новых дефектов нет";
    document.getElementById("btnGreenApprove").textContent = "✅ Товар в порядке → Возврат денег покупателю и товара продавцу";
    document.getElementById("btnRedReject").textContent = "❌ Подмена → Спор 3 дня и выплата продавцу";
  }
  populateBoxesDropdown();
}

function validateChecklist() {
  const allChecked = Array.from(document.querySelectorAll(".chk-step")).every((c) => c.checked);
  const wrapper = document.getElementById("checklistBox");
  const alertBox = document.getElementById("validationAlert");
  const btnApprove = document.getElementById("btnGreenApprove");
  const btnReject = document.getElementById("btnRedReject");

  if (!AppState.currentBox) {
    wrapper.className = "checklist-wrapper";
    alertBox.className = "validation-alert";
    alertBox.textContent = "Нет доступных коробок в этом потоке";
    btnApprove.disabled = true;
    btnReject.disabled = true;
    return;
  }

  btnReject.disabled = !AppState.qrScanned;

  if (AppState.qrScanned && allChecked) {
    wrapper.className = "checklist-wrapper valid";
    alertBox.className = "validation-alert ok";
    alertBox.textContent = "✔ Проверка пройдена. Доступно подтверждение.";
    btnApprove.disabled = false;
  } else {
    wrapper.className = "checklist-wrapper";
    alertBox.className = "validation-alert";
    alertBox.textContent = !AppState.qrScanned
      ? "Отсканируйте QR-код ИИ-камерой и отметьте пункты чек-листа"
      : "Отметьте все пункты чек-листа";
    btnApprove.disabled = true;
  }
}

async function recordInspectionDecision(isApproved) {
  const box = AppState.currentBox;
  if (!AppState.qrScanned || !box) {
    showToast("Сначала отсканируйте QR-код!");
    return;
  }

  const allChecked = Array.from(document.querySelectorAll(".chk-step")).every((c) => c.checked);
  const note = document.getElementById("inspectorComment").value.trim();
  const actorName = document.getElementById("activeUserName").textContent;
  const timeNow = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const flowName = AppState.currentDirection === "send" ? "Отправка" : "Возврат";

  const res = await ApiService.post(`/api/orders/${box.id}/inspect`, {
    role: AppState.currentRole,
    direction: AppState.currentDirection,
    approved: isApproved,
    qrScanned: AppState.qrScanned,
    checklistOk: allChecked,
    note,
    actorName
  });
  if (ApiService.isBackendConnected) {
    if (serverRefused(res)) return;
    replaceOrder(res.data.order);
    if (res.data.log) AppState.logs.unshift(res.data.log);
    StorageService.saveState(AppState);
    showToast(res.data.repeated ? `Осмотр ${box.id} уже сохранён` : `Осмотр ${box.id} сохранён`);
    renderAll();
    return;
  }

  let statusDesc = "";
  if (AppState.currentDirection === "send") {
    box.stage = isApproved ? "in_pvz" : "cancelled_defect";
    box.moneyStatus = isApproved
      ? "Заморожены (В ПВЗ покупателя)"
      : "Возврат покупателю (Брак — отмена заказа)";
    statusDesc = isApproved
      ? "Товар без брака → Доставка в ПВЗ"
      : "Брак → Возврат продавцу (3 дня) / отмена";
  } else {
    box.stage = isApproved ? "return_completed" : "dispute_closed";
    box.moneyStatus = isApproved
      ? "Возвращено покупателю (Контролер)"
      : "Выплачено продавцу (Спор 3 дня закрыт)";
    statusDesc = isApproved
      ? "Возврат денег покупателю и товара продавцу"
      : "Спор 3 дня и выплата продавцу";
  }

  AppState.logs.unshift({
    id: "LOG-" + (AppState.logs.length + 1),
    time: timeNow,
    boxId: box.id,
    qr: box.qr,
    flow: flowName,
    item: box.name,
    weight: `${box.weightKg} кг`,
    parties: `${box.seller} ⇄ ${box.buyer}`,
    status: note ? `${statusDesc} (${note})` : statusDesc,
    actor: `${actorName} (Контролер)`,
    ok: isApproved,
    pay: box.pay
  });

  StorageService.saveState(AppState);
  showToast(`Сохранено! Начислено +${box.pay} ₽ за ${box.id}`);
  renderAll();
}

function renderControllerShiftTable() {
  const shiftTbody = document.getElementById("shiftHistoryBody");
  shiftTbody.innerHTML = "";

  let totalRub = 0;
  let controllerCount = 0;

  AppState.logs.forEach((rec) => {
    if (rec.pay > 0) {
      totalRub += rec.pay;
      controllerCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${rec.time}</strong></td>
        <td>
          <strong>${rec.item}</strong><br>
          <span style="font-size:11px; color:var(--text-muted);">${rec.boxId} • ${rec.flow}</span>
        </td>
        <td>${rec.weight}</td>
        <td><span class="status-pill ${rec.ok ? "ok" : "bad"}">${rec.status}</span></td>
        <td><strong style="color:var(--accent-green);">+${rec.pay} ₽</strong></td>
      `;
      shiftTbody.appendChild(tr);
    }
  });

  document.getElementById("kpiTotalBoxes").textContent = controllerCount;
  document.getElementById("kpiTotalRub").textContent = totalRub.toLocaleString("ru-RU") + " ₽";
}
