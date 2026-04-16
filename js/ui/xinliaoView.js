import {
  defaultTabs,
} from "../xinliao/xinliaoData.js";
import { initMessagesModule } from "../xinliao/messagesModule.js";
import { initChatModule } from "../xinliao/chatModule.js";
import { initMomentsModule } from "../xinliao/momentsModule.js";
import { loadChatMessages, saveChatMessages, deleteChatMessages } from "../xinliao/chatData.js";
import { loadStoredChats, saveChats } from "../xinliao/messagesData.js";
import { requestChatJson, getDefaultMask } from "../xinliao/apiClient.js";
import { getNearbyToneSetting } from "./otherSettings.js";
import { loadStoredNearby, saveNearby, normalizeNearby } from "../xinliao/nearbyData.js";
import { loadWorldbookData, saveWorldbookData, createGroup, createEntry } from "../worldbook/worldbookData.js";
import { loadContactsFromIDB, saveContactsToIDB } from "../storage/indexedDB.js";

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
const GROUPS_STORAGE_KEY = "xinliaoContactGroups";

// 联系人分组数据
let contactGroups = [];

/**
 * 加载分组数据
 */
const loadStoredGroups = () => {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
};

/**
 * 保存分组数据
 */
const saveGroups = (groups) => {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    // 忽略存储失败
  }
};

/**
 * 创建新分组
 */
const createContactGroup = (name) => {
  const group = {
    id: `group-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: name,
    contactIds: [],
    createdAt: Date.now(),
  };
  return group;
};

const loadStoredContacts = async () => {
  try {
    const idbList = await loadContactsFromIDB();
    const validIdbList = (Array.isArray(idbList) ? idbList : []).filter(
      (item) => item && (item.id || item.name)
    );
    if (validIdbList.length) {
      return validIdbList.map(normalizeContact);
    }
  } catch (error) {
    console.warn("从 IndexedDB 加载联系人失败，回退 localStorage:", error);
  }

  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    const validList = list.filter((item) => item && (item.id || item.name));
    if (!validList.length) return [];
    const normalized = validList.map(normalizeContact);
    saveContactsToIDB(normalized).catch((error) => {
      console.warn("联系人迁移到 IndexedDB 失败:", error);
    });
    return normalized;
  } catch (error) {
    return [];
  }
};

const saveContacts = async (list) => {
  try {
    await saveContactsToIDB(list);
  } catch (error) {
    console.warn("保存联系人到 IndexedDB 失败:", error);
  }

  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("保存联系人到 localStorage 失败（可能是配额不足）:", error);
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
  const xinliaoTitle = xinliaoView?.querySelector(".xinliao-title");

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
  const nearbyDropdown = getEl("xinliaoNearbyDropdown");
  const nearbyMenu = getEl("xinliaoNearbyMenu");
  const nearbyMore = getEl("xinliaoNearbyMore");
  const nearbyRefresh = getEl("xinliaoNearbyRefresh");
  const nearbyBlock = getEl("xinliaoNearbyBlock");
  const nearbyToolbar = getEl("xinliaoNearbyToolbar");
  const nearbySelectedCount = getEl("xinliaoNearbySelectedCount");
  const nearbyDelete = getEl("xinliaoNearbyDelete");
  const nearbyCancel = getEl("xinliaoNearbyCancel");
  const nearbyHint = getEl("xinliaoNearbyHint");
  const nearbyListEl = getEl("xinliaoNearbyList");
  const discoverMenu = getEl("xinliaoDiscoverMenu");
  const discoverMoments = getEl("xinliaoDiscoverMoments");
  const discoverNearby = getEl("xinliaoDiscoverNearby");

  let activeDiscover = "menu";
  let isNearbySelectMode = false;
  let selectedNearbyIds = new Set();
  let nearbyList = loadStoredNearby();
  let isNearbyRefreshing = false;

  const updateDiscoverView = () => {
    if (!discoverMenu || !discoverMoments || !discoverNearby) return;
    discoverMenu.classList.toggle("is-hidden", activeDiscover !== "menu");
    discoverMoments.classList.toggle("is-hidden", activeDiscover !== "moments");
    discoverNearby.classList.toggle("is-hidden", activeDiscover !== "nearby");
    momentsAdd?.classList.toggle("is-hidden", activeDiscover !== "moments");
    xinliaoView.classList.toggle("is-discover-subpage", activeDiscover !== "menu");
    nearbyDropdown?.classList.toggle("is-hidden", activeDiscover !== "nearby");
    nearbyMenu?.classList.add("is-hidden");
    if (xinliaoTitle) {
      if (activeDiscover === "moments") {
        xinliaoTitle.textContent = "动态";
      } else if (activeDiscover === "nearby") {
        xinliaoTitle.textContent = "附近的人";
      } else {
        xinliaoTitle.textContent = "信聊";
      }
    }
  };

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
    if (tabId === "moments") {
      updateDiscoverView();
    } else {
      activeDiscover = "menu";
      momentsAdd?.classList.add("is-hidden");
      nearbyDropdown?.classList.add("is-hidden");
      nearbyMenu?.classList.add("is-hidden");
      exitNearbySelectMode();
      xinliaoView.classList.remove("is-discover-subpage");
      if (xinliaoTitle) xinliaoTitle.textContent = "信聊";
    }
    // 切换标签时关闭下拉菜单
    contactsMenu?.classList.add("is-hidden");
  };

  tabBar.addEventListener("click", (event) => {
    const button = event.target.closest(".xinliao-tab");
    if (!button) return;
    setActiveTab(button.dataset.tab);
  });

  discoverMenu?.addEventListener("click", (event) => {
    const item = event.target.closest(".xinliao-discover-item");
    if (!item) return;
    const target = item.dataset.target;
    if (target === "moments" || target === "nearby") {
      activeDiscover = target;
      updateDiscoverView();
      if (activeDiscover === "nearby") {
        renderNearbyList();
      }
    }
  });

  xinliaoView?.addEventListener("click", (event) => {
    const backBtn = event.target.closest(".xinliao-discover-back");
    if (!backBtn) return;
    activeDiscover = "menu";
    updateDiscoverView();
  });

  const showNearbyHint = (message) => {
    if (!nearbyHint) return;
    nearbyHint.textContent = message;
    nearbyHint.classList.remove("is-hidden");
  };

  const hideNearbyHint = () => {
    if (!nearbyHint) return;
    nearbyHint.textContent = "";
    nearbyHint.classList.add("is-hidden");
  };

  const updateNearbyToolbar = () => {
    if (!nearbyToolbar || !nearbySelectedCount) return;
    nearbyToolbar.classList.toggle("is-hidden", !isNearbySelectMode);
    nearbySelectedCount.textContent = String(selectedNearbyIds.size);
  };

  const enterNearbySelectMode = () => {
    isNearbySelectMode = true;
    selectedNearbyIds.clear();
    updateNearbyToolbar();
    renderNearbyList();
  };

  const exitNearbySelectMode = () => {
    isNearbySelectMode = false;
    selectedNearbyIds.clear();
    updateNearbyToolbar();
    renderNearbyList();
  };

  const toggleNearbySelect = (id) => {
    if (selectedNearbyIds.has(id)) {
      selectedNearbyIds.delete(id);
    } else {
      selectedNearbyIds.add(id);
    }
    updateNearbyToolbar();
    renderNearbyList();
  };

  const openNearbyChat = async (nearbyItem) => {
    if (!nearbyItem || !chatModule) return;
    try {
      showNearbyHint("正在打开聊天...");
      const chatId = `nearby-chat-${nearbyItem.id}`;
      const baseChat = {
        id: chatId,
        type: "single",
        source: "nearby",
        name: nearbyItem.name,
        avatar: nearbyItem.avatar,
        members: [nearbyItem.id],
        nearbyContact: {
          id: nearbyItem.id,
          name: nearbyItem.name,
          avatar: nearbyItem.avatar,
          persona: `你是“附近的人”中的陌生人 ${nearbyItem.name}，会主动搭讪用户，语气贴近开场文案：${nearbyItem.line || "你好，认识一下。"}`
        },
      };

      const storedChats = await loadStoredChats();
      const existedChat = storedChats.find((c) => c.id === chatId);
      const existedMessages = await loadChatMessages(chatId);
      if (existedChat && existedMessages.length > 0) {
        hideNearbyHint();
        chatModule.openChat({
          ...existedChat,
          source: "nearby",
          nearbyContact: baseChat.nearbyContact,
        });
        return;
      }

      const mask = await getDefaultMask();
      const userName = mask?.name || "你";
      const prompt = `你在扮演“附近的人”中的陌生人。` +
        `你的网名是“${nearbyItem.name}”，头像风格可忽略。` +
        `现在请向用户“${userName}”发送 2-4 条连续私聊开场消息，语气符合你的人设。` +
        `输出 JSON 字符串数组。每条 8-26 字。不要编号，不要解释。`;
      let generated = [];
      try {
        const apiMessages = await requestChatJson({ prompt });
        if (Array.isArray(apiMessages)) {
          generated = apiMessages
            .map((item) => String(item || "").trim())
            .filter(Boolean)
            .slice(0, 4);
        }
      } catch (error) {
        console.warn("生成附近的人聊天开场失败，使用回退文案", error);
      }

      if (!generated.length) {
        generated = [
          `嗨，我是${nearbyItem.name}，刚好刷到你。`,
          "看你气质挺特别，想先认识一下。",
        ];
      }

      const previewLine = String(nearbyItem.line || "").trim();
      if (previewLine) {
        if (generated.length >= 4) {
          generated[generated.length - 1] = previewLine;
        } else {
          generated.push(previewLine);
        }
      }

      const chat = {
        ...baseChat,
        lastMessage: generated[generated.length - 1] || "",
        lastTime: Date.now(),
      };

      const messages = generated.map((content) => ({
        id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
        senderId: nearbyItem.id,
      }));

      await saveChatMessages(chat.id, messages);
      const nextChats = [chat, ...storedChats.filter((c) => c.id !== chat.id)];
      await saveChats(nextChats);
      messagesModule?.reloadChats();
      hideNearbyHint();
      chatModule.openChat(chat);
    } catch (error) {
      console.error("打开附近的人聊天失败", error);
      showNearbyHint("打开聊天失败，请重试");
    }
  };

  const renderNearbyList = () => {
    if (!nearbyListEl) return;
    if (!nearbyList.length) {
      nearbyListEl.innerHTML = `<div class="xinliao-empty">暂无附近的人，点击右上角刷新</div>`;
      return;
    }
    nearbyListEl.innerHTML = nearbyList
      .map((item) => {
        const isSelected = selectedNearbyIds.has(item.id);
        const selectModeClass = isNearbySelectMode ? "is-select-mode" : "";
        const selectedClass = isSelected ? "is-selected" : "";
        return `
          <button class="xinliao-nearby-item ${selectModeClass} ${selectedClass}" type="button" data-id="${item.id}">
            <span class="xinliao-nearby-check"></span>
            <div class="xinliao-avatar">${buildAvatarMarkup(item.avatar)}</div>
            <div class="xinliao-nearby-meta">
              <div class="xinliao-nearby-name">${escapeHtml(item.name)}</div>
              <div class="xinliao-nearby-line">${escapeHtml(item.line)}</div>
            </div>
          </button>
        `;
      })
      .join("");
  };

  const refreshNearbyList = async () => {
    if (isNearbyRefreshing) return;
    try {
      isNearbyRefreshing = true;
      hideNearbyHint();
      showNearbyHint("正在刷新...");
      const count = 5 + Math.floor(Math.random() * 6);
      const mask = await getDefaultMask();
      const userName = mask?.name || "你";
      const userDesc = mask?.description ? `用户描述：${mask.description}` : "";
      const tone = getNearbyToneSetting();
      let toneHint = "";
      if (tone <= 0) {
        toneHint = "全部礼貌克制，避免暧昧或越界内容。";
      } else if (tone <= 3) {
        toneHint = "整体偏礼貌友好，允许轻微好感表达，但不越界。";
      } else if (tone <= 6) {
        toneHint = "适度暧昧，包含 2-3 个更不正经的对象。";
      } else if (tone <= 8) {
        toneHint = "更大胆直白，包含 3 个左右更露骨/放纵的对象。";
      } else {
        toneHint = "全部放纵自我，语言露骨越界、直白大胆。";
      }
      const promptBase = `请生成 ${count} 个“附近的人”，人设尽量多样不雷同。` +
        `陌生人尺度为 ${tone}/10：${toneHint}` +
        `所有搭讪话术必须以向用户搭讪的口吻，直接对用户说话。` +
        `用户人设：用户名：${userName}。${userDesc}` +
        `输出 JSON 数组，每项字段：` +
        `id(唯一字符串)、name(网名，2-6字)、avatar(单个emoji)、line(一句搭讪话，8-20字)。只输出 JSON 数组。`;
      let data;
      try {
        data = await requestChatJson({ prompt: promptBase });
      } catch (firstError) {
        const retryPrompt = `${promptBase} 请确保输出为有效 JSON 数组，不要包含解释或多余文字。`;
        data = await requestChatJson({ prompt: retryPrompt });
      }
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("返回数据为空");
      }
      nearbyList = data.slice(0, 10).map(normalizeNearby);
      saveNearby(nearbyList);
      exitNearbySelectMode();
      renderNearbyList();
      hideNearbyHint();
    } catch (error) {
      console.error("刷新附近的人失败", error);
      showNearbyHint(error?.message || "刷新失败，请稍后再试");
    } finally {
      isNearbyRefreshing = false;
    }
  };

  const deleteSelectedNearby = () => {
    if (selectedNearbyIds.size === 0) return;
    nearbyList = nearbyList.filter((item) => !selectedNearbyIds.has(item.id));
    saveNearby(nearbyList);
    exitNearbySelectMode();
    renderNearbyList();
  };

  const toggleNearbyMenu = () => {
    nearbyMenu?.classList.toggle("is-hidden");
  };

  const closeNearbyMenu = () => {
    nearbyMenu?.classList.add("is-hidden");
  };

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

  backButton.addEventListener("click", () => {
    if (xinliaoView.classList.contains("is-discover-subpage")) {
      activeDiscover = "menu";
      updateDiscoverView();
      return;
    }
    showHome();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && xinliaoView.classList.contains("active")) {
      showHome();
    }
  });

  const storedContacts = await loadStoredContacts();
  const contacts = storedContacts;

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

  /**
   * 获取已分组的联系人 ID 集合
   */
  const getGroupedContactIds = () => {
    const ids = new Set();
    contactGroups.forEach((group) => {
      group.contactIds.forEach((id) => ids.add(id));
    });
    return ids;
  };

  const getFilteredContacts = () => {
    const keyword = contactKeyword.trim().toLowerCase();
    // 获取已分组的联系人 ID
    const groupedIds = getGroupedContactIds();
    
    // 过滤掉已分组的联系人（已分组的只在分组内显示）
    let filtered = contacts.filter((item) => !groupedIds.has(item.id));
    
    if (!keyword) return filtered;
    return filtered.filter((item) => {
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

  // 附近的人菜单
  nearbyMore?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleNearbyMenu();
  });

  nearbyRefresh?.addEventListener("click", () => {
    closeNearbyMenu();
    refreshNearbyList();
  });

  nearbyBlock?.addEventListener("click", () => {
    closeNearbyMenu();
    if (!nearbyList.length) {
      showNearbyHint("暂无可拉黑的对象");
      return;
    }
    enterNearbySelectMode();
  });

  // 点击空白处关闭附近的人菜单
  xinliaoView?.addEventListener("click", (event) => {
    const isMenuClick = event.target.closest("#xinliaoNearbyDropdown");
    if (!isMenuClick) {
      closeNearbyMenu();
    }
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

  const isCharacterImportedWorldbookEntry = (entry, groupsMap) => {
    if (!entry) return false;
    if (entry.sourceType === "character_import") return true;
    if (entry.meta?.sourceType === "character_import") return true;
    const group = entry.groupId ? groupsMap.get(entry.groupId) : null;
    if (group?.sourceType === "character_import") return true;
    if (group?.meta?.sourceType === "character_import") return true;
    return false;
  };

  const cleanupWorldbookOnContactsDelete = (contactIdsToDelete = []) => {
    const idsSet = new Set(contactIdsToDelete);
    if (!idsSet.size) return;

    const deletingContacts = contacts.filter((c) => idsSet.has(c.id));
    if (!deletingContacts.length) return;

    const data = loadWorldbookData();
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const groups = Array.isArray(data.groups) ? data.groups : [];
    const groupsMap = new Map(groups.map((g) => [g.id, g]));

    const importedCandidateIds = new Set();
    deletingContacts.forEach((contact) => {
      const ids = Array.isArray(contact.worldbookIds) ? contact.worldbookIds : [];
      ids.forEach((id) => {
        const entry = entries.find((e) => e.id === id);
        if (isCharacterImportedWorldbookEntry(entry, groupsMap)) {
          importedCandidateIds.add(id);
        }
      });
    });

    if (!importedCandidateIds.size) return;

    const remainingContacts = contacts.filter((c) => !idsSet.has(c.id));
    const referencedByRemaining = new Set();
    remainingContacts.forEach((contact) => {
      const ids = Array.isArray(contact.worldbookIds) ? contact.worldbookIds : [];
      ids.forEach((id) => referencedByRemaining.add(id));
    });

    const removableIds = new Set(
      Array.from(importedCandidateIds).filter((id) => !referencedByRemaining.has(id))
    );
    if (!removableIds.size) return;

    data.entries = entries.filter((e) => !removableIds.has(e.id));
    const aliveGroupIds = new Set(data.entries.map((e) => e.groupId).filter(Boolean));
    data.groups = groups.filter((g) => aliveGroupIds.has(g.id));
    saveWorldbookData(data);
  };

  // 删除选中的联系人
  const deleteSelectedContacts = () => {
    if (selectedContactIds.size === 0) return;

    const idsToDelete = Array.from(selectedContactIds);
    cleanupWorldbookOnContactsDelete(idsToDelete);

    // 从 contacts 数组中移除选中的联系人
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

  // ========== 联系人操作菜单 ==========
  const contactActionPopup = getEl("xinliaoContactActionPopup");
  const contactActionTitle = getEl("xinliaoContactActionTitle");
  const contactActionMove = getEl("xinliaoContactActionMove");
  const contactActionDelete = getEl("xinliaoContactActionDelete");
  const contactActionCancel = getEl("xinliaoContactActionCancel");
  const moveGroupPopup = getEl("xinliaoMoveGroupPopup");
  const moveGroupList = getEl("xinliaoMoveGroupList");
  const moveGroupCancel = getEl("xinliaoMoveGroupCancel");

  // 当前长按的联系人 ID
  let longPressContactId = null;

  /**
   * 打开联系人操作菜单
   */
  const openContactActionPopup = (contactId) => {
    longPressContactId = contactId;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact && contactActionTitle) {
      contactActionTitle.textContent = contact.name || "操作";
    }
    if (contactActionPopup) {
      contactActionPopup.classList.add("active");
    }
  };

  /**
   * 关闭联系人操作菜单
   */
  const closeContactActionPopup = () => {
    if (contactActionPopup) {
      contactActionPopup.classList.remove("active");
    }
    longPressContactId = null;
  };

  /**
   * 删除单个联系人
   */
  const deleteSingleContact = (contactId) => {
    if (!contactId) return;
    
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    
    if (!confirm(`确定要删除联系人"${contact.name}"吗？`)) return;

    cleanupWorldbookOnContactsDelete([contactId]);

    // 从所有分组中移除该联系人
    contactGroups.forEach((group) => {
      const idx = group.contactIds.indexOf(contactId);
      if (idx !== -1) {
        group.contactIds.splice(idx, 1);
      }
    });
    saveGroups(contactGroups);

    // 从联系人列表中移除
    const index = contacts.findIndex((c) => c.id === contactId);
    if (index !== -1) {
      contacts.splice(index, 1);
    }
    saveContacts(contacts);
    
    updateContactsView();
    renderGroupsList();
  };

  /**
   * 查找联系人当前所在的分组
   */
  const findContactCurrentGroup = (contactId) => {
    for (const group of contactGroups) {
      if (group.contactIds.includes(contactId)) {
        return group;
      }
    }
    return null;
  };

  /**
   * 打开移动到分组弹窗
   */
  const openMoveGroupPopup = (contactId) => {
    if (!contactId || !moveGroupList) return;
    
    // 保存当前操作的联系人 ID
    longPressContactId = contactId;

    const currentGroup = findContactCurrentGroup(contactId);

    // 渲染分组列表
    let html = "";

    // 如果当前在某个分组中，显示"移出分组"选项
    if (currentGroup) {
      html += `
        <button class="xinliao-move-group-item remove-from-group" data-group-id="">
          <span class="xinliao-move-group-item-icon">📤</span>
          <span class="xinliao-move-group-item-name">移出当前分组</span>
        </button>
      `;
    }

    // 显示所有分组
    if (contactGroups.length === 0 && !currentGroup) {
      html = `<div class="xinliao-move-group-empty">暂无分组，请先创建分组</div>`;
    } else {
      contactGroups.forEach((group) => {
        const isCurrent = currentGroup && currentGroup.id === group.id;
        html += `
          <button class="xinliao-move-group-item ${isCurrent ? "is-current" : ""}" data-group-id="${group.id}">
            <span class="xinliao-move-group-item-icon">📁</span>
            <span class="xinliao-move-group-item-name">${escapeHtml(group.name)}</span>
            ${isCurrent ? '<span class="xinliao-move-group-item-badge">当前</span>' : ""}
          </button>
        `;
      });
    }

    moveGroupList.innerHTML = html;

    // 关闭操作菜单（不清除 longPressContactId），打开移动分组弹窗
    if (contactActionPopup) {
      contactActionPopup.classList.remove("active");
    }
    if (moveGroupPopup) {
      moveGroupPopup.classList.add("active");
    }
  };

  /**
   * 关闭移动到分组弹窗
   */
  const closeMoveGroupPopup = () => {
    if (moveGroupPopup) {
      moveGroupPopup.classList.remove("active");
    }
  };

  /**
   * 移动联系人到指定分组
   */
  const moveContactToGroup = (targetGroupId) => {
    if (!longPressContactId) return;

    // 先从所有分组中移除该联系人
    contactGroups.forEach((group) => {
      const idx = group.contactIds.indexOf(longPressContactId);
      if (idx !== -1) {
        group.contactIds.splice(idx, 1);
      }
    });

    // 如果目标分组不为空，添加到目标分组
    if (targetGroupId) {
      const targetGroup = contactGroups.find((g) => g.id === targetGroupId);
      if (targetGroup) {
        targetGroup.contactIds.push(longPressContactId);
      }
    }

    saveGroups(contactGroups);
    renderGroupsList();
    closeMoveGroupPopup();
    longPressContactId = null;
  };

  // 操作菜单事件绑定
  contactActionCancel?.addEventListener("click", closeContactActionPopup);
  
  contactActionDelete?.addEventListener("click", () => {
    const contactId = longPressContactId; // 先保存 ID
    closeContactActionPopup();
    deleteSingleContact(contactId);
  });

  contactActionMove?.addEventListener("click", () => {
    const contactId = longPressContactId; // 先保存 ID
    openMoveGroupPopup(contactId);
  });

  // 点击操作菜单背景关闭
  contactActionPopup?.addEventListener("click", (e) => {
    if (e.target === contactActionPopup) {
      closeContactActionPopup();
    }
  });

  // 移动分组弹窗事件
  moveGroupCancel?.addEventListener("click", closeMoveGroupPopup);

  moveGroupPopup?.addEventListener("click", (e) => {
    if (e.target === moveGroupPopup) {
      closeMoveGroupPopup();
    }
  });

  moveGroupList?.addEventListener("click", (e) => {
    const item = e.target.closest(".xinliao-move-group-item");
    if (!item) return;
    
    const groupId = item.dataset.groupId;
    const isBatch = item.dataset.batch === "true";
    
    if (isBatch) {
      // 批量移动
      batchMoveContactsToGroup(groupId);
    } else {
      // 单个移动
      moveContactToGroup(groupId);
    }
  });

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

  // 长按显示操作菜单
  let contactLongPressTimer = null;
  contactsList?.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(".xinliao-contact-item");
    if (!item || isContactSelectMode) return;

    const contactId = item.dataset.id;
    contactLongPressTimer = setTimeout(() => {
      openContactActionPopup(contactId);
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

  // 批量操作栏元素
  const contactsBatchMoveBtn = getEl("xinliaoContactsBatchMoveBtn");

  /**
   * 批量移动联系人到分组
   */
  const openBatchMovePopup = () => {
    if (selectedContactIds.size === 0 || !moveGroupList) return;

    // 渲染分组列表
    let html = "";

    // 显示"移出分组"选项
    html += `
      <button class="xinliao-move-group-item remove-from-group" data-group-id="" data-batch="true">
        <span class="xinliao-move-group-item-icon">📤</span>
        <span class="xinliao-move-group-item-name">移出分组</span>
      </button>
    `;

    // 显示所有分组
    if (contactGroups.length === 0) {
      html += `<div class="xinliao-move-group-empty">暂无分组，请先创建分组</div>`;
    } else {
      contactGroups.forEach((group) => {
        html += `
          <button class="xinliao-move-group-item" data-group-id="${group.id}" data-batch="true">
            <span class="xinliao-move-group-item-icon">📁</span>
            <span class="xinliao-move-group-item-name">${escapeHtml(group.name)}</span>
          </button>
        `;
      });
    }

    moveGroupList.innerHTML = html;

    if (moveGroupPopup) {
      moveGroupPopup.classList.add("active");
    }
  };

  /**
   * 批量移动联系人到指定分组
   */
  const batchMoveContactsToGroup = (targetGroupId) => {
    if (selectedContactIds.size === 0) return;

    const idsToMove = Array.from(selectedContactIds);

    // 先从所有分组中移除这些联系人
    contactGroups.forEach((group) => {
      idsToMove.forEach((id) => {
        const idx = group.contactIds.indexOf(id);
        if (idx !== -1) {
          group.contactIds.splice(idx, 1);
        }
      });
    });

    // 如果目标分组不为空，添加到目标分组
    if (targetGroupId) {
      const targetGroup = contactGroups.find((g) => g.id === targetGroupId);
      if (targetGroup) {
        idsToMove.forEach((id) => {
          if (!targetGroup.contactIds.includes(id)) {
            targetGroup.contactIds.push(id);
          }
        });
      }
    }

    saveGroups(contactGroups);
    renderGroupsList();
    updateContactsView();
    closeMoveGroupPopup();
    exitContactSelectMode();
  };

  // 删除栏按钮事件
  contactsDeleteBtn?.addEventListener("click", deleteSelectedContacts);
  contactsDeleteCancel?.addEventListener("click", exitContactSelectMode);
  contactsBatchMoveBtn?.addEventListener("click", openBatchMovePopup);

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

  // 附近的人列表点击
  nearbyListEl?.addEventListener("click", (event) => {
    const item = event.target.closest(".xinliao-nearby-item");
    if (!item) return;
    const nearbyId = item.dataset.id;
    if (isNearbySelectMode) {
      toggleNearbySelect(nearbyId);
      return;
    }
    const nearbyItem = nearbyList.find((n) => n.id === nearbyId);
    openNearbyChat(nearbyItem);
  });

  nearbyDelete?.addEventListener("click", deleteSelectedNearby);
  nearbyCancel?.addEventListener("click", exitNearbySelectMode);

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

  const handleNearbyBlockInChat = async (chat) => {
    if (!chat) return false;
    const nearbyId = chat?.nearbyContact?.id || chat?.members?.[0];
    if (!nearbyId) return false;

    nearbyList = nearbyList.filter((item) => item.id !== nearbyId);
    saveNearby(nearbyList);
    renderNearbyList();

    const chats = await loadStoredChats();
    const nextChats = chats.filter((item) => item.id !== chat.id);
    await saveChats(nextChats);
    await deleteChatMessages(chat.id);
    messagesModule?.reloadChats();
    return true;
  };

  const handleNearbyAddFriendInChat = async (chat) => {
    if (!chat) return null;
    const nearbyId = chat?.nearbyContact?.id || chat?.members?.[0];
    if (!nearbyId) return null;

    const nearbyItem = nearbyList.find((item) => item.id === nearbyId);
    let persona = "";
    try {
      const prompt = `请为一个新好友生成角色详情。` +
        `输出 JSON 数组，长度为 1，字段：name、persona。` +
        `name 使用“${chat.name}”。` +
        `persona 60-120 字，包含性格、说话风格、兴趣。只输出 JSON。`;
      const result = await requestChatJson({ prompt });
      const profile = Array.isArray(result) ? result[0] : null;
      persona = String(profile?.persona || "").trim();
    } catch (error) {
      console.warn("生成好友详情失败，使用回退人设", error);
    }

    if (!persona) {
      const fallbackLine = nearbyItem?.line || "你好，先认识一下。";
      persona = `来自附近的人，性格外向主动，善于破冰聊天。常用口吻偏直接，喜欢从日常话题切入。开场常说：${fallbackLine}`;
    }

    const contact = normalizeContact({
      id: nearbyId,
      name: chat.name,
      avatar: chat.avatar,
      persona,
    });

    const existingIndex = contacts.findIndex((item) => item.id === contact.id);
    if (existingIndex === -1) {
      contacts.push(contact);
    } else {
      contacts[existingIndex] = {
        ...contacts[existingIndex],
        ...contact,
      };
    }
    saveContacts(contacts);
    updateContactsView();
    renderGroupsList();

    nearbyList = nearbyList.filter((item) => item.id !== nearbyId);
    saveNearby(nearbyList);
    renderNearbyList();

    const chats = await loadStoredChats();
    const updatedChat = {
      ...chat,
      source: "",
      nearbyContact: null,
      type: "single",
      name: contact.name,
      avatar: contact.avatar,
      members: [contact.id],
      lastTime: Date.now(),
    };
    const chatIndex = chats.findIndex((item) => item.id === chat.id);
    const nextChats =
      chatIndex === -1
        ? [updatedChat, ...chats]
        : chats.map((item) => (item.id === chat.id ? updatedChat : item));
    await saveChats(nextChats);
    messagesModule?.reloadChats();
    return updatedChat;
  };

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
    onNearbyBlock: handleNearbyBlockInChat,
    onNearbyAddFriend: handleNearbyAddFriendInChat,
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

  // ========== 联系人分组功能 ==========
  const newGroupBtn = getEl("xinliaoNewGroupBtn");
  const groupsList = getEl("xinliaoGroupsList");
  const groupPopup = getEl("xinliaoGroupPopup");
  const groupNameInput = getEl("xinliaoNewGroupNameInput");
  const groupCancel = getEl("xinliaoNewGroupCancel");
  const groupConfirmBtn = getEl("xinliaoNewGroupConfirm");

  // 加载分组数据
  contactGroups = loadStoredGroups();

  // 展开的联系人分组 ID
  let expandedContactGroupIds = new Set();

  /**
   * 渲染分组列表
   */
  const renderGroupsList = () => {
    if (!groupsList) return;

    if (!contactGroups.length) {
      groupsList.innerHTML = "";
      return;
    }

    groupsList.innerHTML = contactGroups.map((group) => {
      const isExpanded = expandedContactGroupIds.has(group.id);
      const groupContacts = contacts.filter((c) => group.contactIds.includes(c.id));
      const count = groupContacts.length;

      return `
        <div class="xinliao-group-item ${isExpanded ? "is-expanded" : ""}" data-group-id="${group.id}">
          <div class="xinliao-group-header">
            <span class="xinliao-group-arrow">›</span>
            <span class="xinliao-group-name">${escapeHtml(group.name)}</span>
            <span class="xinliao-group-count">(${count})</span>
            <button class="xinliao-group-rename" data-group-id="${group.id}" aria-label="重命名分组">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="xinliao-group-delete" data-group-id="${group.id}" aria-label="删除分组">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
          <div class="xinliao-group-content">
            ${groupContacts.length > 0 
              ? groupContacts.map((contact) => `
                  <button class="xinliao-group-contact" data-contact-id="${contact.id}">
                    <div class="xinliao-avatar">${buildAvatarMarkup(contact.avatar)}</div>
                    <span class="xinliao-group-contact-name">${escapeHtml(contact.name)}</span>
                  </button>
                `).join("")
              : `<div class="xinliao-group-empty">暂无成员</div>`
            }
          </div>
        </div>
      `;
    }).join("");
  };

  /**
   * 切换分组展开状态
   */
  const toggleContactGroupExpand = (groupId) => {
    if (expandedContactGroupIds.has(groupId)) {
      expandedContactGroupIds.delete(groupId);
    } else {
      expandedContactGroupIds.add(groupId);
    }
    renderGroupsList();
  };

  /**
   * 打开新建分组弹窗
   */
  const openGroupPopup = () => {
    if (groupPopup) {
      groupPopup.classList.add("active");
      if (groupNameInput) {
        groupNameInput.value = "";
        groupNameInput.focus();
      }
    }
  };

  /**
   * 关闭新建分组弹窗
   */
  const closeGroupPopup = () => {
    if (groupPopup) {
      groupPopup.classList.remove("active");
    }
  };

  /**
   * 确认创建分组
   */
  const confirmCreateGroup = () => {
    const name = groupNameInput?.value.trim();
    if (!name) {
      groupNameInput?.focus();
      return;
    }

    const newGroup = createContactGroup(name);
    contactGroups.push(newGroup);
    saveGroups(contactGroups);
    renderGroupsList();
    closeGroupPopup();
  };

  /**
   * 删除分组
   */
  const deleteContactGroup = (groupId) => {
    if (!confirm("确定要删除此分组吗？分组内的联系人不会被删除。")) return;

    const index = contactGroups.findIndex((g) => g.id === groupId);
    if (index !== -1) {
      contactGroups.splice(index, 1);
      saveGroups(contactGroups);
      renderGroupsList();
    }
  };

  // 新建分组按钮点击
  newGroupBtn?.addEventListener("click", openGroupPopup);

  // 弹窗取消按钮
  groupCancel?.addEventListener("click", closeGroupPopup);

  // 弹窗确认按钮
  groupConfirmBtn?.addEventListener("click", confirmCreateGroup);

  // 弹窗输入框回车确认
  groupNameInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      confirmCreateGroup();
    }
  });

  // 点击弹窗背景关闭
  groupPopup?.addEventListener("click", (e) => {
    if (e.target === groupPopup) {
      closeGroupPopup();
    }
  });

  /**
   * 重命名分组
   */
  const renameContactGroup = (groupId) => {
    const group = contactGroups.find((g) => g.id === groupId);
    if (!group) return;

    const newName = prompt("请输入新的分组名称：", group.name);
    if (newName === null) return; // 用户取消
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
      alert("分组名称不能为空");
      return;
    }

    group.name = trimmedName;
    saveGroups(contactGroups);
    renderGroupsList();
  };

  // 分组列表点击事件
  groupsList?.addEventListener("click", (e) => {
    // 点击重命名按钮
    const renameBtn = e.target.closest(".xinliao-group-rename");
    if (renameBtn) {
      e.stopPropagation();
      const groupId = renameBtn.dataset.groupId;
      renameContactGroup(groupId);
      return;
    }

    // 点击删除按钮
    const deleteBtn = e.target.closest(".xinliao-group-delete");
    if (deleteBtn) {
      e.stopPropagation();
      const groupId = deleteBtn.dataset.groupId;
      deleteContactGroup(groupId);
      return;
    }

    // 点击分组内的联系人
    const contactBtn = e.target.closest(".xinliao-group-contact");
    if (contactBtn) {
      const contactId = contactBtn.dataset.contactId;
      openDetail(contactId);
      return;
    }

    // 点击分组头部展开/收起
    const header = e.target.closest(".xinliao-group-header");
    if (header) {
      const groupItem = header.closest(".xinliao-group-item");
      const groupId = groupItem?.dataset.groupId;
      if (groupId) {
        toggleContactGroupExpand(groupId);
      }
      return;
    }
  });

  // 初始渲染
  updateContactsView();
  renderGroupsList();
  renderNearbyList();

  bindXinliaoApp();
  setActiveTab(tabs[0]?.id || "messages");
};
