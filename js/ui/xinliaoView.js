import {
  defaultTabs,
  placeholderContacts,
  placeholderMoments,
} from "../xinliao/xinliaoData.js";
import { initMessagesModule } from "../xinliao/messagesModule.js";
import { initChatModule } from "../xinliao/chatModule.js";

const getEl = (id) => document.getElementById(id);

const buildAvatarMarkup = (avatar) => {
  if (!avatar) return `<span class="xinliao-avatar-text">👤</span>`;
  const avatarText = String(avatar).trim();
  if (
    avatarText.startsWith("http://") ||
    avatarText.startsWith("https://") ||
    avatarText.startsWith("data:")
  ) {
    return `<img class="xinliao-avatar-image" src="${avatarText}" alt="avatar" />`;
  }
  return `<span class="xinliao-avatar-text">${avatarText}</span>`;
};

const normalizeContact = (item = {}) => ({
  id: item.id || `u-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  avatar: item.avatar || item.image || item.icon || item.头像 || "👤",
  name: item.name || item.char_name || item.character_name || item.名字 || item.姓名 || "未命名",
  persona: item.persona || item.description || item.desc || item.char_persona || item.personality || item.人设 || item.描述 || "暂无人设",
  pinned: item.pinned || false, // 是否置顶
});

/**
 * 排序联系人列表（置顶优先，然后按名称）
 * @param {Array} contacts - 联系人列表
 * @returns {Array} 排序后的联系人列表
 */
const sortContacts = (contacts) => {
  return [...contacts].sort((a, b) => {
    // 置顶优先
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // 然后按名称排序
    return (a.name || "").localeCompare(b.name || "");
  });
};

const CONTACTS_STORAGE_KEY = "xinliaoContacts";

const loadStoredContacts = () => {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    // 过滤掉无效的联系人（没有 id 或 name 的）
    const validList = list.filter(item => item && (item.id || item.name));
    if (!validList.length) return [];
    return validList.map(normalizeContact);
  } catch (error) {
    return [];
  }
};

const saveContacts = (list) => {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    // 忽略存储失败
  }
};

// 联系人选择模式状态
let isContactSelectMode = false;
let selectedContactIds = new Set();

const renderContacts = (container, list = []) => {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = "";
    return;
  }
  // 排序：置顶优先
  const sortedList = sortContacts(list);
  container.innerHTML = sortedList
    .map(
      (item) => {
        const selectModeClass = isContactSelectMode ? "is-select-mode" : "";
        const selectedClass = selectedContactIds.has(item.id) ? "is-selected" : "";
        const pinnedClass = item.pinned ? "is-pinned" : "";
        return `
          <button class="xinliao-contact-item ${selectModeClass} ${selectedClass} ${pinnedClass}" type="button" data-id="${item.id}">
            <span class="xinliao-contact-check"></span>
            <div class="xinliao-avatar">${buildAvatarMarkup(item.avatar)}</div>
            <div class="xinliao-contact-name">${item.name || "未知"}</div>
          </button>
        `;
      }
    )
    .join("");
};

const renderMoments = (container, list = []) => {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="xinliao-empty">暂无动态</div>`;
    return;
  }
  container.innerHTML = list
    .map(
      (item) => `
      <div class="xinliao-card">
        <div class="xinliao-row">
          <div class="xinliao-avatar">🌟</div>
          <div class="xinliao-meta">
            <div class="xinliao-name">${item.title || "话题"}</div>
            <div class="xinliao-desc">${item.desc || "暂无说明"}</div>
          </div>
          <span class="xinliao-tag">新</span>
        </div>
      </div>
    `
    )
    .join("");
};

export const initXinliaoView = () => {
  const homeView = getEl("homeView");
  const settingsView = getEl("settingsView");
  const xinliaoView = getEl("xinliaoView");
  const backButton = getEl("xinliaoBack");
  const tabBar = getEl("xinliaoTabs");

  if (!homeView || !settingsView || !xinliaoView || !backButton || !tabBar) {
    return;
  }

  const tabs = defaultTabs || [];
  tabBar.innerHTML = tabs
    .map(
      (tab, index) => `
      <button class="xinliao-tab ${
        index === 0 ? "active" : ""
      }" data-tab="${tab.id}">
        ${tab.label}
      </button>
    `
    )
    .join("");

  const panels = tabs.map((tab) => ({
    id: tab.id,
    el: getEl(`xinliaoPanel-${tab.id}`),
  }));

  const messagesAdd = getEl("xinliaoMessagesAdd");
  const contactsDropdown = getEl("xinliaoContactsDropdown");
  const contactsMenu = getEl("xinliaoContactsMenu");
  const dropdownCreate = getEl("xinliaoDropdownCreate");
  const dropdownImport = getEl("xinliaoDropdownImport");

  const setActiveTab = (tabId) => {
    const tabButtons = tabBar.querySelectorAll(".xinliao-tab");
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    panels.forEach(({ id, el }) => {
      if (!el) return;
      el.classList.toggle("active", id === tabId);
    });
    // 根据当前标签显示对应的添加按钮
    messagesAdd?.classList.toggle("is-hidden", tabId !== "messages");
    contactsDropdown?.classList.toggle("is-hidden", tabId !== "contacts");
    // 切换标签时关闭下拉菜单
    contactsMenu?.classList.add("is-hidden");
  };

  tabBar.addEventListener("click", (event) => {
    const button = event.target.closest(".xinliao-tab");
    if (!button) return;
    setActiveTab(button.dataset.tab);
  });

  const showXinliao = () => {
    homeView.classList.add("is-hidden");
    settingsView.classList.remove("active");
    xinliaoView.classList.add("active");
  };

  const showHome = () => {
    xinliaoView.classList.remove("active");
    homeView.classList.remove("is-hidden");
  };

  const bindXinliaoApp = () => {
    const xinliaoApps = document.querySelectorAll(
      '.app[data-app-name="信聊"]'
    );
    xinliaoApps.forEach((app) => {
      app.addEventListener("click", showXinliao);
    });
  };

  backButton.addEventListener("click", showHome);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && xinliaoView.classList.contains("active")) {
      showHome();
    }
  });

  const storedContacts = loadStoredContacts();
  // 如果存储的联系人为空，使用默认联系人
  const useDefault = !storedContacts.length && placeholderContacts?.length;
  const contacts = useDefault
    ? placeholderContacts.map(normalizeContact)
    : storedContacts;
  if (useDefault) {
    saveContacts(contacts);
  }

  const contactsList = getEl("xinliaoContactsList");
  const contactsAdd = getEl("xinliaoContactsAdd");
  const contactsActions = getEl("xinliaoContactActions");
  const showCreate = getEl("xinliaoShowCreate");
  const showImport = getEl("xinliaoShowImport");
  const createForm = getEl("xinliaoCreateForm");
  const importForm = getEl("xinliaoImportForm");
  const createConfirm = getEl("xinliaoCreateConfirm");
  const avatarInput = getEl("xinliaoAvatarInput");
  const avatarFileInput = getEl("xinliaoAvatarFileInput");
  const nameInput = getEl("xinliaoNameInput");
  const personaInput = getEl("xinliaoPersonaInput");
  const importInput = getEl("xinliaoImportInput");
  const contactsHint = getEl("xinliaoContactsHint");
  const contactDetail = getEl("xinliaoContactDetail");
  const detailAvatar = getEl("xinliaoDetailAvatar");
  const detailAvatarFile = getEl("xinliaoDetailAvatarFile");
  const detailName = getEl("xinliaoDetailName");
  const detailPersona = getEl("xinliaoDetailPersona");
  const detailSave = getEl("xinliaoDetailSave");
  const detailClose = getEl("xinliaoDetailClose");
  const detailHint = getEl("xinliaoDetailHint");
  const contactsSearch = getEl("xinliaoContactsSearch");
  let activeContactId = null;
  let contactKeyword = "";

  const getFilteredContacts = () => {
    const keyword = contactKeyword.trim().toLowerCase();
    if (!keyword) return contacts;
    return contacts.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const persona = String(item.persona || "").toLowerCase();
      return name.includes(keyword) || persona.includes(keyword);
    });
  };

  const updateContactsView = () => {
    if (!contactsList) return;
    const list = getFilteredContacts();
    if (!list.length) {
      contactsList.innerHTML = `<div class="xinliao-empty">未找到角色</div>`;
      return;
    }
    renderContacts(contactsList, list);
  };

  const hideHint = () => {
    if (!contactsHint) return;
    contactsHint.classList.add("is-hidden");
    contactsHint.textContent = "";
  };

  const showHint = (message) => {
    if (!contactsHint) return;
    contactsHint.textContent = message;
    contactsHint.classList.remove("is-hidden");
  };

  const hideDetailHint = () => {
    if (!detailHint) return;
    detailHint.classList.add("is-hidden");
    detailHint.textContent = "";
  };

  const showDetailHint = (message) => {
    if (!detailHint) return;
    detailHint.textContent = message;
    detailHint.classList.remove("is-hidden");
  };

  const readAvatarFile = (file, onSuccess, onError) => {
    const reader = new FileReader();
    reader.onload = () => onSuccess?.(reader.result);
    reader.onerror = () => onError?.();
    reader.readAsDataURL(file);
  };

  const handleAvatarFileChange = (event, targetInput, hintFn) => {
    const file = event.target.files?.[0];
    if (!file || !targetInput) return;
    readAvatarFile(
      file,
      (result) => {
        targetInput.value = result;
        hintFn?.("头像已填入，可直接保存");
      },
      () => {
        hintFn?.("图片读取失败，请重试");
      }
    );
  };

  const openDetail = (contactId) => {
    if (!contactDetail) return;
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return;
    activeContactId = contactId;
    if (detailAvatar) detailAvatar.value = contact.avatar || "👤";
    if (detailName) detailName.value = contact.name || "";
    if (detailPersona) detailPersona.value = contact.persona || "";
    contactDetail.classList.remove("is-hidden");
    hideDetailHint();
  };

  const closeDetail = () => {
    if (!contactDetail) return;
    contactDetail.classList.add("is-hidden");
    activeContactId = null;
    if (detailAvatarFile) detailAvatarFile.value = "";
    hideDetailHint();
  };

  const toggleActions = () => {
    if (!contactsActions) return;
    contactsActions.classList.toggle("is-hidden");
    hideHint();
  };

  const activateForm = (type) => {
    if (createForm) createForm.classList.toggle("is-hidden", type !== "create");
    if (importForm) importForm.classList.toggle("is-hidden", type !== "import");
    hideHint();
  };

  const addContacts = (items) => {
    items.forEach((item) => contacts.push(normalizeContact(item)));
    saveContacts(contacts);
    updateContactsView();
  };

  const handleDetailSave = () => {
    if (!activeContactId) return;
    const avatar = detailAvatar?.value.trim() || "👤";
    const name = detailName?.value.trim();
    const persona = detailPersona?.value.trim();

    if (!name || !persona) {
      showDetailHint("请填写姓名和具体人设");
      return;
    }

    const contact = contacts.find((item) => item.id === activeContactId);
    if (!contact) return;
    contact.avatar = avatar;
    contact.name = name;
    contact.persona = persona;
    saveContacts(contacts);
    if (detailAvatarFile) detailAvatarFile.value = "";
    updateContactsView();
    // 保存后关闭详情页
    closeDetail();
  };

  const handleCreate = () => {
    const avatar = avatarInput?.value.trim() || "👤";
    const name = nameInput?.value.trim();
    const persona = personaInput?.value.trim();

    if (!name || !persona) {
      showHint("请填写姓名和具体人设");
      return;
    }

    addContacts([{ avatar, name, persona }]);
    if (avatarInput) avatarInput.value = "";
    if (avatarFileInput) avatarFileInput.value = "";
    if (nameInput) nameInput.value = "";
    if (personaInput) personaInput.value = "";
    hideHint();
    activateForm("create");
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      if (!items.length) {
        showHint("文件内容为空");
        return;
      }
      addContacts(items);
      hideHint();
      event.target.value = "";
    } catch (error) {
      showHint("文件解析失败，请使用 JSON 格式");
    }
  };

  // 下拉菜单切换
  const toggleDropdownMenu = () => {
    contactsMenu?.classList.toggle("is-hidden");
  };

  // 关闭下拉菜单
  const closeDropdownMenu = () => {
    contactsMenu?.classList.add("is-hidden");
  };

  // 隐藏操作面板
  const hideActions = () => {
    contactsActions?.classList.add("is-hidden");
    createForm?.classList.add("is-hidden");
    importForm?.classList.add("is-hidden");
    hideHint();
  };

  // 点击加号按钮切换下拉菜单
  contactsAdd?.addEventListener("click", (event) => {
    event.stopPropagation();
    // 如果操作面板已显示，则隐藏它
    if (!contactsActions?.classList.contains("is-hidden")) {
      hideActions();
      return;
    }
    toggleDropdownMenu();
  });

  // 下拉菜单 - 创建角色
  dropdownCreate?.addEventListener("click", () => {
    closeDropdownMenu();
    // 显示操作面板并激活创建表单
    contactsActions?.classList.remove("is-hidden");
    activateForm("create");
  });

  // 下拉菜单 - 导入文件
  dropdownImport?.addEventListener("click", () => {
    closeDropdownMenu();
    // 显示操作面板并激活导入表单
    contactsActions?.classList.remove("is-hidden");
    activateForm("import");
  });

  // 点击外部关闭下拉菜单
  document.addEventListener("click", (event) => {
    if (!contactsDropdown?.contains(event.target)) {
      closeDropdownMenu();
    }
  });

  showCreate?.addEventListener("click", () => activateForm("create"));
  avatarFileInput?.addEventListener("change", (event) => {
    handleAvatarFileChange(event, avatarInput, showHint);
  });
  detailAvatarFile?.addEventListener("change", (event) => {
    handleAvatarFileChange(event, detailAvatar, showDetailHint);
  });
  showImport?.addEventListener("click", () => activateForm("import"));
  createConfirm?.addEventListener("click", handleCreate);
  importInput?.addEventListener("change", handleImport);
  // ========== 联系人选择模式 ==========
  const contactsDeleteBar = getEl("xinliaoContactsDeleteBar");
  const contactsDeleteCount = getEl("xinliaoContactsDeleteCount");
  const contactsDeleteBtn = getEl("xinliaoContactsDeleteBtn");
  const contactsDeleteCancel = getEl("xinliaoContactsDeleteCancel");

  // 更新删除栏显示
  const updateContactsDeleteBar = () => {
    if (!contactsDeleteBar) return;
    if (isContactSelectMode) {
      contactsDeleteBar.classList.remove("is-hidden");
      if (contactsDeleteCount) {
        contactsDeleteCount.textContent = selectedContactIds.size;
      }
      if (contactsDeleteBtn) {
        contactsDeleteBtn.disabled = selectedContactIds.size === 0;
      }
    } else {
      contactsDeleteBar.classList.add("is-hidden");
    }
  };

  // 进入联系人选择模式
  const enterContactSelectMode = () => {
    isContactSelectMode = true;
    selectedContactIds.clear();
    updateContactsDeleteBar();
    updateContactsView();
  };

  // 退出联系人选择模式
  const exitContactSelectMode = () => {
    isContactSelectMode = false;
    selectedContactIds.clear();
    updateContactsDeleteBar();
    updateContactsView();
  };

  // 切换联系人选中状态
  const toggleContactSelect = (contactId) => {
    if (selectedContactIds.has(contactId)) {
      selectedContactIds.delete(contactId);
    } else {
      selectedContactIds.add(contactId);
    }
    updateContactsDeleteBar();
    updateContactsView();
  };

  // 删除选中的联系人
  const deleteSelectedContacts = () => {
    if (selectedContactIds.size === 0) return;

    // 从 contacts 数组中移除选中的联系人
    const idsToDelete = Array.from(selectedContactIds);
    for (const id of idsToDelete) {
      const index = contacts.findIndex((c) => c.id === id);
      if (index !== -1) {
        contacts.splice(index, 1);
      }
    }

    // 保存更新后的联系人列表
    saveContacts(contacts);
    exitContactSelectMode();
  };

  // 联系人列表点击事件
  contactsList?.addEventListener("click", (event) => {
    const item = event.target.closest(".xinliao-contact-item");
    if (!item) return;

    const contactId = item.dataset.id;
    if (isContactSelectMode) {
      toggleContactSelect(contactId);
    } else {
      // 如果点击的是当前已打开详情的角色，则关闭详情
      if (activeContactId === contactId && !contactDetail?.classList.contains("is-hidden")) {
        closeDetail();
      } else {
        openDetail(contactId);
      }
    }
  });

  // 长按进入选择模式
  let contactLongPressTimer = null;
  contactsList?.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(".xinliao-contact-item");
    if (!item || isContactSelectMode) return;

    const contactId = item.dataset.id;
    contactLongPressTimer = setTimeout(() => {
      enterContactSelectMode();
      toggleContactSelect(contactId);
    }, 500);
  });

  contactsList?.addEventListener("pointerup", () => {
    if (contactLongPressTimer) {
      clearTimeout(contactLongPressTimer);
      contactLongPressTimer = null;
    }
  });

  contactsList?.addEventListener("pointerleave", () => {
    if (contactLongPressTimer) {
      clearTimeout(contactLongPressTimer);
      contactLongPressTimer = null;
    }
  });

  // 删除栏按钮事件
  contactsDeleteBtn?.addEventListener("click", deleteSelectedContacts);
  contactsDeleteCancel?.addEventListener("click", exitContactSelectMode);

  // 切换联系人置顶状态
  const toggleContactPin = (contactId) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    contact.pinned = !contact.pinned;
    saveContacts(contacts);
    updateContactsView();
  };

  // 双击切换置顶
  contactsList?.addEventListener("dblclick", (event) => {
    const item = event.target.closest(".xinliao-contact-item");
    if (!item || isContactSelectMode) return;
    toggleContactPin(item.dataset.id);
  });

  detailSave?.addEventListener("click", handleDetailSave);
  detailClose?.addEventListener("click", closeDetail);
  contactsSearch?.addEventListener("input", (event) => {
    contactKeyword = event.target.value || "";
    updateContactsView();
  });

  // 初始化聊天模块
  const chatModule = initChatModule({
    getContacts: () => contacts,
    onBack: () => {
      // 返回时刷新会话列表
      messagesModule?.reloadChats();
    },
    onChatUpdate: () => {
      // 聊天更新时刷新会话列表
      messagesModule?.reloadChats();
    },
  });

  // 初始化消息模块（传入获取联系人的函数和点击回调）
  const messagesModule = initMessagesModule({
    getContacts: () => contacts,
    onChatClick: (chat) => {
      // 点击会话时打开聊天界面
      chatModule?.openChat(chat);
    },
  });

  // 初始渲染
  updateContactsView();
  renderMoments(getEl("xinliaoMomentsList"), placeholderMoments);

  bindXinliaoApp();
  setActiveTab(tabs[0]?.id || "messages");
};
