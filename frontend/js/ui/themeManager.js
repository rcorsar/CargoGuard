// Light & Dark Theme Switcher (persisted in localStorage)
function initTheme() {
  const saved = localStorage.getItem(APP_CONFIG.THEME_KEY);
  const btn = document.getElementById("themeToggleBtn");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    if (btn) btn.textContent = "Светлая тема";
  } else {
    document.documentElement.removeAttribute("data-theme");
    if (btn) btn.textContent = "Темная тема";
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggleBtn");
  if (root.getAttribute("data-theme") === "dark") {
    root.removeAttribute("data-theme");
    localStorage.setItem(APP_CONFIG.THEME_KEY, "light");
    btn.textContent = "Темная тема";
  } else {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem(APP_CONFIG.THEME_KEY, "dark");
    btn.textContent = "Светлая тема";
  }
}
