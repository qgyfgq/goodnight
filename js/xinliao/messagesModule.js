/**
 * 消息模块：渲染和交互逻辑
 * 管理会话列表的显示和新建会话功能
 */

import {
  loadStoredChats,
  saveChats,
  addChat,
  formatTime,
  generateId,
} from "./messagesData.js";

// 获取 DOM 元素的辅助函数
const getEl = (id) => document.getElementById(id);

/**
 * 构建头像 HTML
 * @param {string} avatar - 头像内容（URL 或 emoji）
 * @returns {string} 头像 HTML
 */
const buildAvatarMarkup = (avatar) => {
  if (!avatar) return `<span class="xinliao-avatar-text">💬</span>`;
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

/**
 * 构建群聊头像 HTML（显示多个小头像）
 * @param {Array} members - 成员列表
 * @param {Array} contacts - 联系人列表
 * @returns {string} 群聊头像 HTML
 */
const buildGroupAvatarMarkup = (members, contacts) => {
  const displayMembers = members.slice(0, 4);
  const avatars = displayMembers.map((memberId) => {
    const contact = contacts.find((c) => c.id === memberId);
    return contact?.avatar || "👤";
  });

  if (avatars.length <= 1) {
    return buildAvatarMarkup(avatars[0] || "👥");
  }

  const avatarItems = avatars
    .map((avatar) => {
      const content = buildAvatarMarkup(avatar);
      return `<div class="xinliao-group-avatar-item">${content}</div>`;
    })
    .join("");

  return `<div class="xinliao-group-avatar-grid count-${avatars.length}">${avatarItems}</div>`;
};

/**
 * 构建单个会话项 HTML
 * @param {Object} chat - 会话数据
 * @param {Array} contacts - 联系人列表
 * @param {boolean} selectMode - 是否为选择模式
 * @param {Set} selectedIds - 已选中的会话 ID 集合
 * @returns {string} 会话项 HTML
 */
const buildChatItemMarkup = (chat, contacts, selectMode, selectedIds) => {
  const isGroup = chat.type === "group";
  
  // 单聊时从联系人列表获取最新头像
  let avatarHtml;
  if (isGroup) {
    avatarHtml = buildGroupAvatarMarkup(chat.members, contacts);
  } else {
    // 单聊：从联系人列表中获取最新头像
    const contactId = chat.members?.[0];
    const contact = contactId ? contacts.find((c) => c.id === contactId) : null;
    const currentAvatar = contact?.avatar || chat.avatar;
    avatarHtml = buildAvatarMarkup(currentAvatar);
  }

  const timeStr = formatTime(chat.lastTime);
  const preview = chat.lastMessage || "暂无消息";
  const isSelected = selectedIds.has(chat.id);
  const selectModeClass = selectMode ? "is-select-mode" : "";
  const selectedClass = isSelected ? "is-selected" : "";
  const pinnedClass = chat.pinned ? "is-pinned" : "";

  return `
    <div class="xinliao-chat-item ${selectModeClass} ${selectedClass} ${pinnedClass}" data-chat-id="${chat.id}">
      <span class="xinliao-chat-check"></span>
      <div class="xinliao-chat-avatar ${isGroup ? "is-group" : ""}">
        ${avatarHtml}
      </div>
      <div class="xinliao-chat-content">
        <div class="xinliao-chat-header">
          <span class="xinliao-chat-name">${chat.name}</span>
          <span class="xinliao-chat-time">${timeStr}</span>
        </div>
        <div class="xinliao-chat-preview">${preview}</div>
      </div>
      ${!selectMode && chat.unread > 0 ? `<span class="xinliao-badge">${chat.unread}</span>` : ""}
    </div>
  `;
};

/**
 * 排序会话列表（置顶优先，然后按时间）
 * @param {Array} chats - 会话列表
 * @returns {Array} 排序后的会话列表
 */
const sortChats = (chats) => {
  return [...chats].sort((a, b) => {
    // 置顶优先
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // 然后按时间排序
    return b.lastTime - a.lastTime;
  });
};

/**
 * 渲染会话列表
 * @param {HTMLElement} container - 容器元素
 * @param {Array} chats - 会话列表
 * @param {Array} contacts - 联系人列表
 * @param {boolean} selectMode - 是否为选择模式
 * @param {Set} selectedIds - 已选中的会话 ID 集合
 */
export const renderChatList = (container, chats, contacts, selectMode = false, selectedIds = new Set()) => {
  if (!container) return;

  // 空状态
  if (!chats.length) {
    container.innerHTML = `
      <div class="xinliao-empty-state">
        <div class="xinliao-empty-icon">💬</div>
        <div class="xinliao-empty-text">暂无会话</div>
        <div class="xinliao-empty-hint">点击右上角 ＋ 开始新的聊天</div>
      </div>
    `;
    return;
  }

  // 分离单聊和群聊
  const singleChats = chats.filter((chat) => chat.type === "single");
  const groupChats = chats.filter((chat) => chat.type === "group");

  // 分别排序
  const sortedSingleChats = sortChats(singleChats);
  const sortedGroupChats = sortChats(groupChats);

  let html = "";

  // 单聊区域
  if (sortedSingleChats.length > 0) {
    html += `<div class="xinliao-chat-section">`;
    html += `<div class="xinliao-chat-section-title"><span class="xinliao-section-icon">○</span>单聊</div>`;
    html += sortedSingleChats
      .map((chat) => buildChatItemMarkup(chat, contacts, selectMode, selectedIds))
      .join("");
    html += `</div>`;
  }

  // 群聊区域
  if (sortedGroupChats.length > 0) {
    html += `<div class="xinliao-chat-section">`;
    html += `<div class="xinliao-chat-section-title"><span class="xinliao-section-icon">◎</span>群聊</div>`;
    html += sortedGroupChats
      .map((chat) => buildChatItemMarkup(chat, contacts, selectMode, selectedIds))
      .join("");
    html += `</div>`;
  }

  container.innerHTML = html;
};

/**
 * 渲染联系人选择列表（用于新建会话）
 * @param {HTMLElement} container - 容器元素
 * @param {Array} contacts - 联系人列表
 * @param {Set} selectedIds - 已选中的联系人 ID 集合
 * @param {boolean} multiSelect - 是否多选模式
 */
export const renderContactSelect = (
  container,
  contacts,
  selectedIds,
  multiSelect
) => {
  if (!container) return;

  if (!contacts.length) {
    container.innerHTML = `
      <div class="xinliao-empty">请先在联系人中添加角色</div>
    `;
    return;
  }

  container.innerHTML = contacts
    .map((contact) => {
      const isSelected = selectedIds.has(contact.id);
      const selectedClass = isSelected ? "is-selected" : "";
      const checkIcon = multiSelect
        ? `<span class="xinliao-select-check">${isSelected ? "✓" : ""}</span>`
        : "";

      return `
        <button class="xinliao-select-item ${selectedClass}" 
                type="button" 
                data-contact-id="${contact.id}">
          <div class="xinliao-avatar">${buildAvatarMarkup(contact.avatar)}</div>
          <span class="xinliao-select-name">${contact.name}</span>
          ${checkIcon}
        </button>
      `;
    })
    .join("");
};

/**
 * 初始化消息模块
 * @param {Object} options - 配置选项
 * @param {Function} options.getContacts - 获取联系人列表的函数
 * @param {Function} options.onChatClick - 点击会话回调
 * @returns {Object} 模块接口
 */
export const initMessagesModule = (options = {}) => {
  const { getContacts, onChatClick } = options;
  // 会话列表
  let chats = loadStoredChats();

  // 选中的联系人 ID（用于新建会话）
  let selectedContactIds = new Set();

  // 选中的会话 ID（用于删除）
  let selectedChatIds = new Set();

  // 是否为选择删除模式
  let isSelectMode = false;

  // 当前模式：single 或 group
  let createMode = "single";

  // DOM 元素
  const messagesList = getEl("xinliaoMessagesList");
  const messagesAdd = getEl("xinliaoMessagesAdd");
  const messageActions = getEl("xinliaoMessageActions");
  const createSingleBtn = getEl("xinliaoCreateSingle");
  const createGroupBtn = getEl("xinliaoCreateGroup");
  const selectList = getEl("xinliaoMessageSelectList");
  const groupNameInput = getEl("xinliaoGroupName");
  const groupConfirmBtn = getEl("xinliaoGroupConfirm");
  const cancelBtn = getEl("xinliaoMessageCancel");
  const messageHint = getEl("xinliaoMessageHint");
  const deleteBar = getEl("xinliaoDeleteBar");
  const deleteBtn = getEl("xinliaoDeleteBtn");
  const deleteCancelBtn = getEl("xinliaoDeleteCancel");
  const deleteCount = getEl("xinliaoDeleteCount");

  /**
   * 显示提示信息
   * @param {string} message - 提示内容
   */
  const showHint = (message) => {
    if (!messageHint) return;
    messageHint.textContent = message;
    messageHint.classList.remove("is-hidden");
  };

  /**
   * 隐藏提示信息
   */
  const hideHint = () => {
    if (!messageHint) return;
    messageHint.classList.add("is-hidden");
    messageHint.textContent = "";
  };

  /**
   * 更新会话列表显示
   */
  const updateChatList = () => {
    renderChatList(messagesList, chats, getContacts(), isSelectMode, selectedChatIds);
    updateDeleteBar();
  };

  /**
   * 更新删除栏显示
   */
  const updateDeleteBar = () => {
    if (!deleteBar) return;
    if (isSelectMode) {
      deleteBar.classList.remove("is-hidden");
      if (deleteCount) {
        deleteCount.textContent = selectedChatIds.size;
      }
      if (deleteBtn) {
        deleteBtn.disabled = selectedChatIds.size === 0;
      }
    } else {
      deleteBar.classList.add("is-hidden");
    }
  };

  /**
   * 进入选择删除模式
   */
  const enterSelectMode = () => {
    isSelectMode = true;
    selectedChatIds.clear();
    messagesAdd?.classList.add("is-hidden");
    updateChatList();
  };

  /**
   * 退出选择删除模式
   */
  const exitSelectMode = () => {
    isSelectMode = false;
    selectedChatIds.clear();
    messagesAdd?.classList.remove("is-hidden");
    updateChatList();
  };

  /**
   * 切换会话选中状态
   * @param {string} chatId - 会话 ID
   */
  const toggleChatSelect = (chatId) => {
    if (selectedChatIds.has(chatId)) {
      selectedChatIds.delete(chatId);
    } else {
      selectedChatIds.add(chatId);
    }
    updateChatList();
  };

  /**
   * 删除选中的会话
   */
  const deleteSelectedChats = () => {
    if (selectedChatIds.size === 0) return;

    // 过滤掉选中的会话
    chats = chats.filter((chat) => !selectedChatIds.has(chat.id));
    saveChats(chats);

    // 同时删除对应的聊天记录
    selectedChatIds.forEach((chatId) => {
      localStorage.removeItem(`xinliaoChatMessages_${chatId}`);
    });

    exitSelectMode();
  };

  /**
   * 更新联系人选择列表
   */
  const updateSelectList = () => {
    const multiSelect = createMode === "group";
    renderContactSelect(selectList, getContacts(), selectedContactIds, multiSelect);
  };

  /**
   * 切换操作面板显示
   */
  const toggleActions = () => {
    if (!messageActions) return;
    const isHidden = messageActions.classList.contains("is-hidden");
    if (isHidden) {
      messageActions.classList.remove("is-hidden");
      updateSelectList();
    } else {
      messageActions.classList.add("is-hidden");
      resetCreateState();
    }
  };

  /**
   * 重置创建状态
   */
  const resetCreateState = () => {
    selectedContactIds.clear();
    createMode = "single";
    if (groupNameInput) groupNameInput.value = "";
    hideHint();
    updateModeUI();
    updateSelectList();
  };

  /**
   * 更新模式 UI
   */
  const updateModeUI = () => {
    const isSingle = createMode === "single";
    createSingleBtn?.classList.toggle("active", isSingle);
    createGroupBtn?.classList.toggle("active", !isSingle);

    // 群聊名称输入框只在群聊模式显示
    const groupNameField = groupNameInput?.closest(".xinliao-field");
    if (groupNameField) {
      groupNameField.classList.toggle("is-hidden", isSingle);
    }

    // 群聊确认按钮只在群聊模式显示
    groupConfirmBtn?.classList.toggle("is-hidden", isSingle);
  };

  /**
   * 设置创建模式
   * @param {string} mode - 模式：single 或 group
   */
  const setCreateMode = (mode) => {
    createMode = mode;
    selectedContactIds.clear();
    hideHint();
    updateModeUI();
    updateSelectList();
  };

  /**
   * 处理联系人选择
   * @param {string} contactId - 联系人 ID
   */
  const handleContactSelect = (contactId) => {
    if (createMode === "single") {
      // 单聊模式：直接创建会话
      createSingleChat(contactId);
    } else {
      // 群聊模式：切换选中状态
      if (selectedContactIds.has(contactId)) {
        selectedContactIds.delete(contactId);
      } else {
        selectedContactIds.add(contactId);
      }
      updateSelectList();
    }
  };

  /**
   * 创建单聊会话
   * @param {string} contactId - 联系人 ID
   */
  const createSingleChat = (contactId) => {
    const contacts = getContacts();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) {
      showHint("未找到该联系人");
      return;
    }

    // 检查是否已存在该联系人的单聊
    const existingChat = chats.find(
      (chat) =>
        chat.type === "single" &&
        chat.members.length === 1 &&
        chat.members[0] === contactId
    );

    if (existingChat) {
      showHint("已存在与该角色的会话");
      return;
    }

    // 创建新会话
    const newChat = {
      type: "single",
      name: contact.name,
      avatar: contact.avatar,
      members: [contactId],
      lastMessage: "",
      lastTime: Date.now(),
    };

    chats = addChat(chats, newChat);
    updateChatList();
    toggleActions();
  };

  /**
   * 创建群聊会话
   */
  const createGroupChat = () => {
    if (selectedContactIds.size < 2) {
      showHint("请至少选择 2 位角色");
      return;
    }

    const groupName = groupNameInput?.value.trim();
    if (!groupName) {
      showHint("请输入群聊名称");
      return;
    }

    const contacts = getContacts();
    const memberIds = Array.from(selectedContactIds);

    // 创建新群聊
    const newChat = {
      type: "group",
      name: groupName,
      avatar: "👥",
      members: memberIds,
      lastMessage: "",
      lastTime: Date.now(),
    };

    chats = addChat(chats, newChat);
    updateChatList();
    toggleActions();
  };

  /**
   * 处理会话点击
   * @param {string} chatId - 会话 ID
   */
  const handleChatClick = (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat && onChatClick) {
      onChatClick(chat);
    }
  };

  // 绑定事件 - 会话列表点击
  messagesList?.addEventListener("click", (event) => {
    const item = event.target.closest(".xinliao-chat-item");
    if (!item) return;

    if (isSelectMode) {
      // 选择模式：切换选中状态
      toggleChatSelect(item.dataset.chatId);
    } else {
      // 正常模式：进入聊天
      handleChatClick(item.dataset.chatId);
    }
  });

  // 长按进入选择模式
  let longPressTimer = null;
  messagesList?.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(".xinliao-chat-item");
    if (!item || isSelectMode) return;

    longPressTimer = setTimeout(() => {
      enterSelectMode();
      toggleChatSelect(item.dataset.chatId);
    }, 500);
  });

  messagesList?.addEventListener("pointerup", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  messagesList?.addEventListener("pointerleave", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  // 删除栏按钮事件
  deleteBtn?.addEventListener("click", deleteSelectedChats);
  deleteCancelBtn?.addEventListener("click", exitSelectMode);

  messagesAdd?.addEventListener("click", toggleActions);
  cancelBtn?.addEventListener("click", toggleActions);

  createSingleBtn?.addEventListener("click", () => setCreateMode("single"));
  createGroupBtn?.addEventListener("click", () => setCreateMode("group"));

  selectList?.addEventListener("click", (event) => {
    const item = event.target.closest(".xinliao-select-item");
    if (!item) return;
    handleContactSelect(item.dataset.contactId);
  });

  // 群聊确认按钮
  groupConfirmBtn?.addEventListener("click", createGroupChat);

  // 初始化
  updateModeUI();
  updateChatList();

  // 返回模块接口
  return {
    updateChatList,
    getChats: () => chats,
    reloadChats: () => {
      chats = loadStoredChats();
      updateChatList();
    },
  };
};
