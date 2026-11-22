// CargoGuard Frontend Entrypoint
const saved = StorageService.loadState();

const AppState = {
  commissionRate: saved.commissionRate,
  tariffs: saved.tariffs,
  users: saved.users,
  orders: saved.orders,
  logs: saved.logs,
  currentRole: "controller",
  currentTab: "workplace",
  currentDirection: "send",
  qrScanned: false,
  isScanningNow: false,
  currentBox: null
};

function renderAll() {
  populateBoxesDropdown();
  renderControllerShiftTable();
  renderAccountingView();
  renderAdminView();
  renderSecurityLogView();
  updateCommissionPreview();
}

async function initApp() {
  initTheme();
  const remoteState = await ApiService.checkConnection();
  if (remoteState && Array.isArray(remoteState.orders)) {
    AppState.commissionRate = remoteState.commissionRate;
    AppState.tariffs = remoteState.tariffs;
    AppState.users = remoteState.users;
    AppState.orders = remoteState.orders;
    AppState.logs = remoteState.logs;
  }
  applyRoleAccess("controller");
  setInspectionDirection("send");
  renderAll();
}

window.addEventListener("DOMContentLoaded", initApp);
