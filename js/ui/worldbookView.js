// 世界书视图模块
import {
  loadWorldbookData,
  saveWorldbookData,
  createGroup,
  createEntry,
  parseImportedJson,
  parseDocxContent,
} from "../worldbook/worldbookData.js";

const getEl = (id) => document.getElementById(id);

// HTML转义函数，防止XSS和HTML结构破坏
const escapeHtml = (str) => {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const initWorldbookView = () => {
  const homeView = getEl("homeView");
  const worldbookView = getEl("worldbookView");
  const backBtn = getEl("worldbookBack");
  const addBtn = getEl("worldbookAdd");
  const dropdownMenu = getEl("worldbookDropdownMenu");
  const groupsContainer = getEl("worldbookGroups");
  
  // 弹窗元素
  const groupPopup = getEl("worldbookGroupPopup");
  const groupNameInput = getEl("worldbookGroupName");
  const groupCancelBtn = getEl("worldbookGroupCancel");
  const groupConfirmBtn = getEl("worldbookGroupConfirm");
  
  const entryPopup = getEl("worldbookEntryPopup");
  const entryNameInput = getEl("worldbookEntryName");
  const entryContentInput = getEl("worldbookEntryContent");
  const entryGroupSelect = getEl("worldbookEntryGroup");
  const entryCancelBtn = getEl("worldbookEntryCancel");
  const entryConfirmBtn = getEl("worldbookEntryConfirm");
  
  const uploadInput = getEl("worldbookUploadInput");
  
  // 详情面板元素
  const detailPanel = getEl("worldbookDetail");
  const detailBackBtn = getEl("worldbookDetailBack");
  const detailTitle = getEl("worldbookDetailTitle");
  const detailNameInput = getEl("worldbookDetailName");
  const detailContentInput = getEl("worldbookDetailContent");
  const detailGroupSelect = getEl("worldbookDetailGroup");
  const detailEnabledCheckbox = getEl("worldbookDetailEnabled");
  const detailSaveBtn = getEl("worldbookDetailSave");
  const detailDeleteBtn = getEl("worldbookDetailDelete");

  // 分组详情面板元素
  const groupDetailPanel = getEl("worldbookGroupDetail");
  const groupDetailBackBtn = getEl("worldbookGroupDetailBack");
  const groupDetailTitle = getEl("worldbookGroupDetailTitle");
  const groupDetailList = getEl("worldbookGroupDetailList");
  const groupDetailDeleteBtn = getEl("worldbookGroupDetailDelete");
  const groupDetailRenameBtn = getEl("worldbookGroupDetailRename");
  
  // 分组详情工具栏元素
  const groupSelectAllBtn = getEl("worldbookGroupSelectAll");
  const groupMoveSelect = getEl("worldbookGroupMoveSelect");
  const groupBatchDeleteBtn = getEl("worldbookGroupBatchDelete");
  const groupFooter = getEl("worldbookGroupFooter");
  const groupSelectedCount = getEl("worldbookGroupSelectedCount");
  
  // 重命名弹窗元素
  const renamePopup = getEl("worldbookRenamePopup");
  const renameInput = getEl("worldbookRenameInput");
  const renameCancelBtn = getEl("worldbookRenameCancel");
  const renameConfirmBtn = getEl("worldbookRenameConfirm");

  // 导入弹窗元素
  const importPopup = getEl("worldbookImportPopup");
  const importFileName = getEl("worldbookImportFileName");
  const importCount = getEl("worldbookImportCount");
  const importGroupSelect = getEl("worldbookImportGroup");
  const importNewGroupField = getEl("worldbookImportNewGroupField");
  const importNewGroupInput = getEl("worldbookImportNewGroup");
  const importCancelBtn = getEl("worldbookImportCancel");
  const importConfirmBtn = getEl("worldbookImportConfirm");

  // 未分组提示元素
  const ungroupedHint = getEl("worldbookUngroupedHint");
  const ungroupedCount = getEl("worldbookUngroupedCount");

  // 批量处理面板元素
  const batchPanel = getEl("worldbookBatchPanel");
  const batchBackBtn = getEl("worldbookBatchBack");
  const batchSelectAllBtn = getEl("worldbookBatchSelectAll");
  const batchGroupSelect = getEl("worldbookBatchGroupSelect");
  const batchList = getEl("worldbookBatchList");
  const batchCount = getEl("worldbookBatchCount");
  const batchMoveBtn = getEl("worldbookBatchMove");
  const batchDeleteBtn = getEl("worldbookBatchDelete");

  if (!worldbookView || !groupsContainer) return;

  // 数据
  let data = loadWorldbookData();
  let activeEntryId = null;
  let activeGroupId = null;
  
  // 导入临时数据
  let pendingImport = null;
  
  // 批量选择（未分组面板）
  let batchSelectedIds = new Set();
  
  // 分组内批量选择
  let groupSelectedIds = new Set();

  // 显示/隐藏视图
  const showWorldbook = () => {
    homeView?.classList.add("is-hidden");
    worldbookView.classList.add("active");
    // 重新加载数据，确保显示最新内容（包括从其他地方导入的数据）
    data = loadWorldbookData();
    renderGroups();
    updateUngroupedHint();
  };

  const hideWorldbook = () => {
    worldbookView.classList.remove("active");
    homeView?.classList.remove("is-hidden");
    closeDropdown();
  };

  // 绑定应用点击
  const bindWorldbookApp = () => {
    const apps = document.querySelectorAll('.app[data-app-name="世界书"]');
    apps.forEach((app) => {
      app.addEventListener("click", showWorldbook);
    });
  };

  // 下拉菜单
  const toggleDropdown = () => {
    dropdownMenu?.classList.toggle("is-hidden");
  };

  const closeDropdown = () => {
    dropdownMenu?.classList.add("is-hidden");
  };

  // 更新未分组提示
  const updateUngroupedHint = () => {
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    const count = ungroupedEntries.length;
    
    if (ungroupedHint && ungroupedCount) {
      if (count > 0) {
        ungroupedCount.textContent = count;
        ungroupedHint.classList.remove("is-hidden");
      } else {
        ungroupedHint.classList.add("is-hidden");
      }
    }
  };

  // 渲染分组
  const renderGroups = () => {
    if (!groupsContainer) return;

    if (!data.groups.length && !data.entries.length) {
      groupsContainer.innerHTML = `
        <div class="worldbook-empty">
          <div class="worldbook-empty-icon">📚</div>
          <div>暂无设定，点击右上角 + 添加</div>
        </div>
      `;
      return;
    }

    // 获取未分组的设定
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);

    let html = "";

    // 渲染各分组
    data.groups.forEach((group) => {
      const groupEntries = data.entries.filter((e) => e.groupId === group.id);
      html += renderGroupBox(group, groupEntries);
    });

    // 渲染未分组的设定（如果有）
    if (ungroupedEntries.length) {
      html += renderGroupBox({ id: null, name: "未分组" }, ungroupedEntries);
    }

    groupsContainer.innerHTML = html;

    // 绑定设定点击事件
    groupsContainer.querySelectorAll(".worldbook-entry").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const entryId = el.dataset.id;
        openEntryDetail(entryId);
      });
    });

    // 绑定分组标签单击（打开分组详情）
    groupsContainer.querySelectorAll(".worldbook-group-label").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const groupEl = el.closest(".worldbook-group");
        const groupId = groupEl?.dataset.groupId;
        // 处理 "null" 字符串的情况（未分组）
        const actualGroupId = groupId === "null" ? null : groupId;
        openGroupDetail(actualGroupId);
      });
    });

    // 绑定分组盒子点击（打开分组详情）
    groupsContainer.querySelectorAll(".worldbook-box").forEach((el) => {
      el.addEventListener("click", (e) => {
        // 如果点击的是设定条目，不触发分组详情
        if (e.target.closest(".worldbook-entry")) return;
        
        const groupEl = el.closest(".worldbook-group");
        const groupId = groupEl?.dataset.groupId;
        const actualGroupId = groupId === "null" ? null : groupId;
        openGroupDetail(actualGroupId);
      });
    });
  };

  // 渲染单个分组盒子 - 立体箱子效果
  const renderGroupBox = (group, entries) => {
    const maxVisible = 4; // 最多显示4个文件标签
    const visibleEntries = entries.slice(0, maxVisible);
    const moreCount = entries.length - maxVisible;

    const entriesHtml = visibleEntries
      .map(
        (entry) => `
        <button class="worldbook-entry" data-id="${entry.id}">
          <span class="worldbook-entry-name">${escapeHtml(entry.name)}</span>
        </button>
      `
      )
      .join("");

    const moreHtml = moreCount > 0 
      ? `<div class="worldbook-more">还有 ${moreCount} 个...</div>` 
      : "";

    const innerContent = entries.length > 0
      ? `<div class="worldbook-entries">${entriesHtml}${moreHtml}</div>`
      : `<div class="worldbook-box-empty">空</div>`;

    return `
      <div class="worldbook-group" data-group-id="${group.id}">
        <div class="worldbook-box">
          <div class="worldbook-group-label">
            <span class="worldbook-group-name">${escapeHtml(group.name)}</span>
            <span class="worldbook-group-count">(${entries.length})</span>
          </div>
          <div class="worldbook-box-inner">
            ${innerContent}
          </div>
        </div>
      </div>
    `;
  };

  // 更新分组选择器
  const updateGroupSelects = () => {
    const options = `<option value="">未分组</option>` +
      data.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
    
    if (entryGroupSelect) entryGroupSelect.innerHTML = options;
    if (detailGroupSelect) detailGroupSelect.innerHTML = options;
    
    // 导入分组选择器
    if (importGroupSelect) {
      importGroupSelect.innerHTML = `<option value="">未分组</option>` +
        data.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("") +
        `<option value="__new__">+ 新建分组...</option>`;
    }
    
    // 批量处理分组选择器
    if (batchGroupSelect) {
      batchGroupSelect.innerHTML = `<option value="">选择目标分组</option>` +
        data.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("") +
        `<option value="__new__">+ 新建分组...</option>`;
    }
  };

  // 打开新建分组弹窗
  const openGroupPopup = () => {
    closeDropdown();
    if (groupNameInput) groupNameInput.value = "";
    groupPopup?.classList.add("active");
  };

  const closeGroupPopup = () => {
    groupPopup?.classList.remove("active");
  };

  // 打开新建设定弹窗
  const openEntryPopup = () => {
    closeDropdown();
    updateGroupSelects();
    if (entryNameInput) entryNameInput.value = "";
    if (entryContentInput) entryContentInput.value = "";
    if (entryGroupSelect) entryGroupSelect.value = "";
    entryPopup?.classList.add("active");
  };

  const closeEntryPopup = () => {
    entryPopup?.classList.remove("active");
  };

  // 打开设定详情
  const openEntryDetail = (entryId) => {
    const entry = data.entries.find((e) => e.id === entryId);
    if (!entry) return;

    activeEntryId = entryId;
    updateGroupSelects();

    if (detailTitle) detailTitle.textContent = entry.name;
    if (detailNameInput) detailNameInput.value = entry.name;
    if (detailContentInput) detailContentInput.value = entry.content;
    if (detailGroupSelect) detailGroupSelect.value = entry.groupId || "";
    if (detailEnabledCheckbox) detailEnabledCheckbox.checked = entry.enabled !== false;

    detailPanel?.classList.add("active");
  };

  const closeEntryDetail = () => {
    detailPanel?.classList.remove("active");
    activeEntryId = null;
  };

  // 保存分组
  const saveGroup = () => {
    const name = groupNameInput?.value.trim();
    if (!name) return;

    const group = createGroup(name);
    data.groups.push(group);
    saveWorldbookData(data);
    renderGroups();
    updateUngroupedHint();
    closeGroupPopup();
  };

  // 保存新设定
  const saveNewEntry = () => {
    const name = entryNameInput?.value.trim();
    const content = entryContentInput?.value.trim();
    const groupId = entryGroupSelect?.value || null;

    if (!name) return;

    const entry = createEntry({ name, content, groupId });
    data.entries.push(entry);
    saveWorldbookData(data);
    renderGroups();
    updateUngroupedHint();
    closeEntryPopup();
  };

  // 保存设定详情
  const saveEntryDetail = () => {
    if (!activeEntryId) return;

    const entry = data.entries.find((e) => e.id === activeEntryId);
    if (!entry) return;

    entry.name = detailNameInput?.value.trim() || entry.name;
    entry.content = detailContentInput?.value || "";
    entry.groupId = detailGroupSelect?.value || null;
    entry.enabled = detailEnabledCheckbox?.checked !== false;
    entry.updatedAt = Date.now();

    saveWorldbookData(data);
    renderGroups();
    updateUngroupedHint();
    closeEntryDetail();
    
    // 如果分组详情面板打开，刷新它
    if (groupDetailPanel?.classList.contains("active")) {
      const entries = activeGroupId 
        ? data.entries.filter((e) => e.groupId === activeGroupId)
        : data.entries.filter((e) => !e.groupId);
      renderGroupDetailList(entries);
    }
  };

  // 删除设定
  const deleteEntry = () => {
    if (!activeEntryId) return;
    if (!confirm("确定要删除这个设定吗？")) return;

    data.entries = data.entries.filter((e) => e.id !== activeEntryId);
    saveWorldbookData(data);
    renderGroups();
    updateUngroupedHint();
    closeEntryDetail();
    
    // 如果分组详情面板打开，刷新它
    if (groupDetailPanel?.classList.contains("active")) {
      const entries = activeGroupId 
        ? data.entries.filter((e) => e.groupId === activeGroupId)
        : data.entries.filter((e) => !e.groupId);
      renderGroupDetailList(entries);
    }
  };

  // 打开分组详情面板
  const openGroupDetail = (groupId) => {
    activeGroupId = groupId;
    groupSelectedIds.clear();
    
    // 获取分组信息
    const group = groupId ? data.groups.find((g) => g.id === groupId) : { name: "未分组" };
    const entries = groupId 
      ? data.entries.filter((e) => e.groupId === groupId)
      : data.entries.filter((e) => !e.groupId);
    
    if (groupDetailTitle) {
      groupDetailTitle.textContent = group?.name || "分组详情";
    }
    
    // 渲染设定列表
    renderGroupDetailList(entries);
    
    // 显示/隐藏删除和重命名按钮（未分组不能删除和重命名）
    if (groupDetailDeleteBtn) {
      groupDetailDeleteBtn.style.display = groupId ? "block" : "none";
    }
    if (groupDetailRenameBtn) {
      groupDetailRenameBtn.style.display = groupId ? "block" : "none";
    }
    
    // 更新分组内移动选择器
    updateGroupMoveSelect();
    updateGroupBatchUI();
    
    groupDetailPanel?.classList.add("active");
  };

  // 关闭分组详情面板
  const closeGroupDetail = () => {
    groupDetailPanel?.classList.remove("active");
    activeGroupId = null;
    groupSelectedIds.clear();
  };

  // 更新分组内移动选择器
  const updateGroupMoveSelect = () => {
    if (!groupMoveSelect) return;
    
    // 过滤掉当前分组
    const otherGroups = data.groups.filter((g) => g.id !== activeGroupId);
    
    let options = `<option value="">移动到...</option>`;
    
    // 如果当前不是未分组，添加"移到未分组"选项
    if (activeGroupId) {
      options += `<option value="__ungrouped__">未分组</option>`;
    }
    
    options += otherGroups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
    options += `<option value="__new__">+ 新建分组...</option>`;
    
    groupMoveSelect.innerHTML = options;
  };

  // 更新分组内批量操作 UI
  const updateGroupBatchUI = () => {
    const count = groupSelectedIds.size;
    const entries = activeGroupId 
      ? data.entries.filter((e) => e.groupId === activeGroupId)
      : data.entries.filter((e) => !e.groupId);
    
    // 更新选中数量
    if (groupSelectedCount) {
      groupSelectedCount.textContent = count;
    }
    
    // 显示/隐藏底栏
    if (groupFooter) {
      groupFooter.classList.toggle("is-hidden", count === 0);
    }
    
    // 更新删除按钮状态
    if (groupBatchDeleteBtn) {
      groupBatchDeleteBtn.disabled = count === 0;
    }
    
    // 更新全选按钮状态
    if (groupSelectAllBtn) {
      if (count === entries.length && count > 0) {
        groupSelectAllBtn.classList.add("active");
        groupSelectAllBtn.textContent = "取消全选";
      } else {
        groupSelectAllBtn.classList.remove("active");
        groupSelectAllBtn.textContent = "全选";
      }
    }
  };

  // 渲染分组详情中的设定列表
  const renderGroupDetailList = (entries) => {
    if (!groupDetailList) return;
    
    if (!entries.length) {
      groupDetailList.innerHTML = `
        <div class="worldbook-group-empty">
          <div class="worldbook-group-empty-icon">📭</div>
          <div class="worldbook-group-empty-text">该分组暂无设定</div>
        </div>
      `;
      return;
    }
    
    groupDetailList.innerHTML = entries.map((entry) => {
      const safeName = escapeHtml(entry.name);
      const safePreview = escapeHtml(entry.content?.slice(0, 50) || "暂无内容") + (entry.content?.length > 50 ? "..." : "");
      const isSelected = groupSelectedIds.has(entry.id);
      return `
      <div class="worldbook-group-entry-item ${isSelected ? "selected" : ""}" data-entry-id="${entry.id}">
        <div class="worldbook-entry-checkbox"></div>
        <div class="worldbook-group-entry-info">
          <div class="worldbook-group-entry-name">${safeName}</div>
          <div class="worldbook-group-entry-preview">${safePreview}</div>
        </div>
        <span class="worldbook-group-entry-arrow">›</span>
      </div>
    `;
    }).join("");
    
    // 绑定点击事件
    groupDetailList.querySelectorAll(".worldbook-group-entry-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        const entryId = el.dataset.entryId;
        // 如果点击的是复选框区域，切换选中状态
        if (e.target.closest(".worldbook-entry-checkbox")) {
          toggleGroupEntrySelect(entryId);
        } else {
          // 否则打开详情
          openEntryDetail(entryId);
        }
      });
    });
  };

  // 切换分组内设定选中状态
  const toggleGroupEntrySelect = (entryId) => {
    if (groupSelectedIds.has(entryId)) {
      groupSelectedIds.delete(entryId);
    } else {
      groupSelectedIds.add(entryId);
    }
    
    const entries = activeGroupId 
      ? data.entries.filter((e) => e.groupId === activeGroupId)
      : data.entries.filter((e) => !e.groupId);
    renderGroupDetailList(entries);
    updateGroupBatchUI();
  };

  // 分组内全选/取消全选
  const toggleGroupSelectAll = () => {
    const entries = activeGroupId 
      ? data.entries.filter((e) => e.groupId === activeGroupId)
      : data.entries.filter((e) => !e.groupId);
    
    if (groupSelectedIds.size === entries.length) {
      groupSelectedIds.clear();
    } else {
      entries.forEach((e) => groupSelectedIds.add(e.id));
    }
    
    renderGroupDetailList(entries);
    updateGroupBatchUI();
  };

  // 分组内批量移动
  const groupBatchMove = () => {
    let targetGroupId = groupMoveSelect?.value;
    if (!targetGroupId || groupSelectedIds.size === 0) return;
    
    // 处理特殊值
    if (targetGroupId === "__ungrouped__") {
      targetGroupId = null;
    } else if (targetGroupId === "__new__") {
      const newGroupName = prompt("请输入新分组名称");
      if (!newGroupName?.trim()) return;
      const newGroup = createGroup(newGroupName.trim());
      data.groups.push(newGroup);
      targetGroupId = newGroup.id;
    }
    
    // 移动选中的设定
    data.entries.forEach((e) => {
      if (groupSelectedIds.has(e.id)) {
        e.groupId = targetGroupId;
      }
    });
    
    saveWorldbookData(data);
    groupSelectedIds.clear();
    
    // 刷新当前分组列表
    const entries = activeGroupId 
      ? data.entries.filter((e) => e.groupId === activeGroupId)
      : data.entries.filter((e) => !e.groupId);
    renderGroupDetailList(entries);
    updateGroupBatchUI();
    updateGroupMoveSelect();
    renderGroups();
    updateUngroupedHint();
    
    // 重置移动选择器
    if (groupMoveSelect) groupMoveSelect.value = "";
  };

  // 分组内批量删除
  const groupBatchDelete = () => {
    if (groupSelectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${groupSelectedIds.size} 个设定吗？`)) return;
    
    data.entries = data.entries.filter((e) => !groupSelectedIds.has(e.id));
    saveWorldbookData(data);
    groupSelectedIds.clear();
    
    // 刷新当前分组列表
    const entries = activeGroupId 
      ? data.entries.filter((e) => e.groupId === activeGroupId)
      : data.entries.filter((e) => !e.groupId);
    renderGroupDetailList(entries);
    updateGroupBatchUI();
    renderGroups();
    updateUngroupedHint();
  };

  // ========== 重命名分组功能 ==========
  
  // 打开重命名弹窗
  const openRenamePopup = () => {
    if (!activeGroupId) return;
    
    const group = data.groups.find((g) => g.id === activeGroupId);
    if (!group) return;
    
    if (renameInput) renameInput.value = group.name;
    renamePopup?.classList.add("active");
  };

  // 关闭重命名弹窗
  const closeRenamePopup = () => {
    renamePopup?.classList.remove("active");
  };

  // 确认重命名
  const confirmRename = () => {
    if (!activeGroupId) return;
    
    const newName = renameInput?.value.trim();
    if (!newName) {
      alert("请输入分组名称");
      return;
    }
    
    const group = data.groups.find((g) => g.id === activeGroupId);
    if (!group) return;
    
    group.name = newName;
    saveWorldbookData(data);
    
    // 更新标题
    if (groupDetailTitle) {
      groupDetailTitle.textContent = newName;
    }
    
    renderGroups();
    closeRenamePopup();
  };

  // 删除分组
  const deleteGroup = () => {
    if (!activeGroupId) return;
    
    const group = data.groups.find((g) => g.id === activeGroupId);
    if (!group) return;
    
    const entries = data.entries.filter((e) => e.groupId === activeGroupId);
    const confirmMsg = entries.length > 0
      ? `确定要删除分组"${group.name}"吗？\n该分组下的 ${entries.length} 个设定将变为未分组。`
      : `确定要删除分组"${group.name}"吗？`;
    
    if (!confirm(confirmMsg)) return;
    
    // 将该分组下的设定移到未分组
    data.entries.forEach((e) => {
      if (e.groupId === activeGroupId) {
        e.groupId = null;
      }
    });
    
    // 删除分组
    data.groups = data.groups.filter((g) => g.id !== activeGroupId);
    saveWorldbookData(data);
    
    closeGroupDetail();
    renderGroups();
    updateUngroupedHint();
  };

  // ========== 导入功能 ==========
  
  // 打开导入弹窗
  const openImportPopup = (fileName, entries) => {
    pendingImport = { fileName, entries };
    
    if (importFileName) importFileName.textContent = fileName;
    if (importCount) importCount.textContent = `共 ${entries.length} 个设定`;
    
    updateGroupSelects();
    if (importGroupSelect) importGroupSelect.value = "";
    if (importNewGroupInput) importNewGroupInput.value = "";
    importNewGroupField?.classList.add("is-hidden");
    
    importPopup?.classList.add("active");
  };

  // 关闭导入弹窗
  const closeImportPopup = () => {
    importPopup?.classList.remove("active");
    pendingImport = null;
  };

  // 确认导入
  const confirmImport = () => {
    if (!pendingImport) return;
    
    let targetGroupId = importGroupSelect?.value || null;
    
    // 如果选择新建分组
    if (targetGroupId === "__new__") {
      const newGroupName = importNewGroupInput?.value.trim();
      if (!newGroupName) {
        alert("请输入新分组名称");
        return;
      }
      const newGroup = createGroup(newGroupName);
      data.groups.push(newGroup);
      targetGroupId = newGroup.id;
    }
    
    // 导入设定
    pendingImport.entries.forEach((entry) => {
      entry.groupId = targetGroupId;
      data.entries.push(entry);
    });
    
    saveWorldbookData(data);
    renderGroups();
    updateUngroupedHint();
    closeImportPopup();
    
    alert(`已导入 ${pendingImport.entries.length} 个设定`);
  };

  // 处理文件上传
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    closeDropdown();
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith(".json")) {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        const imported = parseImportedJson(jsonData);
        
        if (imported.entries.length > 0) {
          // 打开导入弹窗让用户选择分组
          openImportPopup(file.name, imported.entries);
        } else {
          alert("未找到可导入的设定");
        }
      } else if (fileName.endsWith(".docx")) {
        const buffer = await file.arrayBuffer();
        const content = await parseDocxContent(buffer);
        
        if (content) {
          // 创建一个新设定，内容为 DOCX 文本
          const entry = createEntry({
            name: file.name.replace(/\.docx$/i, ""),
            content: content,
          });
          // 打开导入弹窗让用户选择分组
          openImportPopup(file.name, [entry]);
        } else {
          alert("无法解析 DOCX 文件内容");
        }
      } else {
        alert("不支持的文件格式，请使用 JSON 或 DOCX");
      }
    } catch (e) {
      console.error("导入失败", e);
      alert("文件解析失败");
    }

    // 清空文件输入
    if (uploadInput) uploadInput.value = "";
  };

  // ========== 批量处理功能 ==========
  
  // 打开批量处理面板
  const openBatchPanel = () => {
    batchSelectedIds.clear();
    updateGroupSelects();
    renderBatchList();
    updateBatchUI();
    batchPanel?.classList.add("active");
  };

  // 关闭批量处理面板
  const closeBatchPanel = () => {
    batchPanel?.classList.remove("active");
    batchSelectedIds.clear();
  };

  // 渲染批量列表
  const renderBatchList = () => {
    if (!batchList) return;
    
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    
    if (!ungroupedEntries.length) {
      batchList.innerHTML = `
        <div class="worldbook-batch-empty">
          <div class="worldbook-batch-empty-icon">✅</div>
          <div class="worldbook-batch-empty-text">没有未分组的设定</div>
        </div>
      `;
      return;
    }
    
    batchList.innerHTML = ungroupedEntries.map((entry) => {
      const isSelected = batchSelectedIds.has(entry.id);
      const safeName = escapeHtml(entry.name);
      const safePreview = escapeHtml(entry.content?.slice(0, 50) || "暂无内容") + (entry.content?.length > 50 ? "..." : "");
      return `
        <div class="worldbook-batch-item ${isSelected ? "selected" : ""}" data-entry-id="${entry.id}">
          <div class="worldbook-batch-checkbox"></div>
          <div class="worldbook-batch-item-info">
            <div class="worldbook-batch-item-name">${safeName}</div>
            <div class="worldbook-batch-item-preview">${safePreview}</div>
          </div>
        </div>
      `;
    }).join("");
    
    // 绑定点击事件
    batchList.querySelectorAll(".worldbook-batch-item").forEach((el) => {
      el.addEventListener("click", () => {
        const entryId = el.dataset.entryId;
        toggleBatchSelect(entryId);
      });
    });
  };

  // 切换批量选择
  const toggleBatchSelect = (entryId) => {
    if (batchSelectedIds.has(entryId)) {
      batchSelectedIds.delete(entryId);
    } else {
      batchSelectedIds.add(entryId);
    }
    renderBatchList();
    updateBatchUI();
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    
    if (batchSelectedIds.size === ungroupedEntries.length) {
      // 取消全选
      batchSelectedIds.clear();
    } else {
      // 全选
      ungroupedEntries.forEach((e) => batchSelectedIds.add(e.id));
    }
    
    renderBatchList();
    updateBatchUI();
  };

  // 更新批量操作 UI
  const updateBatchUI = () => {
    const count = batchSelectedIds.size;
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    
    if (batchCount) batchCount.textContent = count;
    if (batchMoveBtn) batchMoveBtn.disabled = count === 0 || !batchGroupSelect?.value;
    if (batchDeleteBtn) batchDeleteBtn.disabled = count === 0;
    
    // 更新全选按钮状态
    if (batchSelectAllBtn) {
      if (count === ungroupedEntries.length && count > 0) {
        batchSelectAllBtn.classList.add("active");
        batchSelectAllBtn.textContent = "取消全选";
      } else {
        batchSelectAllBtn.classList.remove("active");
        batchSelectAllBtn.textContent = "全选";
      }
    }
  };

  // 批量移动到分组
  const batchMoveToGroup = () => {
    let targetGroupId = batchGroupSelect?.value;
    if (!targetGroupId || batchSelectedIds.size === 0) return;
    
    // 如果选择新建分组
    if (targetGroupId === "__new__") {
      const newGroupName = prompt("请输入新分组名称");
      if (!newGroupName?.trim()) return;
      const newGroup = createGroup(newGroupName.trim());
      data.groups.push(newGroup);
      targetGroupId = newGroup.id;
    }
    
    // 移动选中的设定
    data.entries.forEach((e) => {
      if (batchSelectedIds.has(e.id)) {
        e.groupId = targetGroupId;
      }
    });
    
    saveWorldbookData(data);
    batchSelectedIds.clear();
    renderBatchList();
    updateBatchUI();
    renderGroups();
    updateUngroupedHint();
    updateGroupSelects();
    
    // 如果没有未分组的了，关闭面板
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    if (ungroupedEntries.length === 0) {
      closeBatchPanel();
    }
  };

  // 批量删除
  const batchDelete = () => {
    if (batchSelectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${batchSelectedIds.size} 个设定吗？`)) return;
    
    data.entries = data.entries.filter((e) => !batchSelectedIds.has(e.id));
    saveWorldbookData(data);
    batchSelectedIds.clear();
    renderBatchList();
    updateBatchUI();
    renderGroups();
    updateUngroupedHint();
    
    // 如果没有未分组的了，关闭面板
    const ungroupedEntries = data.entries.filter((e) => !e.groupId);
    if (ungroupedEntries.length === 0) {
      closeBatchPanel();
    }
  };

  // ========== 事件绑定 ==========
  
  backBtn?.addEventListener("click", hideWorldbook);
  addBtn?.addEventListener("click", toggleDropdown);

  // 下拉菜单项
  getEl("worldbookAddGroup")?.addEventListener("click", openGroupPopup);
  getEl("worldbookAddEntry")?.addEventListener("click", openEntryPopup);
  getEl("worldbookUpload")?.addEventListener("click", () => {
    closeDropdown();
    uploadInput?.click();
  });

  // 点击外部关闭下拉菜单
  document.addEventListener("click", (e) => {
    if (!getEl("worldbookDropdown")?.contains(e.target)) {
      closeDropdown();
    }
  });

  // 弹窗事件
  groupCancelBtn?.addEventListener("click", closeGroupPopup);
  groupConfirmBtn?.addEventListener("click", saveGroup);
  groupPopup?.addEventListener("click", (e) => {
    if (e.target === groupPopup) closeGroupPopup();
  });

  entryCancelBtn?.addEventListener("click", closeEntryPopup);
  entryConfirmBtn?.addEventListener("click", saveNewEntry);
  entryPopup?.addEventListener("click", (e) => {
    if (e.target === entryPopup) closeEntryPopup();
  });

  // 详情面板事件
  detailBackBtn?.addEventListener("click", closeEntryDetail);
  detailSaveBtn?.addEventListener("click", saveEntryDetail);
  detailDeleteBtn?.addEventListener("click", deleteEntry);

  // 分组详情面板事件
  groupDetailBackBtn?.addEventListener("click", closeGroupDetail);
  groupDetailDeleteBtn?.addEventListener("click", deleteGroup);
  groupDetailRenameBtn?.addEventListener("click", openRenamePopup);
  
  // 分组内批量操作事件
  groupSelectAllBtn?.addEventListener("click", toggleGroupSelectAll);
  groupMoveSelect?.addEventListener("change", groupBatchMove);
  groupBatchDeleteBtn?.addEventListener("click", groupBatchDelete);
  
  // 重命名弹窗事件
  renameCancelBtn?.addEventListener("click", closeRenamePopup);
  renameConfirmBtn?.addEventListener("click", confirmRename);
  renamePopup?.addEventListener("click", (e) => {
    if (e.target === renamePopup) closeRenamePopup();
  });

  // 导入弹窗事件
  importCancelBtn?.addEventListener("click", closeImportPopup);
  importConfirmBtn?.addEventListener("click", confirmImport);
  importPopup?.addEventListener("click", (e) => {
    if (e.target === importPopup) closeImportPopup();
  });
  
  // 导入分组选择变化
  importGroupSelect?.addEventListener("change", () => {
    if (importGroupSelect.value === "__new__") {
      importNewGroupField?.classList.remove("is-hidden");
    } else {
      importNewGroupField?.classList.add("is-hidden");
    }
  });

  // 未分组提示点击
  ungroupedHint?.addEventListener("click", openBatchPanel);

  // 批量处理面板事件
  batchBackBtn?.addEventListener("click", closeBatchPanel);
  batchSelectAllBtn?.addEventListener("click", toggleSelectAll);
  batchMoveBtn?.addEventListener("click", batchMoveToGroup);
  batchDeleteBtn?.addEventListener("click", batchDelete);
  
  // 批量分组选择变化
  batchGroupSelect?.addEventListener("change", updateBatchUI);

  // 文件上传
  uploadInput?.addEventListener("change", handleUpload);

  // ESC 关闭
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (renamePopup?.classList.contains("active")) {
        closeRenamePopup();
      } else if (detailPanel?.classList.contains("active")) {
        closeEntryDetail();
      } else if (groupDetailPanel?.classList.contains("active")) {
        closeGroupDetail();
      } else if (batchPanel?.classList.contains("active")) {
        closeBatchPanel();
      } else if (importPopup?.classList.contains("active")) {
        closeImportPopup();
      } else if (groupPopup?.classList.contains("active")) {
        closeGroupPopup();
      } else if (entryPopup?.classList.contains("active")) {
        closeEntryPopup();
      } else if (worldbookView?.classList.contains("active")) {
        hideWorldbook();
      }
    }
  });

  // 初始化
  bindWorldbookApp();
};
