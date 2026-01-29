/**
 * 聊天数据管理模块
 * 管理聊天记录的存储和读取
 */

// 本地存储键名前缀
const CHAT_MESSAGES_PREFIX = "xinliaoChatMessages_";

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
 * 获取聊天记录存储键名
 * @param {string} chatId - 会话 ID
 * @returns {string} 存储键名
 */
const getStorageKey = (chatId) => `${CHAT_MESSAGES_PREFIX}${chatId}`;

/**
 * 加载聊天记录
 * @param {string} chatId - 会话 ID
 * @returns {Array} 消息列表
 */
export const loadChatMessages = (chatId) => {
  if (!chatId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(chatId));
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
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
 */
export const saveChatMessages = (chatId, messages) => {
  if (!chatId) return;
  try {
    localStorage.setItem(getStorageKey(chatId), JSON.stringify(messages));
  } catch (error) {
    console.warn("保存聊天记录失败:", error);
  }
};

/**
 * 添加消息到聊天记录
 * @param {string} chatId - 会话 ID
 * @param {Object} msgData - 消息数据
 * @returns {Array} 更新后的消息列表
 */
export const addMessage = (chatId, msgData) => {
  const messages = loadChatMessages(chatId);
  const newMessage = normalizeMessage(msgData);
  messages.push(newMessage);
  saveChatMessages(chatId, messages);
  return messages;
};

/**
 * 删除聊天记录
 * @param {string} chatId - 会话 ID
 */
export const deleteChatMessages = (chatId) => {
  if (!chatId) return;
  try {
    localStorage.removeItem(getStorageKey(chatId));
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
