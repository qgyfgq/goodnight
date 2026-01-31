import {
  defaultTabs,
  placeholderContacts,
} from "../xinliao/xinliaoData.js";
import { initMessagesModule } from "../xinliao/messagesModule.js";
import { initChatModule } from "../xinliao/chatModule.js";
import { initMomentsModule } from "../xinliao/momentsModule.js";
import { loadWorldbookData, saveWorldbookData, createGroup, createEntry } from "../worldbook/worldbookData.js";

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
  worldbookIds: item.worldbookIds || [], // 关联的世界书设定 ID 列表
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


export const initXinliaoView = async () => {
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
  const momentsAdd = getEl("xinliaoMomentsAdd");

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
    momentsAdd?.classList.toggle("is-hidden", tabId !== "moments");
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

  // 模块引用（稍后初始化）
  let messagesModule = null;
  let chatModule = null;
  let momentsModule = null;

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
  const worldbookList = getEl("xinliaoWorldbookList");
  const worldbookToggle = getEl("xinliaoWorldbookToggle");
  const worldbookSelect = getEl("xinliaoWorldbookSelect");
  const worldbookField = worldbookToggle?.closest(".xinliao-worldbook-field");
  const worldbookCount = getEl("xinliaoWorldbookCount");
  let activeContactId = null;
  let contactKeyword = "";
  // 当前选中的世界书设定 ID
  let selectedWorldbookIds = new Set();
  // 展开的分组 ID
  let expandedGroupIds = new Set();
  // 世界书面板是否展开
  let isWorldbookExpanded = false;

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

  /**
   * HTML 转义
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的字符串
   */
  const escapeHtml = (str) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  /**
   * 更新世界书选中数量显示
   */
  const updateWorldbookCount = () => {
    if (worldbookCount) {
      const count = selectedWorldbookIds.size;
      worldbookCount.textContent = `${count} 个`;
    }
  };

  /**
   * 切换世界书面板展开/收起
   */
  const toggleWorldbookPanel = () => {
    isWorldbookExpanded = !isWorldbookExpanded;
    if (worldbookField) {
      worldbookField.classList.toggle("is-expanded", isWorldbookExpanded);
    }
    if (worldbookSelect) {
      worldbookSelect.classList.toggle("is-hidden", !isWorldbookExpanded);
    }
  };

  // 世界书折叠面板点击事件
  worldbookToggle?.addEventListener("click", toggleWorldbookPanel);

  /**
   * 渲染世界书选择器
   */
  const renderWorldbookSelect = () => {
    if (!worldbookList) return;

    // 更新选中数量
    updateWorldbookCount();

    const { groups, entries } = loadWorldbookData();

    // 如果没有世界书数据
    if (!groups.length && !entries.length) {
      worldbookList.innerHTML = `<div class="xinliao-worldbook-empty">暂无世界书数据</div>`;
      return;
    }

    let html = "";

    // 渲染分组
    groups.forEach((group) => {
      const groupEntries = entries.filter((e) => e.groupId === group.id);
      const selectedCount = groupEntries.filter((e) => selectedWorldbookIds.has(e.id)).length;
      const isExpanded = expandedGroupIds.has(group.id);
      const isAllSelected = groupEntries.length > 0 && selectedCount === groupEntries.length;
      const isPartial = selectedCount > 0 && selectedCount < groupEntries.length;

      const headerClass = isAllSelected ? "is-selected" : isPartial ? "is-partial" : "";
      const expandedClass = isExpanded ? "is-expanded" : "";

      html += `
        <div class="xinliao-worldbook-group ${expandedClass}" data-group-id="${group.id}">
          <div class="xinliao-worldbook-group-header ${headerClass}" data-group-id="${group.id}">
            <span class="xinliao-worldbook-group-check"></span>
            <span class="xinliao-worldbook-group-icon">📁</span>
            <span class="xinliao-worldbook-group-name">${escapeHtml(group.name)}</span>
            <span class="xinliao-worldbook-group-count">${groupEntries.length}</span>
            <span class="xinliao-worldbook-group-toggle">›</span>
          </div>
          <div class="xinliao-worldbook-entries">
            ${groupEntries.map((entry) => {
              const isSelected = selectedWorldbookIds.has(entry.id);
              const disabledClass = !entry.enabled ? "is-disabled" : "";
              return `
                <div class="xinliao-worldbook-entry ${isSelected ? "is-selected" : ""} ${disabledClass}" data-entry-id="${entry.id}">
                  <span class="xinliao-worldbook-entry-check"></span>
                  <span class="xinliao-worldbook-entry-name">${escapeHtml(entry.name)}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    });

    // 渲染未分组的设定
    const ungroupedEntries = entries.filter((e) => !e.groupId);
    if (ungroupedEntries.length > 0) {
      html += `
        <div class="xinliao-worldbook-ungrouped">
          <div class="xinliao-worldbook-ungrouped-title">未分组设定</div>
          ${ungroupedEntries.map((entry) => {
            const isSelected = selectedWorldbookIds.has(entry.id);
            const disabledClass = !entry.enabled ? "is-disabled" : "";
            return `
              <div class="xinliao-worldbook-entry ${isSelected ? "is-selected" : ""} ${disabledClass}" data-entry-id="${entry.id}">
                <span class="xinliao-worldbook-entry-check"></span>
                <span class="xinliao-worldbook-entry-name">${escapeHtml(entry.name)}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    worldbookList.innerHTML = html || `<div class="xinliao-worldbook-empty">暂无世界书数据</div>`;
  };

  /**
   * 切换分组展开状态
   * @param {string} groupId - 分组 ID
   */
  const toggleGroupExpand = (groupId) => {
    if (expandedGroupIds.has(groupId)) {
      expandedGroupIds.delete(groupId);
    } else {
      expandedGroupIds.add(groupId);
    }
    renderWorldbookSelect();
  };

  /**
   * 切换设定选中状态
   * @param {string} entryId - 设定 ID
   */
  const toggleEntrySelect = (entryId) => {
    if (selectedWorldbookIds.has(entryId)) {
      selectedWorldbookIds.delete(entryId);
    } else {
      selectedWorldbookIds.add(entryId);
    }
    renderWorldbookSelect();
  };

  /**
   * 切换分组全选状态
   * @param {string} groupId - 分组 ID
   */
  const toggleGroupSelect = (groupId) => {
    const { entries } = loadWorldbookData();
    const groupEntries = entries.filter((e) => e.groupId === groupId);
    const selectedCount = groupEntries.filter((e) => selectedWorldbookIds.has(e.id)).length;
    const isAllSelected = groupEntries.length > 0 && selectedCount === groupEntries.length;

    if (isAllSelected) {
      // 取消全选
      groupEntries.forEach((e) => selectedWorldbookIds.delete(e.id));
    } else {
      // 全选
      groupEntries.forEach((e) => selectedWorldbookIds.add(e.id));
    }
    renderWorldbookSelect();
  };

  // 世界书选择器点击事件
  worldbookList?.addEventListener("click", (event) => {
    // 点击分组头部
    const groupHeader = event.target.closest(".xinliao-worldbook-group-header");
    if (groupHeader) {
      const groupId = groupHeader.dataset.groupId;
      // 点击复选框区域切换选中，点击其他区域切换展开
      const checkEl = event.target.closest(".xinliao-worldbook-group-check");
      if (checkEl) {
        toggleGroupSelect(groupId);
      } else {
        toggleGroupExpand(groupId);
      }
      return;
    }

    // 点击设定项
    const entryEl = event.target.closest(".xinliao-worldbook-entry");
    if (entryEl) {
      const entryId = entryEl.dataset.entryId;
      toggleEntrySelect(entryId);
      return;
    }
  });

  const openDetail = (contactId) => {
    if (!contactDetail) return;
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return;
    activeContactId = contactId;
    if (detailAvatar) detailAvatar.value = contact.avatar || "👤";
    if (detailName) detailName.value = contact.name || "";
    if (detailPersona) detailPersona.value = contact.persona || "";
    // 加载已关联的世界书
    selectedWorldbookIds = new Set(contact.worldbookIds || []);
    expandedGroupIds.clear();
    // 重置世界书面板为收起状态
    isWorldbookExpanded = false;
    if (worldbookField) {
      worldbookField.classList.remove("is-expanded");
    }
    if (worldbookSelect) {
      worldbookSelect.classList.add("is-hidden");
    }
    renderWorldbookSelect();
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
    // 保存世界书关联
    contact.worldbookIds = Array.from(selectedWorldbookIds);
    saveContacts(contacts);
    if (detailAvatarFile) detailAvatarFile.value = "";
    updateContactsView();
    // 同步更新消息列表（头像和名称可能已更改）
    messagesModule?.updateChatList();
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

  /**
   * 从 PNG 文件中提取角色卡数据
   * PNG 角色卡通常在 tEXt 或 iTXt 块中存储 base64 编码的 JSON 数据
   * @param {ArrayBuffer} buffer - PNG 文件的 ArrayBuffer
   * @returns {Object|null} 解析出的角色数据，或 null
   */
  const extractPngCharacterData = (buffer) => {
    const bytes = new Uint8Array(buffer);
    
    // 检查 PNG 签名
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== pngSignature[i]) {
        return null;
      }
    }
    
    let offset = 8;
    const textDecoder = new TextDecoder("utf-8");
    
    while (offset < bytes.length) {
      // 读取块长度（4 字节，大端序）
      const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 4;
      
      // 读取块类型（4 字节）
      const typeBytes = bytes.slice(offset, offset + 4);
      const type = textDecoder.decode(typeBytes);
      offset += 4;
      
      // 检查是否是 tEXt 或 iTXt 块
      if (type === "tEXt" || type === "iTXt") {
        const chunkData = bytes.slice(offset, offset + length);
        const chunkText = textDecoder.decode(chunkData);
        
        // tEXt 格式：keyword\0text
        // iTXt 格式：keyword\0compression\0language\0translated\0text
        const nullIndex = chunkText.indexOf("\0");
        if (nullIndex !== -1) {
          const keyword = chunkText.slice(0, nullIndex);
          
          // 常见的角色卡关键字
          if (keyword === "chara" || keyword === "ccv3" || keyword === "character") {
            let textContent;
            
            if (type === "tEXt") {
              textContent = chunkText.slice(nullIndex + 1);
            } else {
              // iTXt 需要跳过更多字段
              const parts = chunkText.slice(nullIndex + 1).split("\0");
              textContent = parts[parts.length - 1] || parts[0];
            }
            
            // 尝试 base64 解码（正确处理 UTF-8）
            try {
              // 使用正确的 UTF-8 解码方式
              const binaryString = atob(textContent);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const decoded = new TextDecoder("utf-8").decode(bytes);
              const jsonData = JSON.parse(decoded);
              return jsonData;
            } catch (e) {
              // 尝试直接解析 JSON
              try {
                return JSON.parse(textContent);
              } catch (e2) {
                // 继续查找其他块
              }
            }
          }
        }
      }
      
      // 跳过块数据和 CRC（4 字节）
      offset += length + 4;
      
      // 如果遇到 IEND 块，停止搜索
      if (type === "IEND") break;
    }
    
    return null;
  };

  /**
   * 从角色卡数据中提取并导入世界书
   * @param {Object} charData - 角色卡数据
   * @param {string} characterName - 角色名称
   * @returns {Array<string>} 导入的世界书条目 ID 列表
   */
  const importCharacterWorldbook = (charData, characterName) => {
    const data = charData.data || charData;
    const characterBook = data.character_book;
    
    if (!characterBook || !characterBook.entries) {
      return [];
    }
    
    // 获取当前世界书数据
    const worldbookData = loadWorldbookData();
    const importedEntryIds = [];
    
    // 创建一个以角色名命名的分组
    const groupName = `${characterName} 世界书`;
    const newGroup = createGroup(groupName);
    worldbookData.groups.push(newGroup);
    
    // 解析世界书条目
    const entries = characterBook.entries;
    
    // SillyTavern 格式：entries 可能是对象或数组
    if (typeof entries === "object" && !Array.isArray(entries)) {
      // 对象格式：{ "0": {...}, "1": {...} }
      for (const key of Object.keys(entries)) {
        const item = entries[key];
        if (item && typeof item === "object") {
          // 跳过禁用的条目
          if (item.disable === true || item.enabled === false) continue;
          
          const entryName = item.comment || item.name || item.title || `设定 ${key}`;
          const entryContent = item.content || item.description || "";
          
          // 跳过空内容
          if (!entryContent.trim()) continue;
          
          const newEntry = createEntry({
            name: entryName,
            content: entryContent,
            groupId: newGroup.id,
            keywords: item.key || item.keys || item.keywords || [],
            enabled: true,
          });
          
          worldbookData.entries.push(newEntry);
          importedEntryIds.push(newEntry.id);
        }
      }
    } else if (Array.isArray(entries)) {
      // 数组格式
      entries.forEach((item, index) => {
        if (!item || item.disable === true || item.enabled === false) return;
        
        const entryName = item.comment || item.name || item.title || `设定 ${index}`;
        const entryContent = item.content || item.description || "";
        
        if (!entryContent.trim()) return;
        
        const newEntry = createEntry({
          name: entryName,
          content: entryContent,
          groupId: newGroup.id,
          keywords: item.key || item.keys || item.keywords || [],
          enabled: true,
        });
        
        worldbookData.entries.push(newEntry);
        importedEntryIds.push(newEntry.id);
      });
    }
    
    // 如果没有导入任何条目，删除空分组
    if (importedEntryIds.length === 0) {
      const groupIndex = worldbookData.groups.findIndex(g => g.id === newGroup.id);
      if (groupIndex !== -1) {
        worldbookData.groups.splice(groupIndex, 1);
      }
      return [];
    }
    
    // 保存世界书数据
    saveWorldbookData(worldbookData);
    
    return importedEntryIds;
  };

  /**
   * 将角色卡数据转换为联系人格式
   * @param {Object} charData - 角色卡数据
   * @param {string} avatarDataUrl - 头像的 data URL（可选）
   * @param {Array<string>} worldbookIds - 关联的世界书条目 ID 列表
   * @returns {Object} 联系人对象
   */
  const convertCharacterToContact = (charData, avatarDataUrl = null, worldbookIds = []) => {
    // 支持多种角色卡格式
    const data = charData.data || charData;
    
    return {
      avatar: avatarDataUrl || data.avatar || data.image || "👤",
      name: data.name || data.char_name || data.character_name || "未命名",
      persona: data.description || data.persona || data.char_persona || data.personality || "暂无人设",
      // 关联的世界书条目
      worldbookIds: worldbookIds,
      // 保留其他可能有用的字段
      personality: data.personality,
      scenario: data.scenario,
      first_mes: data.first_mes,
      mes_example: data.mes_example,
    };
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const isPng = fileName.endsWith(".png") || file.type === "image/png";
    
    try {
      if (isPng) {
        // 处理 PNG 角色卡
        const buffer = await file.arrayBuffer();
        const charData = extractPngCharacterData(buffer);
        
        if (!charData) {
          showHint("PNG 文件中未找到角色数据");
          event.target.value = "";
          return;
        }
        
        // 获取角色名称
        const data = charData.data || charData;
        const characterName = data.name || data.char_name || data.character_name || "未命名";
        
        // 导入世界书并获取条目 ID
        const worldbookIds = importCharacterWorldbook(charData, characterName);
        const worldbookCount = worldbookIds.length;
        
        // 同时读取图片作为头像
        const reader = new FileReader();
        reader.onload = () => {
          const avatarDataUrl = reader.result;
          const contact = convertCharacterToContact(charData, avatarDataUrl, worldbookIds);
          addContacts([contact]);
          
          // 显示导入结果
          if (worldbookCount > 0) {
            showHint(`已导入角色：${contact.name}（含 ${worldbookCount} 条世界书设定）`);
          } else {
            showHint(`已导入角色：${contact.name}`);
          }
          event.target.value = "";
        };
        reader.onerror = () => {
          // 即使头像读取失败，也导入角色数据
          const contact = convertCharacterToContact(charData, null, worldbookIds);
          addContacts([contact]);
          
          if (worldbookCount > 0) {
            showHint(`已导入角色：${contact.name}（含 ${worldbookCount} 条世界书设定）`);
          } else {
            showHint(`已导入角色：${contact.name}`);
          }
          event.target.value = "";
        };
        reader.readAsDataURL(file);
      } else {
        // 处理 JSON 文件
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
      }
    } catch (error) {
      console.error("导入失败", error);
      showHint("文件解析失败，请使用 JSON 或 PNG 角色卡格式");
      event.target.value = "";
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

  // 双击头像输入框全选内容（方便删除长链接）
  detailAvatar?.addEventListener("dblclick", () => {
    detailAvatar.select();
  });

  // 同样为创建角色的头像输入框添加双击全选
  avatarInput?.addEventListener("dblclick", () => {
    avatarInput.select();
  });

  // 初始化动态模块（先初始化，以便传递给聊天模块）
  momentsModule = initMomentsModule();

  // 初始化聊天模块
  chatModule = initChatModule({
    getContacts: () => contacts,
    onBack: () => {
      // 返回时刷新会话列表
      messagesModule?.reloadChats();
    },
    onChatUpdate: () => {
      // 聊天更新时刷新会话列表
      messagesModule?.reloadChats();
    },
    // 传递动态模块接口
    momentsModule,
  });

  // 初始化消息模块（传入获取联系人的函数和点击回调）
  messagesModule = await initMessagesModule({
    getContacts: () => contacts,
    onChatClick: (chat) => {
      // 点击会话时打开聊天界面
      chatModule?.openChat(chat);
    },
  });

  // 初始渲染
  updateContactsView();

  bindXinliaoApp();
  setActiveTab(tabs[0]?.id || "messages");
};
