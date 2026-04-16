/**
 * 美化视图模块
 * 管理美化应用的所有交互
 */

import { homeApps, dockApps } from "../data/apps.js";

// 存储键
const STORAGE_KEY_ICON_STYLE = "beautifyIconStyle";
const STORAGE_KEY_CUSTOM_ICONS = "beautifyCustomIcons";
const STORAGE_KEY_ICON_OPACITY = "beautifyIconOpacity";
const STORAGE_KEY_FONT_SIZE = "beautifyFontSize";
const STORAGE_KEY_FONT_PRESETS = "beautifyFontPresets";
const STORAGE_KEY_ACTIVE_FONT = "beautifyActiveFont";

// 获取所有应用列表
const getAllApps = () => [...homeApps, ...dockApps];

// 加载图标风格设置
const loadIconStyle = () => {
  return localStorage.getItem(STORAGE_KEY_ICON_STYLE) || "rounded";
};

// 保存图标风格设置
const saveIconStyle = (style) => {
  localStorage.setItem(STORAGE_KEY_ICON_STYLE, style);
};

// 加载自定义图标
const loadCustomIcons = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ICONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// 保存自定义图标
const saveCustomIcons = (icons) => {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_ICONS, JSON.stringify(icons));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('存储空间不足！请尝试使用图片链接，或清理一些数据后重试。');
    }
    throw e;
  }
};

/**
 * 压缩图片
 * @param {string} dataUrl - 原始图片的 dataUrl
 * @param {number} maxSize - 最大尺寸（宽高）
 * @param {number} quality - 压缩质量 (0-1)
 * @returns {Promise<string>} - 压缩后的 dataUrl
 */
const compressImage = (dataUrl, maxSize = 128, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 计算缩放后的尺寸
      let width = img.width;
      let height = img.height;
      
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      
      // 创建 canvas 进行压缩
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为压缩后的 dataUrl
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

// 加载图标透明度设置
const loadIconOpacity = () => {
  return parseInt(localStorage.getItem(STORAGE_KEY_ICON_OPACITY) || "100", 10);
};

// 保存图标透明度设置
const saveIconOpacity = (opacity) => {
  localStorage.setItem(STORAGE_KEY_ICON_OPACITY, String(opacity));
};

// 应用图标透明度到页面
const applyIconOpacity = (opacity) => {
  const appIcons = document.querySelectorAll(".app-icon");
  appIcons.forEach((icon) => {
    icon.style.opacity = opacity / 100;
  });
};

// 应用图标风格到页面
const applyIconStyle = (style) => {
  const appIcons = document.querySelectorAll(".app-icon");
  appIcons.forEach((icon) => {
    icon.classList.remove("icon-rounded", "icon-circle", "icon-square", "icon-squircle");
    icon.classList.add(`icon-${style}`);
  });
};

// 当前编辑的图标
let currentEditingApp = null;
// 当前选择的图标 URL（用于文件上传）
let currentSelectedIconUrl = "";

export const initBeautifyView = () => {
  const homeView = document.getElementById("homeView");
  const beautifyView = document.getElementById("beautifyView");
  const backButton = document.getElementById("beautifyBack");
  const beautifyTitle = document.getElementById("beautifyTitle");
  const beautifyMain = document.getElementById("beautifyMain");

  // 子页面
  const iconSection = document.getElementById("beautifyIconSettings");
  const iconStyleSection = document.getElementById("beautifyIconStyleSection");
  const iconCustomSection = document.getElementById("beautifyIconCustomSection");
  const iconOpacitySection = document.getElementById("beautifyIconOpacitySection");
  const wallpaperSection = document.getElementById("beautifyWallpaperSettings");
  const fontSection = document.getElementById("beautifyFontSettings");
  const bubbleSection = document.getElementById("beautifyBubbleSettings");
  const globalSection = document.getElementById("beautifyGlobalSettings");

  // 入口按钮
  const iconEntry = document.getElementById("beautifyIconEntry");
  const iconStyleEntry = document.getElementById("beautifyIconStyleEntry");
  const iconCustomEntry = document.getElementById("beautifyIconCustomEntry");
  const iconOpacityEntry = document.getElementById("beautifyIconOpacityEntry");
  const wallpaperEntry = document.getElementById("beautifyWallpaperEntry");
  const fontEntry = document.getElementById("beautifyFontEntry");
  const bubbleEntry = document.getElementById("beautifyBubbleEntry");
  const globalEntry = document.getElementById("beautifyGlobalEntry");

  if (!homeView || !beautifyView || !backButton || !beautifyTitle || !beautifyMain) return;

  // 导航历史栈
  const navStack = [];

  const setTitle = (text) => {
    beautifyTitle.textContent = text;
  };

  const playTransition = (el) => {
    if (!el) return;
    el.classList.remove("transition-in");
    void el.offsetWidth;
    el.classList.add("transition-in");
  };

  const allSections = [
    iconSection, iconStyleSection, iconCustomSection, iconOpacitySection,
    wallpaperSection, fontSection, bubbleSection, globalSection
  ];

  const hideAllSections = () => {
    allSections.forEach(section => {
      if (section) {
        section.classList.remove("active");
        section.style.display = "none";
      }
    });
  };

  const showSection = (section, title, pushToStack = true) => {
    if (!section) return;
    
    if (pushToStack && beautifyMain.classList.contains("active")) {
      navStack.push({ section: beautifyMain, title: "美化" });
    } else if (pushToStack) {
      // 找到当前活动的 section
      const currentActive = allSections.find(s => s && s.classList.contains("active"));
      if (currentActive) {
        navStack.push({ section: currentActive, title: beautifyTitle.textContent });
      }
    }

    beautifyMain.classList.remove("active");
    beautifyMain.style.display = "none";
    hideAllSections();
    section.classList.add("active");
    section.style.display = "flex";
    playTransition(section);
    setTitle(title);
  };

  const showMainList = () => {
    navStack.length = 0;
    hideAllSections();
    beautifyMain.classList.add("active");
    beautifyMain.style.display = "flex";
    playTransition(beautifyMain);
    setTitle("美化");
  };

  const goBack = () => {
    if (navStack.length > 0) {
      const prev = navStack.pop();
      hideAllSections();
      beautifyMain.classList.remove("active");
      beautifyMain.style.display = "none";
      
      if (prev.section === beautifyMain) {
        beautifyMain.classList.add("active");
        beautifyMain.style.display = "flex";
      } else {
        prev.section.classList.add("active");
        prev.section.style.display = "flex";
      }
      playTransition(prev.section);
      setTitle(prev.title);
    } else {
      showHome();
    }
  };

  const showHome = () => {
    homeView.classList.remove("is-hidden");
    beautifyView.classList.remove("active");
    showMainList();
  };

  const showBeautify = () => {
    homeView.classList.add("is-hidden");
    beautifyView.classList.add("active");
    showMainList();
  };

  // 绑定 Dock 内"美化"应用
  const bindBeautifyApp = () => {
    const beautifyApps = document.querySelectorAll('.app[data-app-name="美化"]');
    beautifyApps.forEach((app) => {
      app.addEventListener("click", showBeautify);
    });
  };

  // 绑定入口点击事件
  iconEntry?.addEventListener("click", () => showSection(iconSection, "图标设置"));
  iconStyleEntry?.addEventListener("click", () => showSection(iconStyleSection, "图标风格"));
  iconCustomEntry?.addEventListener("click", () => {
    renderIconGrid();
    showSection(iconCustomSection, "图标设置");
  });
  iconOpacityEntry?.addEventListener("click", () => showSection(iconOpacitySection, "图标透明度"));
  wallpaperEntry?.addEventListener("click", () => showSection(wallpaperSection, "设置壁纸"));
  fontEntry?.addEventListener("click", () => showSection(fontSection, "字体设置"));
  bubbleEntry?.addEventListener("click", () => showSection(bubbleSection, "气泡设置"));
  globalEntry?.addEventListener("click", () => showSection(globalSection, "全局美化"));

  // 返回按钮
  backButton.addEventListener("click", goBack);

  // ESC 键返回
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && beautifyView.classList.contains("active")) {
      goBack();
    }
  });

  // 初始化各子模块的交互
  initIconStyleSettings();
  initIconCustomSettings();
  initIconOpacitySettings();
  initWallpaperSettings();
  initFontSettings();
  initBubbleSettings();
  initGlobalSettings();

  // 应用保存的图标风格和透明度
  const savedStyle = loadIconStyle();
  const savedOpacity = loadIconOpacity();
  setTimeout(() => {
    applyIconStyle(savedStyle);
    applyIconOpacity(savedOpacity);
  }, 100);

  bindBeautifyApp();
  showHome();
};

/**
 * 图标风格设置模块
 */
const initIconStyleSettings = () => {
  const styleOptions = document.querySelectorAll('#beautifyIconStyleOptions .beautify-option-item');
  const previewItems = document.querySelectorAll('#beautifyIconPreview .beautify-icon-preview-item');
  const confirmBtn = document.getElementById('beautifyIconStyleConfirm');
  
  // 当前选中的风格（未保存）
  let currentSelectedStyle = loadIconStyle();
  
  // 加载保存的风格
  const savedStyle = loadIconStyle();
  
  // 设置初始选中状态
  styleOptions.forEach(option => {
    const style = option.dataset.style;
    if (style === savedStyle) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });

  // 更新预览
  const updatePreview = (style) => {
    previewItems.forEach(item => {
      item.dataset.style = style;
    });
  };

  updatePreview(savedStyle);

  // 选项点击：只更新预览和选中状态
  styleOptions.forEach(option => {
    option.addEventListener('click', () => {
      const style = option.dataset.style;
      currentSelectedStyle = style;
      
      // 更新选中状态
      styleOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      
      // 更新预览
      updatePreview(style);
    });
  });

  // 确定按钮：保存并应用到桌面图标
  confirmBtn?.addEventListener('click', () => {
    saveIconStyle(currentSelectedStyle);
    applyIconStyle(currentSelectedStyle);
    
    // 显示成功提示（可选）
    confirmBtn.textContent = '✓ 已应用';
    confirmBtn.disabled = true;
    setTimeout(() => {
      confirmBtn.textContent = '✓ 确定应用';
      confirmBtn.disabled = false;
    }, 1500);
  });
};

/**
 * 渲染图标网格
 */
const renderIconGrid = () => {
  const grid = document.getElementById("beautifyIconGrid");
  if (!grid) return;

  const apps = getAllApps();
  const customIcons = loadCustomIcons();

  grid.innerHTML = apps.map(app => {
    const customIcon = customIcons[app.name];
    const iconSrc = customIcon || app.icon;
    
    return `
      <div class="beautify-icon-grid-item" data-app-name="${app.name}">
        <img class="beautify-icon-grid-item-img" src="${iconSrc}" alt="${app.name}" />
        <span class="beautify-icon-grid-item-name">${app.name}</span>
      </div>
    `;
  }).join('');

  // 绑定点击事件
  grid.querySelectorAll('.beautify-icon-grid-item').forEach(item => {
    item.addEventListener('click', () => {
      const appName = item.dataset.appName;
      openIconEditPopup(appName);
    });
  });
};

/**
 * 图标自定义设置模块
 */
const initIconCustomSettings = () => {
  const popup = document.getElementById("beautifyIconEditPopup");
  const resetAllBtn = document.getElementById("beautifyResetAllIcons");

  if (!popup) return;

  // 使用事件委托处理弹窗内的所有点击事件
  popup.addEventListener("click", (e) => {
    const target = e.target;
    
    // 点击背景关闭
    if (target === popup) {
      closeIconEditPopup();
      return;
    }
    
    // 取消按钮
    if (target.id === "beautifyIconEditCancel" || target.closest("#beautifyIconEditCancel")) {
      closeIconEditPopup();
      return;
    }
    
    // 恢复默认按钮
    if (target.id === "beautifyIconEditReset" || target.closest("#beautifyIconEditReset")) {
      if (!currentEditingApp) return;
      
      const customIcons = loadCustomIcons();
      delete customIcons[currentEditingApp];
      saveCustomIcons(customIcons);
      
      // 更新页面上的图标
      updateAppIcon(currentEditingApp, null);
      renderIconGrid();
      closeIconEditPopup();
      return;
    }
    
    // 确定按钮
    if (target.id === "beautifyIconEditConfirm" || target.closest("#beautifyIconEditConfirm")) {
      if (!currentEditingApp) return;
      
      // 优先使用模块变量，如果为空则尝试从输入框获取
      const url = currentSelectedIconUrl || document.getElementById("beautifyIconUrlInput")?.value?.trim();
      if (!url) {
        closeIconEditPopup();
        return;
      }

      const customIcons = loadCustomIcons();
      customIcons[currentEditingApp] = url;
      saveCustomIcons(customIcons);
      
      // 更新页面上的图标
      updateAppIcon(currentEditingApp, url);
      renderIconGrid();
      closeIconEditPopup();
      return;
    }
  });

  // URL 输入变化时更新预览和保存到变量
  popup.addEventListener("input", (e) => {
    if (e.target.id === "beautifyIconUrlInput") {
      const url = e.target.value.trim();
      currentSelectedIconUrl = url;
      const preview = document.getElementById("beautifyEditIconPreview");
      if (url && preview) {
        preview.innerHTML = `<img src="${url}" alt="预览" />`;
      }
    }
  });

  // 文件上传
  popup.addEventListener("change", async (e) => {
    if (e.target.id === "beautifyIconFileInput") {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result;
        if (dataUrl) {
          try {
            // 压缩图片到 128x128，质量 0.8
            const compressedUrl = await compressImage(dataUrl, 128, 0.8);
            // 保存到模块变量
            currentSelectedIconUrl = compressedUrl;
            // 同时更新输入框显示（显示压缩后的）
            const urlInput = document.getElementById("beautifyIconUrlInput");
            const preview = document.getElementById("beautifyEditIconPreview");
            if (urlInput) urlInput.value = compressedUrl;
            if (preview) preview.innerHTML = `<img src="${compressedUrl}" alt="预览" />`;
          } catch (err) {
            console.error('图片压缩失败:', err);
            // 如果压缩失败，使用原图
            currentSelectedIconUrl = dataUrl;
            const urlInput = document.getElementById("beautifyIconUrlInput");
            const preview = document.getElementById("beautifyEditIconPreview");
            if (urlInput) urlInput.value = dataUrl;
            if (preview) preview.innerHTML = `<img src="${dataUrl}" alt="预览" />`;
          }
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // 恢复所有默认图标
  resetAllBtn?.addEventListener("click", () => {
    if (!confirm("确定要恢复所有图标为默认吗？")) return;
    
    localStorage.removeItem(STORAGE_KEY_CUSTOM_ICONS);
    
    // 更新所有图标
    getAllApps().forEach(app => {
      updateAppIcon(app.name, null);
    });
    
    renderIconGrid();
  });
};

/**
 * 打开图标编辑弹窗
 */
const openIconEditPopup = (appName) => {
  const popup = document.getElementById("beautifyIconEditPopup");
  const preview = document.getElementById("beautifyEditIconPreview");
  const urlInput = document.getElementById("beautifyIconUrlInput");
  const fileInput = document.getElementById("beautifyIconFileInput");

  if (!popup) return;

  currentEditingApp = appName;

  // 获取当前图标
  const apps = getAllApps();
  const app = apps.find(a => a.name === appName);
  const customIcons = loadCustomIcons();
  const currentIcon = customIcons[appName] || app?.icon || "";
  const customUrl = customIcons[appName] || "";

  // 初始化模块变量（重要：每次打开弹窗时重置）
  currentSelectedIconUrl = customUrl;

  // 设置预览和输入
  if (preview) {
    preview.innerHTML = currentIcon ? `<img src="${currentIcon}" alt="预览" />` : "";
  }
  if (urlInput) {
    urlInput.value = customUrl;
  }
  if (fileInput) {
    fileInput.value = "";
  }

  popup.classList.add("active");
};

/**
 * 关闭图标编辑弹窗
 */
const closeIconEditPopup = () => {
  const popup = document.getElementById("beautifyIconEditPopup");
  if (popup) {
    popup.classList.remove("active");
  }
  currentEditingApp = null;
};

/**
 * 更新页面上的应用图标
 */
const updateAppIcon = (appName, iconUrl) => {
  const apps = getAllApps();
  const app = apps.find(a => a.name === appName);
  const defaultIcon = app?.icon || "";
  const newIcon = iconUrl || defaultIcon;

  // 更新主屏幕和 Dock 上的图标
  const appElements = document.querySelectorAll(`.app[data-app-name="${appName}"] .app-icon img`);
  appElements.forEach(el => {
    el.src = newIcon;
  });
};

// 存储键 - 壁纸
const STORAGE_KEY_WALLPAPER = "beautifyWallpaper";

// 当前选择的壁纸（未保存）
let currentSelectedWallpaper = { type: 'color', value: '#ffffff' };

// 加载壁纸设置
const loadWallpaper = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLPAPER);
    return raw ? JSON.parse(raw) : { type: 'color', value: '#ffffff' };
  } catch {
    return { type: 'color', value: '#ffffff' };
  }
};

// 保存壁纸设置
const saveWallpaper = (wallpaper) => {
  try {
    localStorage.setItem(STORAGE_KEY_WALLPAPER, JSON.stringify(wallpaper));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('存储空间不足！请尝试使用图片链接，或清理一些数据后重试。');
    }
    throw e;
  }
};

// 应用壁纸到页面
const applyWallpaper = (wallpaper) => {
  const device = document.querySelector('.device');
  if (!device) return;

  if (wallpaper.type === 'image') {
    // 先清除渐变背景
    device.style.background = 'none';
    // 然后设置图片背景
    device.style.backgroundImage = `url(${wallpaper.value})`;
    device.style.backgroundSize = 'cover';
    device.style.backgroundPosition = 'center';
    device.style.backgroundRepeat = 'no-repeat';
  } else {
    // 清除图片背景
    device.style.backgroundImage = 'none';
    device.style.backgroundSize = '';
    device.style.backgroundPosition = '';
    device.style.backgroundRepeat = '';
    // 设置颜色/渐变背景
    device.style.background = wallpaper.value;
  }
};

/**
 * 图标透明度设置模块
 */
const initIconOpacitySettings = () => {
  const slider = document.getElementById('beautifyIconOpacity');
  const valueDisplay = document.getElementById('beautifyIconOpacityValue');
  const previewItems = document.querySelectorAll('#beautifyIconOpacityPreview .beautify-icon-preview-item');
  const confirmBtn = document.getElementById('beautifyIconOpacityConfirm');

  // 当前选中的透明度（未保存）
  let currentSelectedOpacity = loadIconOpacity();

  // 加载保存的透明度
  const savedOpacity = loadIconOpacity();

  // 设置初始值
  if (slider) slider.value = savedOpacity;
  if (valueDisplay) valueDisplay.textContent = `${savedOpacity}%`;

  // 更新预览
  const updatePreview = (opacity) => {
    previewItems.forEach(item => {
      item.style.opacity = opacity / 100;
    });
  };

  updatePreview(savedOpacity);

  // 滑块输入：实时更新预览和显示值
  slider?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    currentSelectedOpacity = value;
    
    // 更新显示值
    if (valueDisplay) valueDisplay.textContent = `${value}%`;
    
    // 更新预览
    updatePreview(value);
  });

  // 确定按钮：保存并应用到桌面图标
  confirmBtn?.addEventListener('click', () => {
    saveIconOpacity(currentSelectedOpacity);
    applyIconOpacity(currentSelectedOpacity);
    
    // 显示成功提示
    confirmBtn.textContent = '✓ 已应用';
    confirmBtn.disabled = true;
    setTimeout(() => {
      confirmBtn.textContent = '✓ 确定应用';
      confirmBtn.disabled = false;
    }, 1500);
  });
};

/**
 * 壁纸设置模块
 */
const initWallpaperSettings = () => {
  const uploadBtn = document.getElementById('beautifyWallpaperUpload');
  const uploadInput = document.getElementById('beautifyWallpaperInput');
  const urlInput = document.getElementById('beautifyWallpaperUrlInput');
  const preview = document.getElementById('beautifyWallpaperPreview');
  const presetColors = document.querySelectorAll('#beautifyWallpaperSettings .beautify-color-item');
  const confirmBtn = document.getElementById('beautifyWallpaperConfirm');

  // 加载已保存的壁纸
  const savedWallpaper = loadWallpaper();
  currentSelectedWallpaper = { ...savedWallpaper };
  
  // 初始化预览
  updateWallpaperPreview(preview, savedWallpaper);
  
  // 初始化预设颜色选中状态
  if (savedWallpaper.type === 'color') {
    presetColors.forEach(color => {
      const colorValue = color.dataset.color;
      if (colorValue === savedWallpaper.value) {
        color.classList.add('active');
      } else {
        color.classList.remove('active');
      }
    });
  }

  // 应用已保存的壁纸
  applyWallpaper(savedWallpaper);

  // URL 输入
  urlInput?.addEventListener('input', () => {
    const url = urlInput.value.trim();
    if (url) {
      currentSelectedWallpaper = { type: 'image', value: url };
      updateWallpaperPreview(preview, currentSelectedWallpaper);
      // 取消预设颜色选中
      presetColors.forEach(c => c.classList.remove('active'));
    }
  });

  // 上传按钮点击
  uploadBtn?.addEventListener('click', () => {
    uploadInput?.click();
  });

  // 文件上传
  uploadInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        // 壁纸不压缩太小，保持较高质量
        currentSelectedWallpaper = { type: 'image', value: dataUrl };
        updateWallpaperPreview(preview, currentSelectedWallpaper);
        // 更新输入框
        if (urlInput) urlInput.value = dataUrl;
        // 取消预设颜色选中
        presetColors.forEach(c => c.classList.remove('active'));
      }
    };
    reader.readAsDataURL(file);
  });

  // 预设颜色点击
  presetColors.forEach(color => {
    color.addEventListener('click', () => {
      presetColors.forEach(c => c.classList.remove('active'));
      color.classList.add('active');
      const colorValue = color.dataset.color || color.style.background;
      currentSelectedWallpaper = { type: 'color', value: colorValue };
      updateWallpaperPreview(preview, currentSelectedWallpaper);
      // 清空 URL 输入
      if (urlInput) urlInput.value = '';
    });
  });

  // 确定按钮
  confirmBtn?.addEventListener('click', () => {
    saveWallpaper(currentSelectedWallpaper);
    applyWallpaper(currentSelectedWallpaper);
    
    // 显示成功提示
    confirmBtn.textContent = '✓ 已应用';
    confirmBtn.disabled = true;
    setTimeout(() => {
      confirmBtn.textContent = '✓ 确定应用';
      confirmBtn.disabled = false;
    }, 1500);
  });
};

// 更新壁纸预览
const updateWallpaperPreview = (preview, wallpaper) => {
  if (!preview) return;
  
  if (wallpaper.type === 'image' && wallpaper.value) {
    preview.innerHTML = `<img src="${wallpaper.value}" alt="壁纸预览" />`;
    preview.style.background = '';
  } else if (wallpaper.type === 'color' && wallpaper.value) {
    preview.innerHTML = '';
    preview.style.background = wallpaper.value;
  } else {
    preview.innerHTML = '<span class="beautify-preview-placeholder">当前壁纸</span>';
    preview.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }
};

// 加载字体大小
const loadFontSize = () => {
  return parseInt(localStorage.getItem(STORAGE_KEY_FONT_SIZE) || "14", 10);
};

// 保存字体大小
const saveFontSize = (size) => {
  localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(size));
};

// 应用字体大小到页面
const applyFontSize = (size) => {
  document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  document.body.style.fontSize = `${size}px`;
};

// 加载字体预设列表
const loadFontPresets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FONT_PRESETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// 保存字体预设列表
const saveFontPresets = (presets) => {
  localStorage.setItem(STORAGE_KEY_FONT_PRESETS, JSON.stringify(presets));
};

// 加载当前激活的字体ID
const loadActiveFont = () => {
  return localStorage.getItem(STORAGE_KEY_ACTIVE_FONT) || "system";
};

// 保存当前激活的字体ID
const saveActiveFont = (fontId) => {
  localStorage.setItem(STORAGE_KEY_ACTIVE_FONT, fontId);
};

// 应用字体到页面（全局应用）
const applyFont = (fontName, fontUrl) => {
  // 移除之前的自定义字体样式
  const existingStyle = document.getElementById('beautify-custom-font');
  if (existingStyle) {
    existingStyle.remove();
  }

  // 系统默认字体
  const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  // 创建新的样式元素
  const style = document.createElement('style');
  style.id = 'beautify-custom-font';

  if (!fontName || fontName === 'system') {
    // 恢复系统默认字体
    document.documentElement.style.removeProperty('--custom-font-family');
    // 全局应用系统默认字体，使用更强的选择器
    style.textContent = `
      html, body, *, *::before, *::after,
      .device, .device *, 
      .xinliao-view, .xinliao-view *,
      .settings-view, .settings-view *,
      .beautify-view, .beautify-view *,
      .worldbook-view, .worldbook-view *,
      input, textarea, button, select {
        font-family: ${systemFont} !important;
      }
    `;
    document.head.appendChild(style);
    console.log('已切换到系统默认字体');
    return;
  }

  // 如果有字体URL，先加载字体
  let fontFaceRule = '';
  if (fontUrl) {
    fontFaceRule = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}');
        font-display: swap;
      }
    `;
  }

  // 创建全局字体样式，使用更强的选择器
  style.textContent = `
    ${fontFaceRule}
    html, body, *, *::before, *::after,
    .device, .device *, 
    .xinliao-view, .xinliao-view *,
    .settings-view, .settings-view *,
    .beautify-view, .beautify-view *,
    .worldbook-view, .worldbook-view *,
    input, textarea, button, select {
      font-family: '${fontName}', ${systemFont} !important;
    }
  `;
  document.head.appendChild(style);

  // 设置 CSS 变量
  document.documentElement.style.setProperty('--custom-font-family', `'${fontName}', sans-serif`);
  console.log('已应用字体:', fontName);
};

/**
 * 字体设置模块
 */
const initFontSettings = () => {
  const sizeSlider = document.getElementById('beautifyFontSize');
  const sizeValue = document.getElementById('beautifyFontSizeValue');
  const sizeConfirmBtn = document.getElementById('beautifyFontSizeConfirm');
  const fontNameInput = document.getElementById('beautifyFontName');
  const fontUrlInput = document.getElementById('beautifyFontUrl');
  const saveBtn = document.getElementById('beautifyFontSave');
  const presetsContainer = document.getElementById('beautifyFontPresets');
  
  // 折叠功能
  const customToggle = document.getElementById('beautifyFontCustomToggle');
  const customContent = document.getElementById('beautifyFontCustomContent');
  const presetsToggle = document.getElementById('beautifyFontPresetsToggle');
  const presetsContent = document.getElementById('beautifyFontPresetsContent');

  // 当前选中的字体大小（未保存）
  let currentFontSize = loadFontSize();

  // 长按计时器
  let longPressTimer = null;

  // 初始化字体大小
  const savedSize = loadFontSize();
  if (sizeSlider) sizeSlider.value = savedSize;
  if (sizeValue) sizeValue.textContent = `${savedSize}px`;
  applyFontSize(savedSize);

  // 初始化当前激活的字体
  const activeFont = loadActiveFont();
  const presets = loadFontPresets();
  if (activeFont !== 'system') {
    const preset = presets.find(p => p.id === activeFont);
    if (preset) {
      applyFont(preset.name, preset.url);
    }
  } else {
    // 确保系统默认字体也被应用
    applyFont('system', '');
  }

  // 折叠切换功能
  customToggle?.addEventListener('click', () => {
    customToggle.classList.toggle('expanded');
    customContent?.classList.toggle('is-hidden');
  });

  presetsToggle?.addEventListener('click', () => {
    presetsToggle.classList.toggle('expanded');
    presetsContent?.classList.toggle('is-hidden');
  });

  // 渲染预设列表
  const renderPresets = () => {
    const presets = loadFontPresets();
    const activeFont = loadActiveFont();

    let html = `
      <div class="beautify-font-preset-item ${activeFont === 'system' ? 'active' : ''}" data-font-id="system">
        <span class="beautify-font-preset-name">系统默认</span>
        <span class="beautify-option-check"></span>
      </div>
    `;

    presets.forEach(preset => {
      html += `
        <div class="beautify-font-preset-item ${activeFont === preset.id ? 'active' : ''}" data-font-id="${preset.id}">
          <span class="beautify-font-preset-name">${preset.name}</span>
          <span class="beautify-option-check"></span>
        </div>
      `;
    });

    if (presetsContainer) {
      presetsContainer.innerHTML = html;
    }
  };

  renderPresets();

  // 字体大小滑块
  sizeSlider?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value, 10);
    currentFontSize = value;
    if (sizeValue) sizeValue.textContent = `${value}px`;
  });

  // 应用字体大小按钮
  sizeConfirmBtn?.addEventListener('click', () => {
    saveFontSize(currentFontSize);
    applyFontSize(currentFontSize);

    sizeConfirmBtn.textContent = '✓ 已应用';
    sizeConfirmBtn.disabled = true;
    setTimeout(() => {
      sizeConfirmBtn.textContent = '✓ 应用字体大小';
      sizeConfirmBtn.disabled = false;
    }, 1500);
  });

  // 保存字体预设
  saveBtn?.addEventListener('click', () => {
    const name = fontNameInput?.value?.trim();
    const url = fontUrlInput?.value?.trim();

    if (!name) {
      alert('请输入字体名称');
      return;
    }

    const presets = loadFontPresets();
    const newPreset = {
      id: `font_${Date.now()}`,
      name,
      url: url || ''
    };

    presets.push(newPreset);
    saveFontPresets(presets);

    // 自动应用新保存的字体
    saveActiveFont(newPreset.id);
    applyFont(name, url);

    // 清空输入
    if (fontNameInput) fontNameInput.value = '';
    if (fontUrlInput) fontUrlInput.value = '';

    renderPresets();

    saveBtn.textContent = '✓ 已保存';
    saveBtn.disabled = true;
    setTimeout(() => {
      saveBtn.textContent = '💾 保存预设';
      saveBtn.disabled = false;
    }, 1500);
  });

  // 标记是否正在进行长按删除
  let isLongPressDelete = false;

  // 预设点击事件（使用事件委托）- 简化为 click 事件处理普通点击
  presetsContainer?.addEventListener('click', (e) => {
    const item = e.target.closest('.beautify-font-preset-item');
    if (!item) return;

    // 如果刚刚执行了长按删除，忽略这次点击
    if (isLongPressDelete) {
      isLongPressDelete = false;
      return;
    }

    const fontId = item.dataset.fontId;

    // 切换字体
    saveActiveFont(fontId);

    if (fontId === 'system') {
      applyFont('system', '');
    } else {
      const presets = loadFontPresets();
      const preset = presets.find(p => p.id === fontId);
      if (preset) {
        applyFont(preset.name, preset.url);
      }
    }

    renderPresets();
  });

  // 长按删除事件（仅对非系统预设）
  presetsContainer?.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.beautify-font-preset-item');
    if (!item) return;

    const fontId = item.dataset.fontId;

    // 仅对非系统预设启用长按删除
    if (fontId !== 'system') {
      item.classList.add('deleting');
      longPressTimer = setTimeout(() => {
        isLongPressDelete = true;
        if (confirm(`确定要删除字体预设"${item.querySelector('.beautify-font-preset-name').textContent}"吗？`)) {
          const presets = loadFontPresets();
          const newPresets = presets.filter(p => p.id !== fontId);
          saveFontPresets(newPresets);

          // 如果删除的是当前激活的字体，切换回系统默认
          if (loadActiveFont() === fontId) {
            saveActiveFont('system');
            applyFont('system', '');
          }

          renderPresets();
        }
        item.classList.remove('deleting');
        longPressTimer = null;
      }, 800);
    }
  });

  presetsContainer?.addEventListener('mouseup', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    const items = presetsContainer.querySelectorAll('.beautify-font-preset-item');
    items.forEach(item => item.classList.remove('deleting'));
  });

  presetsContainer?.addEventListener('mouseleave', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    const items = presetsContainer.querySelectorAll('.beautify-font-preset-item');
    items.forEach(item => item.classList.remove('deleting'));
  });

  // 触摸设备支持
  presetsContainer?.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.beautify-font-preset-item');
    if (!item) return;

    const fontId = item.dataset.fontId;

    if (fontId !== 'system') {
      item.classList.add('deleting');
      longPressTimer = setTimeout(() => {
        isLongPressDelete = true;
        if (confirm(`确定要删除字体预设"${item.querySelector('.beautify-font-preset-name').textContent}"吗？`)) {
          const presets = loadFontPresets();
          const newPresets = presets.filter(p => p.id !== fontId);
          saveFontPresets(newPresets);

          if (loadActiveFont() === fontId) {
            saveActiveFont('system');
            applyFont('system', '');
          }

          renderPresets();
        }
        item.classList.remove('deleting');
        longPressTimer = null;
      }, 800);
    }
  });

  presetsContainer?.addEventListener('touchend', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    const items = presetsContainer.querySelectorAll('.beautify-font-preset-item');
    items.forEach(item => item.classList.remove('deleting'));
  });
};

/**
 * 气泡设置模块
 */
const initBubbleSettings = () => {
  const bubbleColors = document.querySelectorAll('#beautifyBubbleSettings .beautify-color-item');
  const bubblePreview = document.querySelector('.beautify-bubble-item.right');
  const radiusSlider = document.getElementById('beautifyBubbleRadius');
  const radiusValue = document.getElementById('beautifyBubbleRadiusValue');

  bubbleColors.forEach(color => {
    color.addEventListener('click', () => {
      bubbleColors.forEach(c => c.classList.remove('active'));
      color.classList.add('active');
      const bg = color.style.background;
      if (bubblePreview) {
        bubblePreview.style.background = bg;
      }
    });
  });

  radiusSlider?.addEventListener('input', (e) => {
    const value = e.target.value;
    if (radiusValue) {
      radiusValue.textContent = `${value}px`;
    }
    if (bubblePreview) {
      bubblePreview.style.borderRadius = `${value}px ${value}px 4px ${value}px`;
    }
  });
};

/**
 * 全局美化模块
 */
const initGlobalSettings = () => {
  const themeOptions = document.querySelectorAll('#beautifyGlobalSettings .beautify-option-item');

  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      themeOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });
};
