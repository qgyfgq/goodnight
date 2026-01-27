import { homeApps, dockApps } from "./data/apps.js";
import { initTimeWidget } from "./widgets/timeWidget.js";
import { renderApps } from "./ui/appRenderer.js";

const setup = () => {
  // 渲染时间
  const timeEl = document.getElementById("timeText");
  initTimeWidget(timeEl);

  // 渲染中部应用
  const appGrid = document.getElementById("appGrid");
  renderApps(appGrid, homeApps);

  // 渲染底部 Dock
  const dock = document.getElementById("dock");
  renderApps(dock, dockApps);
};

document.addEventListener("DOMContentLoaded", setup);
