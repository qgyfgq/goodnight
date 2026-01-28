/**
 * 渲染应用网格与 Dock
 * @param {HTMLElement} container - 容器元素
 * @param {Array<{name: string, emoji: string}>} apps - 应用数据
 */
export const renderApps = (container, apps) => {
  if (!container || !Array.isArray(apps)) return;

  container.innerHTML = apps
    .map(
      (app) => `
      <div class="app">
        <div class="app-icon">
          <img src="${app.icon}" alt="${app.name}" loading="lazy" />
        </div>
        <div class="app-name">${app.name}</div>
      </div>
    `
    )
    .join("");
};
