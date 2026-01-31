/**
 * 聊天数据管理模块
 * 管理聊天记录的存储和读取
 * 使用 IndexedDB 存储以支持更大容量
 */

import {
  initDB,
  saveChatMessagesToIDB,
  loadChatMessagesFromIDB,
  deleteChatMessagesFromIDB,
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
 * 生成消息 ID
 * @returns {string} 唯一标识符
 */
export const generateMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * 标准化消息数据
 * @param {Object} msg - 原始消息数据
 * @returns {Object} 标准化后的消息数据
 */
export const normalizeMessage = (msg = {}) => ({
  id: msg.id || generateMessageId(),
  role: msg.role || "user", // user 或 assistant 或角色 ID
  content: msg.content || "",
  timestamp: msg.timestamp || Date.now(),
  senderId: msg.senderId || null, // 发送者 ID（群聊时用于区分角色）
});

/**
 * 加载聊天记录
 * @param {string} chatId - 会话 ID
 * @returns {Promise<Array>} 消息列表
 */
export const loadChatMessages = async (chatId) => {
  if (!chatId) return [];
  try {
    await ensureDB();
    const data = await loadChatMessagesFromIDB(chatId);
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeMessage);
  } catch (error) {
    console.warn("加载聊天记录失败:", error);
    return [];
  }
};

/**
 * 保存聊天记录
 * @param {string} chatId - 会话 ID
 * @param {Array} messages - 消息列表
 * @returns {Promise<void>}
 */
export const saveChatMessages = async (chatId, messages) => {
  if (!chatId) return;
  try {
    await ensureDB();
    await saveChatMessagesToIDB(chatId, messages);
  } catch (error) {
    console.warn("保存聊天记录失败:", error);
  }
};

/**
 * 添加消息到聊天记录
 * @param {string} chatId - 会话 ID
 * @param {Object} msgData - 消息数据
 * @returns {Promise<Array>} 更新后的消息列表
 */
export const addMessage = async (chatId, msgData) => {
  const messages = await loadChatMessages(chatId);
  const newMessage = normalizeMessage(msgData);
  messages.push(newMessage);
  await saveChatMessages(chatId, messages);
  return messages;
};

/**
 * 删除聊天记录
 * @param {string} chatId - 会话 ID
 * @returns {Promise<void>}
 */
export const deleteChatMessages = async (chatId) => {
  if (!chatId) return;
  try {
    await ensureDB();
    await deleteChatMessagesFromIDB(chatId);
  } catch (error) {
    console.warn("删除聊天记录失败:", error);
  }
};

/**
 * 格式化消息时间
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
