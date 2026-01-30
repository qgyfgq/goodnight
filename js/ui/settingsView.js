import { updateStorageDisplay } from "./dataSettings.js";

export const initSettingsView = () => {
  const homeView = document.getElementById("homeView");
  const settingsView = document.getElementById("settingsView");
  const backButton = document.getElementById("settingsBack");
  const settingsTitle = document.getElementById("settingsTitle");
  const settingsMain = document.getElementById("settingsMain");
  const apiSection = document.getElementById("apiSettings");
  const apiEntry = document.getElementById("apiSettingsEntry");
  const dataSection = document.getElementById("dataSettings");
  const dataEntry = document.getElementById("dataSettingsEntry");
  const soundSection = document.getElementById("soundSettings");
  const soundEntry = document.getElementById("soundSettingsEntry");

  if (
    !homeView ||
    !settingsView ||
    !backButton ||
    !settingsTitle ||
    !settingsMain ||
    !apiSection ||
    !apiEntry ||
    !dataSection ||
    !dataEntry ||
    !soundSection ||
    !soundEntry
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
    dataSection.classList.remove("active");
    soundSection.classList.remove("active");
    settingsMain.style.display = "flex";
    apiSection.style.display = "none";
    dataSection.style.display = "none";
    soundSection.style.display = "none";
    playTransition(settingsMain);
    setTitle("设置");
  };

  const showApiDetail = () => {
    settingsMain.classList.remove("active");
    apiSection.classList.add("active");
    dataSection.classList.remove("active");
    soundSection.classList.remove("active");
    settingsMain.style.display = "none";
    apiSection.style.display = "flex";
    dataSection.style.display = "none";
    soundSection.style.display = "none";
    playTransition(apiSection);
    setTitle("API 设置");
  };

  const showDataDetail = () => {
    settingsMain.classList.remove("active");
    apiSection.classList.remove("active");
    dataSection.classList.add("active");
    soundSection.classList.remove("active");
    settingsMain.style.display = "none";
    apiSection.style.display = "none";
    dataSection.style.display = "flex";
    soundSection.style.display = "none";
    playTransition(dataSection);
    setTitle("数据管理");
    // 显示数据管理主列表
    showDataMainList();
  };

  // 数据管理子页面元素
  const dataSettingsMain = document.getElementById("dataSettingsMain");
  const storageDetail = document.getElementById("storageDetail");
  const backupDetail = document.getElementById("backupDetail");
  const cleanDetail = document.getElementById("cleanDetail");
  const storageEntry = document.getElementById("storageEntry");
  const backupEntry = document.getElementById("backupEntry");
  const cleanEntry = document.getElementById("cleanEntry");

  // 显示数据管理主列表
  const showDataMainList = () => {
    dataSettingsMain?.classList.add("active");
    storageDetail?.classList.remove("active");
    backupDetail?.classList.remove("active");
    cleanDetail?.classList.remove("active");
    dataSection.dataset.detail = "list";
    setTitle("数据管理");
  };

  // 显示存储空间详情
  const showStorageDetail = () => {
    dataSettingsMain?.classList.remove("active");
    storageDetail?.classList.add("active");
    backupDetail?.classList.remove("active");
    cleanDetail?.classList.remove("active");
    dataSection.dataset.detail = "detail";
    setTitle("存储空间");
    updateStorageDisplay();
  };

  // 显示数据备份详情
  const showBackupDetail = () => {
    dataSettingsMain?.classList.remove("active");
    storageDetail?.classList.remove("active");
    backupDetail?.classList.add("active");
    cleanDetail?.classList.remove("active");
    dataSection.dataset.detail = "detail";
    setTitle("数据备份");
  };

  // 显示清理数据详情
  const showCleanDetail = () => {
    dataSettingsMain?.classList.remove("active");
    storageDetail?.classList.remove("active");
    backupDetail?.classList.remove("active");
    cleanDetail?.classList.add("active");
    dataSection.dataset.detail = "detail";
    setTitle("清理数据");
  };

  const showSoundDetail = () => {
    settingsMain.classList.remove("active");
    apiSection.classList.remove("active");
    dataSection.classList.remove("active");
    soundSection.classList.add("active");
    settingsMain.style.display = "none";
    apiSection.style.display = "none";
    dataSection.style.display = "none";
    soundSection.style.display = "flex";
    playTransition(soundSection);
    setTitle("提示音设置");
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
  dataEntry.addEventListener("click", showDataDetail);
  soundEntry.addEventListener("click", showSoundDetail);

  // 数据管理子页面点击事件
  storageEntry?.addEventListener("click", showStorageDetail);
  backupEntry?.addEventListener("click", showBackupDetail);
  cleanEntry?.addEventListener("click", showCleanDetail);

  backButton.addEventListener("click", () => {
    // 检查是否在数据管理的子详情页
    if (dataSection.classList.contains("active") && dataSection.dataset.detail === "detail") {
      showDataMainList();
      return;
    }

    // 检查是否在提示音设置的子详情页
    if (soundSection.classList.contains("active") && soundSection.dataset.detail === "detail") {
      // 返回提示音主列表（由 soundSettings.js 处理）
      const soundSettingsMain = document.getElementById("soundSettingsMain");
      const uiSoundDetail = document.getElementById("uiSoundDetail");
      const msgSoundDetail = document.getElementById("msgSoundDetail");
      soundSettingsMain?.classList.add("active");
      uiSoundDetail?.classList.remove("active");
      msgSoundDetail?.classList.remove("active");
      soundSection.dataset.detail = "list";
      setTitle("提示音设置");
      return;
    }

    if (
      apiSection.classList.contains("active") ||
      dataSection.classList.contains("active") ||
      soundSection.classList.contains("active")
    ) {
      showMainList();
    } else {
      showHome();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsView.classList.contains("active")) {
      // 检查是否在数据管理的子详情页
      if (dataSection.classList.contains("active") && dataSection.dataset.detail === "detail") {
        showDataMainList();
        return;
      }

      if (
        soundSection.classList.contains("active") &&
        soundSection.dataset.detail === "detail"
      ) {
        backButton.click();
        return;
      }

      if (
        apiSection.classList.contains("active") ||
        dataSection.classList.contains("active") ||
        soundSection.classList.contains("active")
      ) {
        showMainList();
      } else {
        showHome();
      }
    }
  });

  bindSettingsApp();
  showHome(); // 确保初始为主页
};
