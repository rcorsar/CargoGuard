// Role Switching & Tab Navigation
function getStageMeta(stage) {
  return APP_CONFIG.STAGE_META[stage] || { label: stage, cls: "info" };
}

function onRoleChange() {
  const selectedRole = document.getElementById("roleSelect").value;
  applyRoleAccess(selectedRole);
}

function applyRoleAccess(role) {
  AppState.currentRole = role;
  const userObj = AppState.users.find((u) => u.role === role) || AppState.users[0];
  document.getElementById("activeUserName").textContent = userObj.name;
  document.getElementById("activePointName").textContent = userObj.point;

  const btnWork = document.getElementById("tabBtnWorkplace");
  const btnAcc = document.getElementById("tabBtnAccounting");
  const btnAdm = document.getElementById("tabBtnAdmin");
  const btnSec = document.getElementById("tabBtnSecurity");

  if (role === "controller") {
    btnWork.classList.remove("hidden");
    btnAcc.classList.add("hidden");
    btnAdm.classList.add("hidden");
    btnSec.classList.remove("hidden");
    switchMainTab("workplace");
  } else if (role === "accounting") {
    btnWork.classList.add("hidden");
    btnAcc.classList.remove("hidden");
    btnAdm.classList.add("hidden");
    btnSec.classList.remove("hidden");
    switchMainTab("accounting");
  } else if (role === "security") {
    btnWork.classList.add("hidden");
    btnAcc.classList.add("hidden");
    btnAdm.classList.add("hidden");
    btnSec.classList.remove("hidden");
    switchMainTab("security");
  } else {
    btnWork.classList.remove("hidden");
    btnAcc.classList.remove("hidden");
    btnAdm.classList.remove("hidden");
    btnSec.classList.remove("hidden");
    switchMainTab("admin");
  }

  renderAll();
  showToast(`Роль: ${userObj.roleLabel} (${userObj.name})`);
}

function switchMainTab(tabName) {
  AppState.currentTab = tabName;
  const views = {
    workplace: document.getElementById("viewWorkplace"),
    accounting: document.getElementById("viewAccounting"),
    admin: document.getElementById("viewAdmin"),
    security: document.getElementById("viewSecurity")
  };
  const btns = {
    workplace: document.getElementById("tabBtnWorkplace"),
    accounting: document.getElementById("tabBtnAccounting"),
    admin: document.getElementById("tabBtnAdmin"),
    security: document.getElementById("tabBtnSecurity")
  };

  Object.keys(views).forEach((key) => {
    views[key].classList.toggle("hidden", key !== tabName);
    btns[key].classList.toggle("active", key === tabName);
  });
}
