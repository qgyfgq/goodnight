/**
 * 消息模块：数据管理
 * 管理会话列表的存储和读取
 */

// 本地存储键名
const CHATS_STORAGE_KEY = "xinliaoChats";

/**
 * 生成唯一 ID
 * @returns {string} 唯一标识符
 */
export const generateId = () => {
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * 标准化会话数据
 * @param {Object} item - 原始会话数据
 * @returns {Object} 标准化后的会话数据
 */
export const normalizeChat = (item = {}) => ({
  id: item.id || generateId(),
  type: item.type || "single", // single 或 group
  name: item.name || "未命名会话",
  avatar: item.avatar || "💬",
  members: item.members || [], // 成员 ID 列表
  lastMessage: item.lastMessage || "",
  lastTime: item.lastTime || Date.now(),
  unread: item.unread || 0,
  pinned: item.pinned || false, // 是否置顶
});

/**
 * 切换会话置顶状态
 * @param {Array} chats - 当前会话列表
 * @param {string} chatId - 会话 ID
 * @returns {Array} 更新后的会话列表
 */
export const toggleChatPin = (chats, chatId) => {
  const updatedChats = chats.map((chat) => {
    if (chat.id === chatId) {
      return { ...chat, pinned: !chat.pinned };
    }
    return chat;
  });
  saveChats(updatedChats);
  return updatedChats;
};

/**
 * 从本地存储加载会话列表
 * @returns {Array} 会话列表
 */
export const loadStoredChats = () => {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    return list.map(normalizeChat);
  } catch (error) {
    console.warn("加载会话列表失败:", error);
    return [];
  }
};

/**
 * 保存会话列表到本地存储
 * @param {Array} list - 会话列表
 */
export const saveChats = (list) => {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("保存会话列表失败:", error);
  }
};

/**
 * 添加新会话
 * @param {Array} chats - 当前会话列表
 * @param {Object} chatData - 新会话数据
 * @returns {Array} 更新后的会话列表
 */
export const addChat = (chats, chatData) => {
  const newChat = normalizeChat(chatData);
  const updatedChats = [newChat, ...chats];
  saveChats(updatedChats);
  return updatedChats;
};

/**
 * 删除会话
 * @param {Array} chats - 当前会话列表
 * @param {string} chatId - 要删除的会话 ID
 * @returns {Array} 更新后的会话列表
 */
export const removeChat = (chats, chatId) => {
  const updatedChats = chats.filter((chat) => chat.id !== chatId);
  saveChats(updatedChats);
  return updatedChats;
};

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;

  // 今天：显示时间
  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 昨天
  const yesterday = new Date(now - oneDay);
  if (date.getDate() === yesterday.getDate()) {
    return "昨天";
  }

  // 一周内：显示星期
  if (diff < 7 * oneDay) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  }

  // 更早：显示日期
  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
};
