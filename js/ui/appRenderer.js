/**
 * 渲染应用网格与 Dock
 * @param {HTMLElement} container - 容器元素
 * @param {Array<{name: string, icon: string}>} apps - 应用数据
 */

// 存储键（与 beautifyView.js 保持一致）
const STORAGE_KEY_CUSTOM_ICONS = "beautifyCustomIcons";

// 加载自定义图标
const loadCustomIcons = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_ICONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const renderApps = (container, apps) => {
  if (!container || !Array.isArray(apps)) return;

  // 加载自定义图标
  const customIcons = loadCustomIcons();

  container.innerHTML = apps
    .map((app) => {
      // 优先使用自定义图标，否则使用默认图标
      const iconSrc = customIcons[app.name] || app.icon;
      return `
      <div class="app" data-app-name="${app.name}">
        <div class="app-icon">
          <img src="${iconSrc}" alt="${app.name}" loading="lazy" />
        </div>
        <div class="app-name">${app.name}</div>
      </div>
    `;
    })
    .join("");
};
