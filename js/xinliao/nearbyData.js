const STORAGE_KEY = "xinliaoNearby";

export const normalizeNearby = (item = {}) => ({
  id: item.id || `nearby-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  avatar: item.avatar || item.image || item.icon || item.头像 || "🙂",
  name: item.name || item.nickname || item.网名 || "匿名",
  line: item.line || item.pickup || item.搭讪 || "嗨，认识一下？",
});

export const loadStoredNearby = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : [data];
    return list.filter(Boolean).map(normalizeNearby);
  } catch (error) {
    return [];
  }
};

export const saveNearby = (list = []) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    // 忽略存储失败
  }
};
