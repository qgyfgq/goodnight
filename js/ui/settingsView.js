export const initSettingsView = () => {
  const homeView = document.getElementById("homeView");
  const settingsView = document.getElementById("settingsView");
  const backButton = document.getElementById("settingsBack");
  const settingsTitle = document.getElementById("settingsTitle");
  const settingsMain = document.getElementById("settingsMain");
  const apiSection = document.getElementById("apiSettings");
  const apiEntry = document.getElementById("apiSettingsEntry");

  if (
    !homeView ||
    !settingsView ||
    !backButton ||
    !settingsTitle ||
    !settingsMain ||
    !apiSection ||
    !apiEntry
  )
    return;

  const setTitle = (text) => {
    settingsTitle.textContent = text;
  };

  const playTransition = (el) => {
    el.classList.remove("transition-in");
    // 触发重绘以重新播放动画
    void el.offsetWidth;
    el.classList.add("transition-in");
  };

  const showMainList = () => {
    settingsMain.classList.add("active");
    apiSection.classList.remove("active");
    settingsMain.style.display = "flex";
    apiSection.style.display = "none";
    playTransition(settingsMain);
    setTitle("设置");
  };

  const showApiDetail = () => {
    settingsMain.classList.remove("active");
    apiSection.classList.add("active");
    settingsMain.style.display = "none";
    apiSection.style.display = "flex";
    playTransition(apiSection);
    setTitle("API 设置");
  };

  const showHome = () => {
    homeView.classList.remove("is-hidden");
    settingsView.classList.remove("active");
    showMainList();
  };

  const showSettings = () => {
    homeView.classList.add("is-hidden");
    settingsView.classList.add("active");
    showMainList();
  };

  // 绑定 Dock 内“设置”应用
  const bindSettingsApp = () => {
    const settingsApps = document.querySelectorAll('.app[data-app-name="设置"]');
    settingsApps.forEach((app) => {
      app.addEventListener("click", showSettings);
    });
  };

  apiEntry.addEventListener("click", showApiDetail);

  backButton.addEventListener("click", () => {
    if (apiSection.classList.contains("active")) {
      showMainList();
    } else {
      showHome();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsView.classList.contains("active")) {
      if (apiSection.classList.contains("active")) {
        showMainList();
      } else {
        showHome();
      }
    }
  });

  bindSettingsApp();
  showHome(); // 确保初始为主页
};
