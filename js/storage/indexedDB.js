/**
 * IndexedDB 存储模块
 * 提供比 localStorage 更大的存储容量
 */

const DB_NAME = 'goodnightDB';
const DB_VERSION = 1;

// 存储对象名称
const STORES = {
  chats: 'chats',
  chatMessages: 'chatMessages',
  contacts: 'contacts',
  moments: 'moments',
  worldbook: 'worldbook',
  settings: 'settings',
};

let db = null;

/**
 * 初始化数据库
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB 打开失败:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB 初始化成功');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // 创建会话列表存储
      if (!database.objectStoreNames.contains(STORES.chats)) {
        database.createObjectStore(STORES.chats, { keyPath: 'id' });
      }

      // 创建聊天消息存储
      if (!database.objectStoreNames.contains(STORES.chatMessages)) {
        const chatMessagesStore = database.createObjectStore(STORES.chatMessages, { keyPath: 'chatId' });
        chatMessagesStore.createIndex('chatId', 'chatId', { unique: true });
      }

      // 创建联系人存储
      if (!database.objectStoreNames.contains(STORES.contacts)) {
        database.createObjectStore(STORES.contacts, { keyPath: 'id' });
      }

      // 创建动态存储
      if (!database.objectStoreNames.contains(STORES.moments)) {
        database.createObjectStore(STORES.moments, { keyPath: 'id' });
      }

      // 创建世界书存储
      if (!database.objectStoreNames.contains(STORES.worldbook)) {
        database.createObjectStore(STORES.worldbook, { keyPath: 'key' });
      }

      // 创建设置存储
      if (!database.objectStoreNames.contains(STORES.settings)) {
        database.createObjectStore(STORES.settings, { keyPath: 'key' });
      }

      console.log('IndexedDB 数据库结构已创建');
    };
  });
};

/**
 * 获取数据库实例
 * @returns {Promise<IDBDatabase>}
 */
const getDB = async () => {
  if (!db) {
    await initDB();
  }
  return db;
};

/**
 * 通用存储操作 - 保存单个对象
 * @param {string} storeName - 存储名称
 * @param {Object} data - 要保存的数据
 * @returns {Promise<void>}
 */
export const saveItem = async (storeName, data) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error(`保存到 ${storeName} 失败:`, request.error);
      reject(request.error);
    };
  });
};

/**
 * 通用存储操作 - 获取单个对象
 * @param {string} storeName - 存储名称
 * @param {string} key - 键
 * @returns {Promise<Object|null>}
 */
export const getItem = async (storeName, key) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => {
      console.error(`从 ${storeName} 获取失败:`, request.error);
      reject(request.error);
    };
  });
};

/**
 * 通用存储操作 - 获取所有对象
 * @param {string} storeName - 存储名称
 * @returns {Promise<Array>}
 */
export const getAllItems = async (storeName) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => {
      console.error(`从 ${storeName} 获取所有数据失败:`, request.error);
      reject(request.error);
    };
  });
};

/**
 * 通用存储操作 - 删除单个对象
 * @param {string} storeName - 存储名称
 * @param {string} key - 键
 * @returns {Promise<void>}
 */
export const deleteItem = async (storeName, key) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error(`从 ${storeName} 删除失败:`, request.error);
      reject(request.error);
    };
  });
};

/**
 * 通用存储操作 - 清空存储
 * @param {string} storeName - 存储名称
 * @returns {Promise<void>}
 */
export const clearStore = async (storeName) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error(`清空 ${storeName} 失败:`, request.error);
      reject(request.error);
    };
  });
};

// ========== 会话列表专用方法 ==========

/**
 * 保存会话列表
 * @param {Array} chats - 会话列表
 * @returns {Promise<void>}
 */
export const saveChatsToIDB = async (chats) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.chats], 'readwrite');
    const store = transaction.objectStore(STORES.chats);

    // 先清空，再批量添加
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      let completed = 0;
      if (chats.length === 0) {
        resolve();
        return;
      }

      chats.forEach((chat) => {
        const addRequest = store.put(chat);
        addRequest.onsuccess = () => {
          completed++;
          if (completed === chats.length) {
            resolve();
          }
        };
        addRequest.onerror = () => {
          reject(addRequest.error);
        };
      });
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
};

/**
 * 加载会话列表
 * @returns {Promise<Array>}
 */
export const loadChatsFromIDB = async () => {
  return getAllItems(STORES.chats);
};

// ========== 聊天消息专用方法 ==========

/**
 * 保存聊天消息
 * @param {string} chatId - 会话 ID
 * @param {Array} messages - 消息列表
 * @returns {Promise<void>}
 */
export const saveChatMessagesToIDB = async (chatId, messages) => {
  return saveItem(STORES.chatMessages, { chatId, messages });
};

/**
 * 加载聊天消息
 * @param {string} chatId - 会话 ID
 * @returns {Promise<Array>}
 */
export const loadChatMessagesFromIDB = async (chatId) => {
  const result = await getItem(STORES.chatMessages, chatId);
  return result?.messages || [];
};

/**
 * 删除聊天消息
 * @param {string} chatId - 会话 ID
 * @returns {Promise<void>}
 */
export const deleteChatMessagesFromIDB = async (chatId) => {
  return deleteItem(STORES.chatMessages, chatId);
};

// ========== 联系人专用方法 ==========

/**
 * 保存联系人列表
 * @param {Array} contacts - 联系人列表
 * @returns {Promise<void>}
 */
export const saveContactsToIDB = async (contacts) => {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORES.contacts], 'readwrite');
    const store = transaction.objectStore(STORES.contacts);

    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      if (contacts.length === 0) {
        resolve();
        return;
      }

      let completed = 0;
      contacts.forEach((contact) => {
        const addRequest = store.put(contact);
        addRequest.onsuccess = () => {
          completed++;
          if (completed === contacts.length) {
            resolve();
          }
        };
        addRequest.onerror = () => reject(addRequest.error);
      });
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
};

/**
 * 加载联系人列表
 * @returns {Promise<Array>}
 */
export const loadContactsFromIDB = async () => {
  return getAllItems(STORES.contacts);
};

// ========== 设置专用方法 ==========

/**
 * 保存设置
 * @param {string} key - 设置键
 * @param {any} value - 设置值
 * @returns {Promise<void>}
 */
export const saveSettingToIDB = async (key, value) => {
  return saveItem(STORES.settings, { key, value });
};

/**
 * 加载设置
 * @param {string} key - 设置键
 * @param {any} defaultValue - 默认值
 * @returns {Promise<any>}
 */
export const loadSettingFromIDB = async (key, defaultValue = null) => {
  const result = await getItem(STORES.settings, key);
  return result?.value ?? defaultValue;
};

// ========== 数据迁移 ==========

/**
 * 从 localStorage 迁移旧数据到 IndexedDB
 * 只在 IndexedDB 为空时执行迁移
 * @returns {Promise<void>}
 */
export const migrateFromLocalStorage = async () => {
  await initDB();

  // 检查是否已经迁移过（通过检查 IndexedDB 中是否有数据）
  const existingChats = await loadChatsFromIDB();
  if (existingChats.length > 0) {
    console.log("IndexedDB 已有数据，跳过迁移");
    return;
  }

  console.log("开始从 localStorage 迁移数据到 IndexedDB...");

  // 迁移会话列表
  const oldChatsKey = "xinliaoChats";
  const oldChatsRaw = localStorage.getItem(oldChatsKey);
  if (oldChatsRaw) {
    try {
      const oldChats = JSON.parse(oldChatsRaw);
      if (Array.isArray(oldChats) && oldChats.length > 0) {
        await saveChatsToIDB(oldChats);
        console.log(`已迁移 ${oldChats.length} 个会话`);
      }
    } catch (error) {
      console.warn("迁移会话列表失败:", error);
    }
  }

  // 迁移聊天消息
  let migratedMessagesCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("xinliaoChatMessages_")) {
      const chatId = key.replace("xinliaoChatMessages_", "");
      try {
        const messagesRaw = localStorage.getItem(key);
        if (messagesRaw) {
          const messages = JSON.parse(messagesRaw);
          if (Array.isArray(messages) && messages.length > 0) {
            await saveChatMessagesToIDB(chatId, messages);
            migratedMessagesCount++;
          }
        }
      } catch (error) {
        console.warn(`迁移聊天消息 ${chatId} 失败:`, error);
      }
    }
  }

  if (migratedMessagesCount > 0) {
    console.log(`已迁移 ${migratedMessagesCount} 个会话的聊天记录`);
  }

  console.log("数据迁移完成！");
};

// 导出存储名称常量
export { STORES };
