/**
 * 动态数据管理模块
 * 管理朋友圈动态的存储和操作
 */

const MOMENTS_STORAGE_KEY = "xinliaoMoments";

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID
 */
export const generateId = () =>
  `moment-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间
 */
export const formatTime = (timestamp) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 2 * day) return "昨天";
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;

  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  return `${month}月${dayOfMonth}日`;
};

/**
 * 标准化动态数据
 * @param {Object} item - 原始动态数据
 * @returns {Object} 标准化后的动态数据
 */
export const normalizeMoment = (item = {}) => ({
  id: item.id || generateId(),
  author: item.author || "我",
  avatar: item.avatar || "👤",
  content: item.content || "",
  images: item.images || [],
  timestamp: item.timestamp || Date.now(),
  likes: item.likes || [],
  comments: item.comments || [],
});

/**
 * 从本地存储加载动态列表
 * @returns {Array} 动态列表
 */
export const loadStoredMoments = () => {
  try {
    const raw = localStorage.getItem(MOMENTS_STORAGE_KEY);
    console.log("loadStoredMoments: 从 localStorage 读取", raw ? "有数据" : "无数据");
    if (!raw) return [];
    const data = JSON.parse(raw);
    const result = Array.isArray(data) ? data.map(normalizeMoment) : [];
    console.log("loadStoredMoments: 加载了", result.length, "条动态");
    return result;
  } catch (error) {
    console.warn("加载动态失败", error);
    return [];
  }
};

/**
 * 保存动态列表到本地存储
 * @param {Array} moments - 动态列表
 */
export const saveMoments = (moments) => {
  try {
    const jsonStr = JSON.stringify(moments);
    localStorage.setItem(MOMENTS_STORAGE_KEY, jsonStr);
    console.log("saveMoments: 保存成功，共", moments.length, "条动态");
    
    // 验证保存是否成功
    const saved = localStorage.getItem(MOMENTS_STORAGE_KEY);
    if (saved !== jsonStr) {
      console.error("saveMoments: 保存验证失败！");
    }
  } catch (error) {
    console.error("保存动态失败", error);
    // 如果是存储空间不足，尝试清理一些旧数据
    if (error.name === "QuotaExceededError") {
      console.warn("存储空间不足，尝试清理...");
    }
  }
};

/**
 * 添加新动态
 * @param {Array} moments - 当前动态列表
 * @param {Object} newMoment - 新动态数据
 * @returns {Array} 更新后的动态列表
 */
export const addMoment = (moments, newMoment) => {
  const normalized = normalizeMoment(newMoment);
  const updated = [normalized, ...moments];
  saveMoments(updated);
  return updated;
};

/**
 * 删除动态
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 要删除的动态 ID
 * @returns {Array} 更新后的动态列表
 */
export const deleteMoment = (moments, momentId) => {
  const updated = moments.filter((m) => m.id !== momentId);
  saveMoments(updated);
  return updated;
};

/**
 * 切换点赞状态
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 动态 ID
 * @param {string} userId - 用户 ID
 * @returns {Array} 更新后的动态列表
 */
export const toggleLike = (moments, momentId, userId = "me") => {
  const updated = moments.map((m) => {
    if (m.id !== momentId) return m;
    const hasLiked = m.likes.includes(userId);
    return {
      ...m,
      likes: hasLiked
        ? m.likes.filter((id) => id !== userId)
        : [...m.likes, userId],
    };
  });
  saveMoments(updated);
  return updated;
};

/**
 * 添加评论
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 动态 ID
 * @param {Object} comment - 评论数据
 * @returns {Array} 更新后的动态列表
 */
export const addComment = (moments, momentId, comment) => {
  const updated = moments.map((m) => {
    if (m.id !== momentId) return m;
    return {
      ...m,
      comments: [
        ...m.comments,
        {
          id: generateId(),
          author: comment.author || "我",
          content: comment.content || "",
          replyTo: comment.replyTo || null, // 回复对象（可选）
          timestamp: Date.now(),
        },
      ],
    };
  });
  saveMoments(updated);
  return updated;
};

/**
 * 删除单条评论
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 动态 ID
 * @param {string} commentId - 评论 ID
 * @returns {Array} 更新后的动态列表
 */
export const deleteComment = (moments, momentId, commentId) => {
  const updated = moments.map((m) => {
    if (m.id !== momentId) return m;
    return {
      ...m,
      comments: m.comments.filter((c) => c.id !== commentId),
    };
  });
  saveMoments(updated);
  return updated;
};

/**
 * 删除多条评论
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 动态 ID
 * @param {Array} commentIds - 评论 ID 列表
 * @returns {Array} 更新后的动态列表
 */
export const deleteComments = (moments, momentId, commentIds) => {
  const idsSet = new Set(commentIds);
  const updated = moments.map((m) => {
    if (m.id !== momentId) return m;
    return {
      ...m,
      comments: m.comments.filter((c) => !idsSet.has(c.id)),
    };
  });
  saveMoments(updated);
  return updated;
};

/**
 * 角色点赞动态
 * @param {Array} moments - 当前动态列表
 * @param {string} momentId - 动态 ID
 * @param {string} contactName - 角色名称
 * @returns {Array} 更新后的动态列表
 */
export const addContactLike = (moments, momentId, contactName) => {
  const updated = moments.map((m) => {
    if (m.id !== momentId) return m;
    // 如果已经点赞过，不重复添加
    if (m.likes.includes(contactName)) return m;
    return {
      ...m,
      likes: [...m.likes, contactName],
    };
  });
  saveMoments(updated);
  return updated;
};
