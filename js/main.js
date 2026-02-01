import { homeApps, dockApps } from "./data/apps.js";
import { initStatusBar } from "./widgets/statusBar.js";
import { initPhotoWidget } from "./widgets/photoWidget.js";
import { renderApps } from "./ui/appRenderer.js";
import { initSettingsView } from "./ui/settingsView.js";
import { initApiSettings } from "./ui/apiSettings.js";
import { initDataSettings } from "./ui/dataSettings.js";
import { initSoundSettings } from "./ui/soundSettings.js";
import { initUiSoundTrigger } from "./audio/uiSoundTrigger.js";
import { getAudioManager } from "./audio/audioManager.js";
import { initXinliaoView } from "./ui/xinliaoView.js";
import { initWorldbookView } from "./ui/worldbookView.js";
import { initBeautifyView } from "./ui/beautifyView.js";
import { initMusicView } from "./ui/musicView.js";
import { initHomeGardenView } from "./ui/homeGardenView.js";
import { migrateFromLocalStorage } from "./storage/indexedDB.js";

const setup = async () => {
  // 迁移旧数据（从 localStorage 到 IndexedDB）
  await migrateFromLocalStorage();

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

  // 初始化数据管理设置交互
  initDataSettings();

  // 初始化提示音设置交互
  initSoundSettings();

  // 预加载音频文件（减少首次播放延迟）
  getAudioManager().preload();

  // 初始化 UI 提示音全局触发
  initUiSoundTrigger();

  // 初始化信聊视图
  await initXinliaoView();

  // 初始化世界书视图
  initWorldbookView();

  // 初始化美化视图
  initBeautifyView();

  // 初始化音乐视图
  initMusicView();

  // 初始化家园视图
  initHomeGardenView();
};

document.addEventListener("DOMContentLoaded", setup);
