import { homeApps, dockApps } from "./data/apps.js";
import { initStatusBar } from "./widgets/statusBar.js";
import { renderApps } from "./ui/appRenderer.js";

const setup = async () => {
  // 初始化状态栏（时间和电池）
  await initStatusBar();

  // 渲染中部应用
  const appGrid = document.getElementById("appGrid");
  renderApps(appGrid, homeApps);

  // 渲染底部 Dock
  const dock = document.getElementById("dock");
  renderApps(dock, dockApps);
};

document.addEventListener("DOMContentLoaded", setup);
