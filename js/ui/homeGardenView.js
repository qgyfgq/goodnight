/**
 * 家园视图模块
 * 管理家园界面和手机子界面
 */

import { saveMasksToIDB, loadMasksFromIDB, deleteMaskFromIDB } from '../storage/indexedDB.js';

/**
 * 初始化家园视图
 */
export function initHomeGardenView() {
  // 绑定家园应用点击
  bindGardenApp();
}

/**
 * 绑定家园应用点击事件
 */
function bindGardenApp() {
  const gardenApps = document.querySelectorAll('.app[data-app-name="家园"]');
  gardenApps.forEach((app) => {
    app.addEventListener('click', openGardenView);
  });
}

/**
 * 打开家园视图
 */
function openGardenView() {
  const homeView = document.getElementById('homeView');
  const gardenView = document.getElementById('homeGardenView');
  
  if (homeView) {
    homeView.classList.add('is-hidden');
  }
  if (gardenView) {
    gardenView.classList.add('active');
  }
  
  // 绑定手机按钮
  bindPhoneButton();
  
  // 更新手机日期
  updatePhoneDate();
}

/**
 * 关闭家园视图
 */
function closeGardenView() {
  const homeView = document.getElementById('homeView');
  const gardenView = document.getElementById('homeGardenView');
  const phoneView = document.getElementById('gardenPhoneView');
  
  if (gardenView) {
    gardenView.classList.remove('active');
  }
  if (phoneView) {
    phoneView.classList.remove('active');
  }
  if (homeView) {
    homeView.classList.remove('is-hidden');
  }
}

// 标记是否已绑定事件
let isPhoneButtonBound = false;

/**
 * 绑定手机按钮
 */
function bindPhoneButton() {
  if (isPhoneButtonBound) return;
  isPhoneButtonBound = true;
  
  const phoneBtn = document.getElementById('gardenPhoneBtn');
  const homeBtn = document.getElementById('phoneHomeBtn');
  
  if (phoneBtn) {
    phoneBtn.addEventListener('click', openPhoneView);
  }
  
  if (homeBtn) {
    homeBtn.addEventListener('click', handlePhoneHomeBtn);
  }
  
  // 绑定手机应用点击
  bindPhoneApps();
}

/**
 * 处理手机 home 键点击
 * 如果在应用视图内，返回手机主页；否则关闭手机界面
 */
function handlePhoneHomeBtn() {
  const appViews = document.querySelectorAll('.phone-app-view');
  let hasActiveApp = false;
  
  appViews.forEach((view) => {
    if (view.style.display === 'flex') {
      hasActiveApp = true;
    }
  });
  
  if (hasActiveApp) {
    // 在应用视图内，返回手机主页
    closePhoneAppView();
  } else {
    // 在手机主页，关闭手机界面
    closePhoneView();
  }
}

/**
 * 绑定手机应用点击事件
 */
function bindPhoneApps() {
  const phoneApps = document.querySelectorAll('.phone-app');
  phoneApps.forEach((app) => {
    app.addEventListener('click', handlePhoneAppClick);
  });
}

/**
 * 处理手机应用点击
 */
function handlePhoneAppClick(e) {
  const app = e.currentTarget;
  const appName = app.dataset.app;
  
  switch (appName) {
    case 'mask':
      openFullscreenApp('mask');
      break;
    case 'home':
      // 首页 - 返回网页主页
      closePhoneView();
      closeGardenView();
      break;
    default:
      // 其他应用暂未实现
      console.log(`应用 ${appName} 暂未实现`);
      break;
  }
}

/**
 * 打开全屏应用视图（在家园视图层级）
 */
function openFullscreenApp(appName) {
  // 隐藏手机界面
  closePhoneView();
  
  // 创建或显示全屏应用视图
  let appView = document.getElementById(`gardenApp-${appName}`);
  if (!appView) {
    appView = createFullscreenAppView(appName);
    const gardenView = document.getElementById('homeGardenView');
    if (gardenView) {
      gardenView.appendChild(appView);
    }
  }
  appView.classList.add('active');
}

/**
 * 关闭全屏应用视图
 */
function closeFullscreenApp() {
  const appViews = document.querySelectorAll('.garden-fullscreen-app');
  appViews.forEach((view) => {
    view.classList.remove('active');
  });
}

/**
 * 打开手机应用视图（小屏幕内）- 保留用于其他应用
 */
function openPhoneAppView(appName) {
  const phoneApps = document.querySelector('.phone-apps');
  const phoneWeather = document.querySelector('.phone-weather');
  
  // 隐藏主页内容
  if (phoneApps) phoneApps.style.display = 'none';
  if (phoneWeather) phoneWeather.style.display = 'none';
  
  // 创建或显示应用视图
  let appView = document.getElementById(`phoneApp-${appName}`);
  if (!appView) {
    appView = createPhoneAppView(appName);
    const phoneScreen = document.querySelector('.phone-screen');
    if (phoneScreen) {
      phoneScreen.appendChild(appView);
    }
  }
  appView.style.display = 'flex';
}

/**
 * 关闭手机应用视图，返回主页
 */
function closePhoneAppView() {
  const phoneApps = document.querySelector('.phone-apps');
  const phoneWeather = document.querySelector('.phone-weather');
  
  // 显示主页内容
  if (phoneApps) phoneApps.style.display = '';
  if (phoneWeather) phoneWeather.style.display = '';
  
  // 隐藏所有应用视图
  const appViews = document.querySelectorAll('.phone-app-view');
  appViews.forEach((view) => {
    view.style.display = 'none';
  });
}

// 面具数据存储
let maskList = [];
let currentEditingMask = null;

/**
 * 创建全屏应用视图
 */
function createFullscreenAppView(appName) {
  const view = document.createElement('div');
  view.id = `gardenApp-${appName}`;
  view.className = 'garden-fullscreen-app';
  
  switch (appName) {
    case 'mask':
      view.innerHTML = createFullscreenMaskAppHTML();
      // 绑定面具应用事件
      setTimeout(() => bindFullscreenMaskAppEvents(view), 0);
      break;
    default:
      view.innerHTML = `
        <div class="fullscreen-app-header">
          <button class="fullscreen-back-btn">‹</button>
          <span class="fullscreen-app-title">应用</span>
        </div>
        <div class="fullscreen-app-content">
          <div class="mask-placeholder">
            <div class="mask-text">功能开发中...</div>
          </div>
        </div>
      `;
  }
  
  return view;
}

/**
 * 创建全屏面具应用 HTML
 */
function createFullscreenMaskAppHTML() {
  return `
    <!-- 面具列表页 -->
    <div class="mask-list-page active">
      <div class="fullscreen-app-header">
        <button class="fullscreen-back-btn" data-action="back">‹</button>
        <span class="fullscreen-app-title">🎭 面具</span>
        <button class="fullscreen-add-btn" data-action="add">+</button>
      </div>
      <div class="fullscreen-app-content">
        <div class="mask-list" id="fullscreenMaskList">
          <div class="mask-empty">
            <div class="mask-empty-icon">🎭</div>
            <div class="mask-empty-text">暂无面具</div>
            <div class="mask-empty-hint">点击右上角 + 创建新面具</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新建/编辑面具页 -->
    <div class="mask-edit-page">
      <div class="fullscreen-app-header">
        <button class="fullscreen-cancel-btn" data-action="cancel">取消</button>
        <span class="fullscreen-app-title" id="fullscreenMaskEditTitle">新建面具</span>
        <button class="fullscreen-save-btn" data-action="save">保存</button>
      </div>
      <div class="fullscreen-app-content">
        <div class="mask-edit-form fullscreen-form">
          <!-- 头像 -->
          <div class="mask-avatar-section">
            <div class="mask-avatar fullscreen-avatar" id="fullscreenMaskAvatar">
              <span class="mask-avatar-placeholder">🎭</span>
            </div>
            <button class="mask-avatar-btn" data-action="change-avatar">更换头像</button>
          </div>
          
          <!-- 名字 -->
          <div class="mask-field">
            <label class="mask-field-label">名字</label>
            <input type="text" class="mask-field-input" id="fullscreenMaskNameInput" placeholder="输入面具名称" />
          </div>
          
          <!-- 人设描述 -->
          <div class="mask-field">
            <label class="mask-field-label">人设描述</label>
            <textarea class="mask-field-textarea" id="fullscreenMaskDescInput" placeholder="描述这个面具的性格、背景等" rows="6"></textarea>
          </div>
          
          <!-- 设为默认 -->
          <div class="mask-field mask-field-switch">
            <label class="mask-field-label">设为默认面具</label>
            <label class="mask-switch">
              <input type="checkbox" id="fullscreenMaskDefaultSwitch" />
              <span class="mask-switch-slider"></span>
            </label>
          </div>
          
          <!-- 删除按钮（仅编辑时显示） -->
          <div class="mask-delete-section" id="fullscreenMaskDeleteSection" style="display: none;">
            <button class="mask-delete-btn" data-action="delete">删除此面具</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 头像选择弹窗 -->
    <div class="mask-avatar-popup" id="fullscreenMaskAvatarPopup">
      <div class="mask-avatar-popup-card fullscreen-popup-card">
        <div class="mask-avatar-popup-title">更换头像</div>
        <div class="mask-avatar-popup-field">
          <label>图片链接</label>
          <input type="text" id="fullscreenMaskAvatarUrlInput" placeholder="https://..." />
        </div>
        <div class="mask-avatar-popup-field">
          <label>或上传图片</label>
          <input type="file" id="fullscreenMaskAvatarFileInput" accept="image/*" />
        </div>
        <div class="mask-avatar-popup-actions">
          <button class="mask-popup-btn ghost" data-action="avatar-cancel">取消</button>
          <button class="mask-popup-btn primary" data-action="avatar-confirm">确定</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 绑定全屏面具应用事件
 */
function bindFullscreenMaskAppEvents(view) {
  // 返回按钮
  const backBtn = view.querySelector('.fullscreen-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closeFullscreenApp();
      openPhoneView();
    });
  }
  
  // 添加按钮
  const addBtn = view.querySelector('.fullscreen-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openFullscreenMaskEditPage(view, null);
    });
  }
  
  // 取消按钮
  const cancelBtn = view.querySelector('.fullscreen-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeFullscreenMaskEditPage(view);
    });
  }
  
  // 保存按钮
  const saveBtn = view.querySelector('.fullscreen-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveFullscreenMask(view);
    });
  }
  
  // 更换头像按钮
  const avatarBtn = view.querySelector('.mask-avatar-btn');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', () => {
      openFullscreenAvatarPopup(view);
    });
  }
  
  // 头像弹窗取消
  const avatarCancelBtn = view.querySelector('[data-action="avatar-cancel"]');
  if (avatarCancelBtn) {
    avatarCancelBtn.addEventListener('click', () => {
      closeFullscreenAvatarPopup(view);
    });
  }
  
  // 头像弹窗确定
  const avatarConfirmBtn = view.querySelector('[data-action="avatar-confirm"]');
  if (avatarConfirmBtn) {
    avatarConfirmBtn.addEventListener('click', () => {
      confirmFullscreenAvatar(view);
    });
  }
  
  // 头像文件上传
  const avatarFileInput = view.querySelector('#fullscreenMaskAvatarFileInput');
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      handleFullscreenAvatarFile(view, e);
    });
  }
  
  // 删除按钮
  const deleteBtn = view.querySelector('.mask-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      deleteFullscreenMask(view);
    });
  }
  
  // 加载面具列表
  loadFullscreenMaskList(view);
}

/**
 * 打开全屏面具编辑页
 */
function openFullscreenMaskEditPage(view, mask) {
  const listPage = view.querySelector('.mask-list-page');
  const editPage = view.querySelector('.mask-edit-page');
  const editTitle = view.querySelector('#fullscreenMaskEditTitle');
  const deleteSection = view.querySelector('#fullscreenMaskDeleteSection');
  
  const nameInput = view.querySelector('#fullscreenMaskNameInput');
  const descInput = view.querySelector('#fullscreenMaskDescInput');
  const defaultSwitch = view.querySelector('#fullscreenMaskDefaultSwitch');
  const avatar = view.querySelector('#fullscreenMaskAvatar');
  
  if (mask) {
    currentEditingMask = mask;
    editTitle.textContent = '编辑面具';
    deleteSection.style.display = 'block';
    nameInput.value = mask.name || '';
    descInput.value = mask.description || '';
    defaultSwitch.checked = mask.isDefault || false;
    
    if (mask.avatar) {
      avatar.innerHTML = `<img src="${mask.avatar}" alt="avatar" />`;
    } else {
      avatar.innerHTML = '<span class="mask-avatar-placeholder">🎭</span>';
    }
  } else {
    currentEditingMask = null;
    editTitle.textContent = '新建面具';
    deleteSection.style.display = 'none';
    nameInput.value = '';
    descInput.value = '';
    defaultSwitch.checked = false;
    avatar.innerHTML = '<span class="mask-avatar-placeholder">🎭</span>';
  }
  
  listPage.classList.remove('active');
  editPage.classList.add('active');
}

/**
 * 关闭全屏面具编辑页
 */
function closeFullscreenMaskEditPage(view) {
  const listPage = view.querySelector('.mask-list-page');
  const editPage = view.querySelector('.mask-edit-page');
  
  editPage.classList.remove('active');
  listPage.classList.add('active');
  currentEditingMask = null;
}

/**
 * 保存全屏面具
 */
async function saveFullscreenMask(view) {
  const nameInput = view.querySelector('#fullscreenMaskNameInput');
  const descInput = view.querySelector('#fullscreenMaskDescInput');
  const defaultSwitch = view.querySelector('#fullscreenMaskDefaultSwitch');
  const avatar = view.querySelector('#fullscreenMaskAvatar img');
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('请输入面具名称');
    return;
  }
  
  const maskData = {
    id: currentEditingMask ? currentEditingMask.id : Date.now().toString(),
    name: name,
    description: descInput.value.trim(),
    avatar: avatar ? avatar.src : null,
    isDefault: defaultSwitch.checked,
    createdAt: currentEditingMask ? currentEditingMask.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (maskData.isDefault) {
    maskList.forEach(m => m.isDefault = false);
  }
  
  if (currentEditingMask) {
    const index = maskList.findIndex(m => m.id === currentEditingMask.id);
    if (index !== -1) {
      maskList[index] = maskData;
    }
  } else {
    maskList.push(maskData);
  }
  
  await saveMaskListToStorage();
  await loadFullscreenMaskList(view);
  closeFullscreenMaskEditPage(view);
}

/**
 * 删除全屏面具
 */
async function deleteFullscreenMask(view) {
  if (!currentEditingMask) return;
  
  if (confirm('确定要删除这个面具吗？')) {
    maskList = maskList.filter(m => m.id !== currentEditingMask.id);
    await saveMaskListToStorage();
    await loadFullscreenMaskList(view);
    closeFullscreenMaskEditPage(view);
  }
}

/**
 * 打开全屏头像弹窗
 */
function openFullscreenAvatarPopup(view) {
  const popup = view.querySelector('#fullscreenMaskAvatarPopup');
  const urlInput = view.querySelector('#fullscreenMaskAvatarUrlInput');
  const fileInput = view.querySelector('#fullscreenMaskAvatarFileInput');
  
  urlInput.value = '';
  fileInput.value = '';
  popup.classList.add('active');
}

/**
 * 关闭全屏头像弹窗
 */
function closeFullscreenAvatarPopup(view) {
  const popup = view.querySelector('#fullscreenMaskAvatarPopup');
  popup.classList.remove('active');
}

/**
 * 确认全屏头像
 */
function confirmFullscreenAvatar(view) {
  const urlInput = view.querySelector('#fullscreenMaskAvatarUrlInput');
  const avatar = view.querySelector('#fullscreenMaskAvatar');
  
  const url = urlInput.value.trim();
  if (url) {
    avatar.innerHTML = `<img src="${url}" alt="avatar" />`;
  }
  
  closeFullscreenAvatarPopup(view);
}

/**
 * 处理全屏头像文件上传
 */
function handleFullscreenAvatarFile(view, e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const urlInput = view.querySelector('#fullscreenMaskAvatarUrlInput');
    urlInput.value = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 加载全屏面具列表
 */
async function loadFullscreenMaskList(view) {
  await loadMaskListFromStorage();
  
  const listContainer = view.querySelector('#fullscreenMaskList');
  if (!listContainer) return;
  
  if (maskList.length === 0) {
    listContainer.innerHTML = `
      <div class="mask-empty">
        <div class="mask-empty-icon">🎭</div>
        <div class="mask-empty-text">暂无面具</div>
        <div class="mask-empty-hint">点击右上角 + 创建新面具</div>
      </div>
    `;
  } else {
    listContainer.innerHTML = maskList.map(mask => `
      <div class="mask-item fullscreen-mask-item" data-mask-id="${mask.id}">
        <div class="mask-item-avatar fullscreen-item-avatar">
          ${mask.avatar ? `<img src="${mask.avatar}" alt="avatar" />` : '<span>🎭</span>'}
        </div>
        <div class="mask-item-info">
          <div class="mask-item-name">${mask.name}${mask.isDefault ? ' <span class="mask-default-tag">默认</span>' : ''}</div>
          <div class="mask-item-desc">${mask.description || '暂无描述'}</div>
        </div>
        <div class="mask-item-arrow">›</div>
      </div>
    `).join('');
    
    listContainer.querySelectorAll('.mask-item').forEach(item => {
      item.addEventListener('click', () => {
        const maskId = item.dataset.maskId;
        const mask = maskList.find(m => m.id === maskId);
        if (mask) {
          openFullscreenMaskEditPage(view, mask);
        }
      });
    });
  }
}

/**
 * 创建手机应用视图
 */
function createPhoneAppView(appName) {
  const view = document.createElement('div');
  view.id = `phoneApp-${appName}`;
  view.className = 'phone-app-view';
  
  switch (appName) {
    case 'mask':
      view.innerHTML = createMaskAppHTML();
      // 绑定面具应用事件
      setTimeout(() => bindMaskAppEvents(view), 0);
      break;
    default:
      view.innerHTML = `
        <div class="phone-app-header">
          <span class="phone-app-title">应用</span>
        </div>
        <div class="phone-app-content">
          <div class="mask-placeholder">
            <div class="mask-text">功能开发中...</div>
          </div>
        </div>
      `;
  }
  
  return view;
}

/**
 * 创建面具应用 HTML
 */
function createMaskAppHTML() {
  return `
    <!-- 面具列表页 -->
    <div class="mask-list-page active">
      <div class="phone-app-header">
        <button class="mask-back-btn" data-action="back">‹</button>
        <span class="phone-app-title">🎭 面具</span>
        <button class="mask-add-btn" data-action="add">+</button>
      </div>
      <div class="phone-app-content">
        <div class="mask-list" id="maskList">
          <div class="mask-empty">
            <div class="mask-empty-icon">🎭</div>
            <div class="mask-empty-text">暂无面具</div>
            <div class="mask-empty-hint">点击右上角 + 创建新面具</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新建/编辑面具页 -->
    <div class="mask-edit-page">
      <div class="phone-app-header">
        <button class="mask-cancel-btn" data-action="cancel">取消</button>
        <span class="phone-app-title" id="maskEditTitle">新建面具</span>
        <button class="mask-save-btn" data-action="save">保存</button>
      </div>
      <div class="phone-app-content">
        <div class="mask-edit-form">
          <!-- 头像 -->
          <div class="mask-avatar-section">
            <div class="mask-avatar" id="maskAvatar">
              <span class="mask-avatar-placeholder">🎭</span>
            </div>
            <button class="mask-avatar-btn" data-action="change-avatar">更换头像</button>
          </div>
          
          <!-- 名字 -->
          <div class="mask-field">
            <label class="mask-field-label">名字</label>
            <input type="text" class="mask-field-input" id="maskNameInput" placeholder="输入面具名称" />
          </div>
          
          <!-- 人设描述 -->
          <div class="mask-field">
            <label class="mask-field-label">人设描述</label>
            <textarea class="mask-field-textarea" id="maskDescInput" placeholder="描述这个面具的性格、背景等" rows="4"></textarea>
          </div>
          
          <!-- 设为默认 -->
          <div class="mask-field mask-field-switch">
            <label class="mask-field-label">设为默认面具</label>
            <label class="mask-switch">
              <input type="checkbox" id="maskDefaultSwitch" />
              <span class="mask-switch-slider"></span>
            </label>
          </div>
          
          <!-- 删除按钮（仅编辑时显示） -->
          <div class="mask-delete-section" id="maskDeleteSection" style="display: none;">
            <button class="mask-delete-btn" data-action="delete">删除此面具</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 头像选择弹窗 -->
    <div class="mask-avatar-popup" id="maskAvatarPopup">
      <div class="mask-avatar-popup-card">
        <div class="mask-avatar-popup-title">更换头像</div>
        <div class="mask-avatar-popup-field">
          <label>图片链接</label>
          <input type="text" id="maskAvatarUrlInput" placeholder="https://..." />
        </div>
        <div class="mask-avatar-popup-field">
          <label>或上传图片</label>
          <input type="file" id="maskAvatarFileInput" accept="image/*" />
        </div>
        <div class="mask-avatar-popup-actions">
          <button class="mask-popup-btn ghost" data-action="avatar-cancel">取消</button>
          <button class="mask-popup-btn primary" data-action="avatar-confirm">确定</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 绑定面具应用事件
 */
function bindMaskAppEvents(view) {
  // 返回按钮
  const backBtn = view.querySelector('.mask-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      closePhoneAppView();
    });
  }
  
  // 添加按钮
  const addBtn = view.querySelector('.mask-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openMaskEditPage(view, null);
    });
  }
  
  // 取消按钮
  const cancelBtn = view.querySelector('.mask-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeMaskEditPage(view);
    });
  }
  
  // 保存按钮
  const saveBtn = view.querySelector('.mask-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveMask(view);
    });
  }
  
  // 更换头像按钮
  const avatarBtn = view.querySelector('.mask-avatar-btn');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', () => {
      openAvatarPopup(view);
    });
  }
  
  // 头像弹窗取消
  const avatarCancelBtn = view.querySelector('[data-action="avatar-cancel"]');
  if (avatarCancelBtn) {
    avatarCancelBtn.addEventListener('click', () => {
      closeAvatarPopup(view);
    });
  }
  
  // 头像弹窗确定
  const avatarConfirmBtn = view.querySelector('[data-action="avatar-confirm"]');
  if (avatarConfirmBtn) {
    avatarConfirmBtn.addEventListener('click', () => {
      confirmAvatar(view);
    });
  }
  
  // 头像文件上传
  const avatarFileInput = view.querySelector('#maskAvatarFileInput');
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      handleAvatarFile(view, e);
    });
  }
  
  // 删除按钮
  const deleteBtn = view.querySelector('.mask-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      deleteMask(view);
    });
  }
  
  // 加载面具列表
  loadMaskList(view);
}

/**
 * 打开面具编辑页
 */
function openMaskEditPage(view, mask) {
  const listPage = view.querySelector('.mask-list-page');
  const editPage = view.querySelector('.mask-edit-page');
  const editTitle = view.querySelector('#maskEditTitle');
  const deleteSection = view.querySelector('#maskDeleteSection');
  
  // 重置表单
  const nameInput = view.querySelector('#maskNameInput');
  const descInput = view.querySelector('#maskDescInput');
  const defaultSwitch = view.querySelector('#maskDefaultSwitch');
  const avatar = view.querySelector('#maskAvatar');
  
  if (mask) {
    // 编辑模式
    currentEditingMask = mask;
    editTitle.textContent = '编辑面具';
    deleteSection.style.display = 'block';
    nameInput.value = mask.name || '';
    descInput.value = mask.description || '';
    defaultSwitch.checked = mask.isDefault || false;
    
    if (mask.avatar) {
      avatar.innerHTML = `<img src="${mask.avatar}" alt="avatar" />`;
    } else {
      avatar.innerHTML = '<span class="mask-avatar-placeholder">🎭</span>';
    }
  } else {
    // 新建模式
    currentEditingMask = null;
    editTitle.textContent = '新建面具';
    deleteSection.style.display = 'none';
    nameInput.value = '';
    descInput.value = '';
    defaultSwitch.checked = false;
    avatar.innerHTML = '<span class="mask-avatar-placeholder">🎭</span>';
  }
  
  listPage.classList.remove('active');
  editPage.classList.add('active');
}

/**
 * 关闭面具编辑页
 */
function closeMaskEditPage(view) {
  const listPage = view.querySelector('.mask-list-page');
  const editPage = view.querySelector('.mask-edit-page');
  
  editPage.classList.remove('active');
  listPage.classList.add('active');
  currentEditingMask = null;
}

/**
 * 保存面具
 */
async function saveMask(view) {
  const nameInput = view.querySelector('#maskNameInput');
  const descInput = view.querySelector('#maskDescInput');
  const defaultSwitch = view.querySelector('#maskDefaultSwitch');
  const avatar = view.querySelector('#maskAvatar img');
  
  const name = nameInput.value.trim();
  if (!name) {
    alert('请输入面具名称');
    return;
  }
  
  const maskData = {
    id: currentEditingMask ? currentEditingMask.id : Date.now().toString(),
    name: name,
    description: descInput.value.trim(),
    avatar: avatar ? avatar.src : null,
    isDefault: defaultSwitch.checked,
    createdAt: currentEditingMask ? currentEditingMask.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // 如果设为默认，取消其他面具的默认状态
  if (maskData.isDefault) {
    maskList.forEach(m => m.isDefault = false);
  }
  
  if (currentEditingMask) {
    // 更新现有面具
    const index = maskList.findIndex(m => m.id === currentEditingMask.id);
    if (index !== -1) {
      maskList[index] = maskData;
    }
  } else {
    // 添加新面具
    maskList.push(maskData);
  }
  
  // 保存到 IndexedDB
  await saveMaskListToStorage();
  
  // 刷新列表
  await loadMaskList(view);
  
  // 关闭编辑页
  closeMaskEditPage(view);
}

/**
 * 删除面具
 */
async function deleteMask(view) {
  if (!currentEditingMask) return;
  
  if (confirm('确定要删除这个面具吗？')) {
    maskList = maskList.filter(m => m.id !== currentEditingMask.id);
    await saveMaskListToStorage();
    await loadMaskList(view);
    closeMaskEditPage(view);
  }
}

/**
 * 打开头像弹窗
 */
function openAvatarPopup(view) {
  const popup = view.querySelector('#maskAvatarPopup');
  const urlInput = view.querySelector('#maskAvatarUrlInput');
  const fileInput = view.querySelector('#maskAvatarFileInput');
  
  urlInput.value = '';
  fileInput.value = '';
  popup.classList.add('active');
}

/**
 * 关闭头像弹窗
 */
function closeAvatarPopup(view) {
  const popup = view.querySelector('#maskAvatarPopup');
  popup.classList.remove('active');
}

/**
 * 确认头像
 */
function confirmAvatar(view) {
  const urlInput = view.querySelector('#maskAvatarUrlInput');
  const avatar = view.querySelector('#maskAvatar');
  
  const url = urlInput.value.trim();
  if (url) {
    avatar.innerHTML = `<img src="${url}" alt="avatar" />`;
  }
  
  closeAvatarPopup(view);
}

/**
 * 处理头像文件上传
 */
function handleAvatarFile(view, e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const urlInput = view.querySelector('#maskAvatarUrlInput');
    urlInput.value = event.target.result;
  };
  reader.readAsDataURL(file);
}

/**
 * 加载面具列表
 */
async function loadMaskList(view) {
  // 从 IndexedDB 加载
  await loadMaskListFromStorage();
  
  const listContainer = view.querySelector('#maskList');
  if (!listContainer) return;
  
  if (maskList.length === 0) {
    listContainer.innerHTML = `
      <div class="mask-empty">
        <div class="mask-empty-icon">🎭</div>
        <div class="mask-empty-text">暂无面具</div>
        <div class="mask-empty-hint">点击右上角 + 创建新面具</div>
      </div>
    `;
  } else {
    listContainer.innerHTML = maskList.map(mask => `
      <div class="mask-item" data-mask-id="${mask.id}">
        <div class="mask-item-avatar">
          ${mask.avatar ? `<img src="${mask.avatar}" alt="avatar" />` : '<span>🎭</span>'}
        </div>
        <div class="mask-item-info">
          <div class="mask-item-name">${mask.name}${mask.isDefault ? ' <span class="mask-default-tag">默认</span>' : ''}</div>
          <div class="mask-item-desc">${mask.description || '暂无描述'}</div>
        </div>
        <div class="mask-item-arrow">›</div>
      </div>
    `).join('');
    
    // 绑定点击事件
    listContainer.querySelectorAll('.mask-item').forEach(item => {
      item.addEventListener('click', () => {
        const maskId = item.dataset.maskId;
        const mask = maskList.find(m => m.id === maskId);
        if (mask) {
          openMaskEditPage(view, mask);
        }
      });
    });
  }
}

/**
 * 保存面具列表到 IndexedDB
 */
async function saveMaskListToStorage() {
  try {
    await saveMasksToIDB(maskList);
  } catch (e) {
    console.error('保存面具列表失败:', e);
  }
}

/**
 * 从 IndexedDB 加载面具列表
 */
async function loadMaskListFromStorage() {
  try {
    const data = await loadMasksFromIDB();
    if (data && data.length > 0) {
      maskList = data;
    }
  } catch (e) {
    console.error('加载面具列表失败:', e);
    maskList = [];
  }
}

/**
 * 打开手机界面
 */
function openPhoneView() {
  const phoneView = document.getElementById('gardenPhoneView');
  if (phoneView) {
    phoneView.classList.add('active');
  }
}

/**
 * 关闭手机界面（返回家园）
 */
function closePhoneView() {
  const phoneView = document.getElementById('gardenPhoneView');
  if (phoneView) {
    phoneView.classList.remove('active');
  }
}

/**
 * 更新手机日期显示
 */
function updatePhoneDate() {
  const dateEl = document.getElementById('phoneDate');
  if (dateEl) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    dateEl.textContent = `${month}月${day}日`;
  }
}

/**
 * 导出关闭函数供外部使用
 */
export { closeGardenView };
