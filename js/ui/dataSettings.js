/**
 * 数据管理设置模块
 * 处理存储空间显示、数据备份导入导出、清理数据等功能
 */

// 存储键名列表
const STORAGE_KEYS = {
  xinliaoContacts: "联系人数据",
  xinliaoMoments: "动态数据",
  xinliaoMessages: "会话列表",
  xinliaoChats: "聊天记录",
  apiProfiles: "API 配置",
  soundSettings: "提示音设置",
};

// 计算字符串的字节大小
const getByteSize = (str) => {
  return new Blob([str]).size;
};

// 格式化字节大小
const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
};

// 计算存储空间使用情况
const calculateStorage = () => {
  const result = {
    total: 0,
    items: [],
  };

  // 遍历所有已知的存储键
  for (const [key, label] of Object.entries(STORAGE_KEYS)) {
    const data = localStorage.getItem(key);
    if (data) {
      const size = getByteSize(data);
      result.total += size;
      result.items.push({ key, label, size });
    }
  }

  // 检查其他未知的存储项
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!STORAGE_KEYS[key]) {
      const data = localStorage.getItem(key);
      const size = getByteSize(data);
      result.total += size;
      result.items.push({ key, label: key, size });
    }
  }

  // 按大小排序
  result.items.sort((a, b) => b.size - a.size);

  return result;
};

// 更新存储空间显示
const updateStorageDisplay = () => {
  const storageBarFill = document.getElementById("storageBarFill");
  const storageText = document.getElementById("storageText");
  const storageList = document.getElementById("storageList");

  if (!storageBarFill || !storageText || !storageList) return;

  const storage = calculateStorage();
  const maxStorage = 5 * 1024 * 1024; // 5MB 限制
  const percentage = Math.min((storage.total / maxStorage) * 100, 100);

  // 更新进度条
  storageBarFill.style.width = percentage + "%";

  // 根据使用量设置颜色
  if (percentage > 80) {
    storageBarFill.style.background = "linear-gradient(90deg, #ff6b6b, #ee5a5a)";
  } else if (percentage > 60) {
    storageBarFill.style.background = "linear-gradient(90deg, #ffa94d, #ff922b)";
  } else {
    storageBarFill.style.background = "linear-gradient(90deg, #7da6ff, #5b7bff)";
  }

  // 更新文字
  storageText.textContent = `已使用 ${formatSize(storage.total)} / ${formatSize(maxStorage)} (${percentage.toFixed(1)}%)`;

  // 更新详细列表
  storageList.innerHTML = "";
  storage.items.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "storage-item";
    itemEl.innerHTML = `
      <span class="storage-item-label">${item.label}</span>
      <span class="storage-item-size">${formatSize(item.size)}</span>
    `;
    storageList.appendChild(itemEl);
  });

  // 如果没有数据
  if (storage.items.length === 0) {
    storageList.innerHTML = '<div class="storage-empty">暂无存储数据</div>';
  }
};

// 导出备份
const exportBackup = () => {
  const backup = {};

  // 收集所有 localStorage 数据
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    try {
      backup[key] = JSON.parse(value);
    } catch {
      backup[key] = value;
    }
  }

  // 创建下载
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `goodnight-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert("备份导出成功！");
};

// 导入备份
const importBackup = (file) => {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);

      if (typeof backup !== "object" || backup === null) {
        alert("无效的备份文件格式");
        return;
      }

      // 确认导入
      if (!confirm("导入备份将覆盖现有数据，确定继续吗？")) {
        return;
      }

      // 清空现有数据
      localStorage.clear();

      // 恢复备份数据
      for (const [key, value] of Object.entries(backup)) {
        const strValue = typeof value === "string" ? value : JSON.stringify(value);
        localStorage.setItem(key, strValue);
      }

      alert("备份导入成功！页面将刷新以应用更改。");
      location.reload();
    } catch (error) {
      console.error("导入备份失败:", error);
      alert("导入失败：文件格式错误");
    }
  };

  reader.readAsText(file);
};

// 清空聊天记录
const clearChats = () => {
  if (!confirm("确定要清空所有聊天记录吗？此操作不可恢复。")) {
    return;
  }

  localStorage.removeItem("xinliaoChats");
  localStorage.removeItem("xinliaoMessages");
  updateStorageDisplay();
  alert("聊天记录已清空");
};

// 清空动态数据
const clearMoments = () => {
  if (!confirm("确定要清空所有动态数据吗？此操作不可恢复。")) {
    return;
  }

  localStorage.removeItem("xinliaoMoments");
  updateStorageDisplay();
  alert("动态数据已清空");
};

// 清空所有数据
const clearAll = () => {
  if (!confirm("确定要清空所有数据吗？此操作不可恢复！")) {
    return;
  }

  if (!confirm("再次确认：这将删除所有联系人、聊天记录、动态和设置，确定吗？")) {
    return;
  }

  localStorage.clear();
  alert("所有数据已清空！页面将刷新。");
  location.reload();
};

// 初始化数据设置
export const initDataSettings = () => {
  const btnExportBackup = document.getElementById("btnExportBackup");
  const btnImportBackup = document.getElementById("btnImportBackup");
  const importBackupInput = document.getElementById("importBackupInput");
  const btnClearChats = document.getElementById("btnClearChats");
  const btnClearMoments = document.getElementById("btnClearMoments");
  const btnClearAll = document.getElementById("btnClearAll");

  // 导出备份
  btnExportBackup?.addEventListener("click", exportBackup);

  // 导入备份按钮触发文件选择
  btnImportBackup?.addEventListener("click", () => {
    importBackupInput?.click();
  });

  // 文件选择后导入
  importBackupInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importBackup(file);
      e.target.value = ""; // 重置以便再次选择同一文件
    }
  });

  // 清理按钮
  btnClearChats?.addEventListener("click", clearChats);
  btnClearMoments?.addEventListener("click", clearMoments);
  btnClearAll?.addEventListener("click", clearAll);
};

// 导出更新存储显示函数供外部调用
export { updateStorageDisplay };
