/**
 * 消息模块：数据管理
 * 管理会话列表的存储和读取
 * 使用 IndexedDB 存储以支持更大容量
 */

import {
  initDB,
  saveChatsToIDB,
  loadChatsFromIDB,
} from "../storage/indexedDB.js";

// 数据库初始化状态
let dbReady = false;

/**
 * 确保数据库已初始化
 * @returns {Promise<void>}
 */
const ensureDB = async () => {
  if (!dbReady) {
    await initDB();
    dbReady = true;
  }
};

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
  source: item.source || "",
  nearbyContact: item.nearbyContact || null,
  lastMessage: item.lastMessage || "",
  lastTime: item.lastTime || Date.now(),
  unread: item.unread || 0,
  pinned: item.pinned || false, // 是否置顶
});

/**
 * 切换会话置顶状态
 * @param {Array} chats - 当前会话列表
 * @param {string} chatId - 会话 ID
 * @returns {Promise<Array>} 更新后的会话列表
 */
export const toggleChatPin = async (chats, chatId) => {
  const updatedChats = chats.map((chat) => {
    if (chat.id === chatId) {
      return { ...chat, pinned: !chat.pinned };
    }
    return chat;
  });
  await saveChats(updatedChats);
  return updatedChats;
};

/**
 * 从 IndexedDB 加载会话列表
 * @returns {Promise<Array>} 会话列表
 */
export const loadStoredChats = async () => {
  try {
    await ensureDB();
    const data = await loadChatsFromIDB();
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeChat);
  } catch (error) {
    console.warn("加载会话列表失败:", error);
    return [];
  }
};

/**
 * 保存会话列表到 IndexedDB
 * @param {Array} list - 会话列表
 * @returns {Promise<void>}
 */
export const saveChats = async (list) => {
  try {
    await ensureDB();
    await saveChatsToIDB(list);
  } catch (error) {
    console.warn("保存会话列表失败:", error);
  }
};

/**
 * 添加新会话
 * @param {Array} chats - 当前会话列表
 * @param {Object} chatData - 新会话数据
 * @returns {Promise<Array>} 更新后的会话列表
 */
export const addChat = async (chats, chatData) => {
  const newChat = normalizeChat(chatData);
  const updatedChats = [newChat, ...chats];
  await saveChats(updatedChats);
  return updatedChats;
};

/**
 * 删除会话
 * @param {Array} chats - 当前会话列表
 * @param {string} chatId - 要删除的会话 ID
 * @returns {Promise<Array>} 更新后的会话列表
 */
export const removeChat = async (chats, chatId) => {
  const updatedChats = chats.filter((chat) => chat.id !== chatId);
  await saveChats(updatedChats);
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
