/**
 * Chat data storage helpers (IndexedDB-backed).
 */

import {
  initDB,
  saveChatMessagesToIDB,
  loadChatMessagesFromIDB,
  deleteChatMessagesFromIDB,
} from "../storage/indexedDB.js";

let dbReady = false;

const ensureDB = async () => {
  if (!dbReady) {
    await initDB();
    dbReady = true;
  }
};

export const generateMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const normalizeMessage = (msg = {}) => ({
  id: msg.id || generateMessageId(),
  role: msg.role || "user",
  content: msg.content || "",
  timestamp: msg.timestamp || Date.now(),
  senderId: msg.senderId || null,
  replyToId: msg.replyToId || null,
  replyToContent: msg.replyToContent || "",
});

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

export const saveChatMessages = async (chatId, messages) => {
  if (!chatId) return;
  try {
    await ensureDB();
    await saveChatMessagesToIDB(chatId, messages);
  } catch (error) {
    console.warn("保存聊天记录失败:", error);
  }
};

export const addMessage = async (chatId, msgData) => {
  const messages = await loadChatMessages(chatId);
  const newMessage = normalizeMessage(msgData);
  messages.push(newMessage);
  await saveChatMessages(chatId, messages);
  return messages;
};

export const deleteChatMessages = async (chatId) => {
  if (!chatId) return;
  try {
    await ensureDB();
    await deleteChatMessagesFromIDB(chatId);
  } catch (error) {
    console.warn("删除聊天记录失败:", error);
  }
};

export const formatMessageTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
