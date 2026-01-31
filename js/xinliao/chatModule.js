/**
 * 聊天模块：渲染和交互逻辑
 * 管理聊天界面的显示、消息发送和 API 调用
 */

import {
  loadChatMessages,
  saveChatMessages,
  addMessage,
  formatMessageTime,
} from "./chatData.js";
import { saveChats, loadStoredChats } from "./messagesData.js";
import { requestChatReply, getActiveProfile } from "./apiClient.js";

// 获取 DOM 元素的辅助函数
const getEl = (id) => document.getElementById(id);

// 检测动态相关关键词的正则表达式
const MOMENT_POST_KEYWORDS = /发(一?条?|个)?动态|发(一?条?|个)?朋友圈|去发动态|去发朋友圈|发条动态|发个动态/i;
const MOMENT_COMMENT_KEYWORDS = /去评论|给我评论|评论(一下)?我的?动态|评论(一下)?我的?朋友圈|去我动态评论|去我朋友圈评论/i;

/**
 * 初始化聊天模块
 * @param {Object} options - 配置选项
 * @param {Function} options.getContacts - 获取联系人列表的函数
 * @param {Function} options.onBack - 返回回调
 * @param {Function} options.onChatUpdate - 会话更新回调
 * @param {Object} options.momentsModule - 动态模块接口
 * @returns {Object} 模块接口
 */
export const initChatModule = (options = {}) => {
  const { getContacts, onBack, onChatUpdate, momentsModule } = options;

  // 当前会话数据
  let currentChat = null;
  let messages = [];
  let isLoading = false;

  // 消息选择模式
  let isSelectMode = false;
  let selectedMsgIndexes = new Set();

  // DOM 元素
  const chatView = getEl("xinliaoChat");
  const chatBack = getEl("xinliaoChatBack");
  const chatName = getEl("xinliaoChatName");
  const chatStatus = getEl("xinliaoChatStatus");
  const chatMessages = getEl("xinliaoChatMessages");
  const chatInput = getEl("xinliaoChatInput");
  const chatSend = getEl("xinliaoChatSend");
  const deleteBar = getEl("xinliaoChatDeleteBar");
  const deleteBtn = getEl("xinliaoChatDeleteBtn");
  const deleteCancelBtn = getEl("xinliaoChatDeleteCancel");
  const deleteCount = getEl("xinliaoChatDeleteCount");

  /**
   * 显示聊天界面
   */
  const showChat = () => {
    chatView?.classList.remove("is-hidden");
  };

  /**
   * 隐藏聊天界面
   */
  const hideChat = () => {
    chatView?.classList.add("is-hidden");
    currentChat = null;
    messages = [];
    exitSelectMode();
  };

  /**
   * 显示加载状态
   * @param {string} name - 正在输入的角色名称
   */
  const showLoading = (name) => {
    isLoading = true;
    if (chatStatus) {
      chatStatus.textContent = `${name} 正在输入中...`;
      chatStatus.classList.remove("is-hidden");
    }
    if (chatSend) {
      chatSend.disabled = true;
      chatSend.classList.add("is-loading");
    }
  };

  /**
   * 隐藏加载状态
   */
  const hideLoading = () => {
    isLoading = false;
    chatStatus?.classList.add("is-hidden");
    if (chatSend) {
      chatSend.disabled = false;
      chatSend.classList.remove("is-loading");
    }
  };

  /**
   * 滚动到底部
   */
  const scrollToBottom = () => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  /**
   * 获取角色信息
   * @param {string} memberId - 成员 ID
   * @returns {Object|null} 角色信息
   */
  const getContact = (memberId) => {
    const contacts = getContacts?.() || [];
    return contacts.find((c) => c.id === memberId) || null;
  };

  /**
   * 更新删除栏显示
   */
  const updateDeleteBar = () => {
    if (!deleteBar) return;
    if (isSelectMode) {
      deleteBar.classList.remove("is-hidden");
      if (deleteCount) {
        deleteCount.textContent = selectedMsgIndexes.size;
      }
      if (deleteBtn) {
        deleteBtn.disabled = selectedMsgIndexes.size === 0;
      }
    } else {
      deleteBar.classList.add("is-hidden");
    }
  };

  /**
   * 进入消息选择模式
   */
  const enterSelectMode = () => {
    isSelectMode = true;
    selectedMsgIndexes.clear();
    updateDeleteBar();
    renderMessages();
  };

  /**
   * 退出消息选择模式
   */
  const exitSelectMode = () => {
    isSelectMode = false;
    selectedMsgIndexes.clear();
    updateDeleteBar();
    renderMessages();
  };

  /**
   * 切换消息选中状态
   * @param {number} index - 消息索引
   */
  const toggleMsgSelect = (index) => {
    if (selectedMsgIndexes.has(index)) {
      selectedMsgIndexes.delete(index);
    } else {
      selectedMsgIndexes.add(index);
    }
    updateDeleteBar();
    renderMessages();
  };

  /**
   * 删除选中的消息
   */
  const deleteSelectedMessages = async () => {
    if (selectedMsgIndexes.size === 0 || !currentChat) return;

    // 过滤掉选中的消息
    const indexesToDelete = Array.from(selectedMsgIndexes).sort((a, b) => b - a);
    for (const index of indexesToDelete) {
      messages.splice(index, 1);
    }

    // 保存更新后的消息
    await saveChatMessages(currentChat.id, messages);

    // 更新会话最后消息
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      await updateChatLastMessage(lastMsg.content);
    } else {
      await updateChatLastMessage("");
    }

    exitSelectMode();
  };

  /**
   * 渲染消息列表
   */
  const renderMessages = () => {
    if (!chatMessages) return;

    // 空状态
    if (!messages.length) {
      chatMessages.innerHTML = `
        <div class="xinliao-chat-empty">
          <div class="xinliao-chat-empty-icon">💬</div>
          <div>开始聊天吧</div>
        </div>
      `;
      return;
    }

    chatMessages.innerHTML = messages
      .map((msg, index) => {
        const isUser = msg.role === "user";
        const roleClass = isUser ? "is-user" : "is-role";
        const selectModeClass = isSelectMode ? "is-select-mode" : "";
        const selectedClass = selectedMsgIndexes.has(index) ? "is-selected" : "";

        return `
          <div class="xinliao-msg ${roleClass} ${selectModeClass} ${selectedClass}" data-msg-index="${index}">
            <span class="xinliao-msg-check"></span>
            <div class="xinliao-msg-bubble">${escapeHtml(msg.content)}</div>
          </div>
        `;
      })
      .join("");

    // 选择模式下不自动滚动到底部
    if (!isSelectMode) {
      scrollToBottom();
    }
  };

  /**
   * HTML 转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  const escapeHtml = (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  /**
   * 更新会话的最后消息
   * @param {string} content - 消息内容
   */
  const updateChatLastMessage = async (content) => {
    if (!currentChat) return;

    const chats = await loadStoredChats();
    const chatIndex = chats.findIndex((c) => c.id === currentChat.id);
    if (chatIndex === -1) return;

    chats[chatIndex].lastMessage = content.slice(0, 50);
    chats[chatIndex].lastTime = Date.now();
    await saveChats(chats);

    // 通知外部更新
    onChatUpdate?.();
  };

  /**
   * 检查 API 是否已配置
   * @returns {boolean} 是否已配置
   */
  const isApiConfigured = () => {
    const profile = getActiveProfile();
    return !!(profile?.url && profile?.key && profile?.model);
  };

  /**
   * 显示错误提示
   * @param {string} message - 错误信息
   */
  const showError = (message) => {
    // 添加一条系统消息显示错误
    const errorDiv = document.createElement("div");
    errorDiv.className = "xinliao-msg is-system";
    errorDiv.innerHTML = `
      <div class="xinliao-msg-system">${escapeHtml(message)}</div>
    `;
    chatMessages?.appendChild(errorDiv);
    scrollToBottom();
  };

  /**
   * 请求角色回复（调用 API）
   * @param {string} userMessage - 用户消息（可选）
   */
  const requestRoleReply = async (userMessage = "") => {
    if (!currentChat || isLoading) return;

    // 检查 API 配置
    if (!isApiConfigured()) {
      showError("⚠️ 请先在设置中配置 API");
      return;
    }

    // 获取要回复的角色
    let replyContact = null;
    if (currentChat.type === "single") {
      replyContact = getContact(currentChat.members[0]);
    } else {
      // 群聊：随机选择一个角色回复（简化逻辑）
      const randomIndex = Math.floor(Math.random() * currentChat.members.length);
      replyContact = getContact(currentChat.members[randomIndex]);
    }

    if (!replyContact) {
      console.warn("未找到回复角色");
      showError("⚠️ 未找到回复角色");
      return;
    }

    showLoading(replyContact.name);

    try {
      // 调用 API 获取回复（返回多条消息数组）
      const replyMessages = await requestChatReply({
        contact: replyContact,
        chatHistory: messages,
        userMessage: userMessage,
      });

      // 逐条添加角色回复（带延迟效果）
      let lastContent = "";
      for (let i = 0; i < replyMessages.length; i++) {
        const content = replyMessages[i];
        if (!content) continue;

        // 添加消息
        messages = await addMessage(currentChat.id, {
          role: "assistant",
          content: content,
          senderId: replyContact.id,
        });

        lastContent = content;
        renderMessages();

        // 如果不是最后一条，添加短暂延迟
        if (i < replyMessages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        }
      }

      // 更新会话最后消息
      if (lastContent) {
        await updateChatLastMessage(lastContent);
      }
    } catch (error) {
      console.error("获取回复失败:", error);
      showError(`⚠️ ${error.message || "获取回复失败"}`);
    } finally {
      hideLoading();
    }
  };

  /**
   * 打开聊天
   * @param {Object} chat - 会话数据
   */
  const openChat = async (chat) => {
    if (!chat) return;

    currentChat = chat;
    messages = await loadChatMessages(chat.id);

    // 更新标题
    if (chatName) {
      chatName.textContent = chat.name;
    }

    exitSelectMode();
    renderMessages();
    showChat();

    // 聚焦输入框
    setTimeout(() => chatInput?.focus(), 100);
  };

  /**
   * 检测消息中的动态相关关键词并触发相应动作
   * @param {string} content - 消息内容
   * @param {Object} contact - 当前聊天的角色
   */
  const checkMomentKeywords = (content, contact) => {
    if (!momentsModule || !contact) {
      console.log("momentsModule 或 contact 不存在", { momentsModule: !!momentsModule, contact: !!contact });
      return;
    }

    // 检测发动态关键词
    if (MOMENT_POST_KEYWORDS.test(content)) {
      console.log("检测到发动态关键词，触发角色发动态", contact.name);
      // 延迟执行，让聊天消息先显示
      setTimeout(() => {
        console.log("开始执行角色发动态...");
        momentsModule.publishContactMoment(contact).then(() => {
          console.log("角色发动态完成");
        }).catch((err) => {
          console.error("角色发动态失败:", err);
        });
      }, 2000 + Math.random() * 3000);
      return;
    }

    // 检测评论关键词
    if (MOMENT_COMMENT_KEYWORDS.test(content)) {
      console.log("检测到评论关键词，触发角色评论动态", contact.name);
      // 延迟执行，让聊天消息先显示
      setTimeout(() => {
        console.log("开始执行角色评论动态...");
        momentsModule.contactCommentOnMoment(contact).then(() => {
          console.log("角色评论动态完成");
        }).catch((err) => {
          console.error("角色评论动态失败:", err);
        });
      }, 2000 + Math.random() * 3000);
      return;
    }
  };

  /**
   * 发送用户消息
   * @param {string} content - 消息内容
   */
  const sendUserMessage = async (content) => {
    if (!currentChat || !content.trim()) return;

    const trimmedContent = content.trim();

    // 添加用户消息
    messages = await addMessage(currentChat.id, {
      role: "user",
      content: trimmedContent,
    });

    renderMessages();
    await updateChatLastMessage(trimmedContent);

    // 清空输入框
    if (chatInput) {
      chatInput.value = "";
      chatInput.style.height = "auto";
    }

    // 检测动态相关关键词（单聊时）
    if (currentChat.type === "single") {
      const contact = getContact(currentChat.members[0]);
      if (contact) {
        checkMomentKeywords(trimmedContent, contact);
      }
    }

    // 只发送消息，不自动调用 API 获取回复
  };

  /**
   * 处理发送按钮点击
   */
  const handleSend = async () => {
    if (isLoading) return;

    const content = chatInput?.value || "";

    if (content.trim()) {
      // 有内容：发送消息
      await sendUserMessage(content);
    } else {
      // 无内容：让角色主动回复
      await requestRoleReply();
    }
  };

  /**
   * 处理输入框自动高度
   */
  const handleInputResize = () => {
    if (!chatInput) return;
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 96) + "px";
  };

  /**
   * 处理回车发送
   * @param {KeyboardEvent} event - 键盘事件
   */
  const handleKeydown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // 绑定事件 - 返回按钮
  chatBack?.addEventListener("click", () => {
    if (isSelectMode) {
      exitSelectMode();
    } else {
      hideChat();
      onBack?.();
    }
  });

  chatSend?.addEventListener("click", handleSend);
  chatInput?.addEventListener("input", handleInputResize);
  chatInput?.addEventListener("keydown", handleKeydown);

  // 绑定事件 - 消息点击
  chatMessages?.addEventListener("click", (event) => {
    const msgEl = event.target.closest(".xinliao-msg");
    if (!msgEl || msgEl.classList.contains("is-system")) return;

    const index = parseInt(msgEl.dataset.msgIndex, 10);
    if (isNaN(index)) return;

    if (isSelectMode) {
      toggleMsgSelect(index);
    }
  });

  // 长按进入选择模式
  let longPressTimer = null;
  chatMessages?.addEventListener("pointerdown", (event) => {
    const msgEl = event.target.closest(".xinliao-msg");
    if (!msgEl || msgEl.classList.contains("is-system") || isSelectMode) return;

    const index = parseInt(msgEl.dataset.msgIndex, 10);
    if (isNaN(index)) return;

    longPressTimer = setTimeout(() => {
      enterSelectMode();
      toggleMsgSelect(index);
    }, 500);
  });

  chatMessages?.addEventListener("pointerup", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  chatMessages?.addEventListener("pointerleave", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  // 删除栏按钮事件
  deleteBtn?.addEventListener("click", deleteSelectedMessages);
  deleteCancelBtn?.addEventListener("click", exitSelectMode);

  // 返回模块接口
  return {
    openChat,
    hideChat,
    showChat,
  };
};
