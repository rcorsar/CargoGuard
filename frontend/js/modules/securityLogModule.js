// Audit & Security Log Module (ReadOnly for Controller/Accounting, Delete for Admin)
async function adminDeleteLog(logId) {
  if (AppState.currentRole !== "admin") return;
  const res = await ApiService.remove(`/api/logs/${logId}?role=${AppState.currentRole}`);
  if (ApiService.isBackendConnected && serverRefused(res)) return;
  AppState.logs = AppState.logs.filter((l) => l.id !== logId);
  StorageService.saveState(AppState);
  renderAll();
  showToast(`Запись ${logId} удалена`);
}

function renderSecurityLogView() {
  const secTbody = document.getElementById("securityHistoryBody");
  secTbody.innerHTML = "";

  AppState.logs.forEach((rec) => {
    const accessCell = AppState.currentRole === "admin"
      ? `<td><button class="btn btn-sm btn-reject" onclick="adminDeleteLog('${rec.id}')">Удалить</button></td>`
      : `<td><span class="status-pill info">ReadOnly</span></td>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>22.11.2026 ${rec.time}</td>
      <td><strong>${rec.qr}</strong> (${rec.boxId})</td>
      <td>${rec.flow}</td>
      <td><strong>${rec.item}</strong></td>
      <td>${rec.weight}</td>
      <td>${rec.parties}</td>
      <td><span class="status-pill ${rec.ok ? "ok" : "bad"}">${rec.status}</span></td>
      <td>${rec.actor}</td>
      ${accessCell}
    `;
    secTbody.appendChild(tr);
  });

  document.getElementById("secBadgeCount").textContent = AppState.logs.length;
}
