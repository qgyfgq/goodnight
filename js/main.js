import { homeApps, dockApps } from "./data/apps.js";
import { initStatusBar } from "./widgets/statusBar.js";
import { initPhotoWidget } from "./widgets/photoWidget.js";
import { renderApps } from "./ui/appRenderer.js";
import { initSettingsView } from "./ui/settingsView.js";
import { initApiSettings } from "./ui/apiSettings.js";

const setup = async () => {
  // 初始化状态栏（时间和电池）
  await initStatusBar();

  // 初始化照片小组件
  initPhotoWidget();

  // 渲染中部应用
  const appGrid = document.getElementById("appGrid");
  renderApps(appGrid, homeApps);

  // 渲染底部 Dock
  const dock = document.getElementById("dock");
  renderApps(dock, dockApps);

  // 初始化设置页切换
  initSettingsView();

  // 初始化 API 设置交互
  initApiSettings();
};

document.addEventListener("DOMContentLoaded", setup);
