const DEFAULT_TIMEOUT = 8000;
const STORAGE_KEY = "apiProfiles";

const setStatus = (el, text, variant = "neutral") => {
  el.textContent = text;
  el.dataset.state = variant;
};

const normalizeBaseUrl = (raw) => {
  let url = raw.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  url = url.replace(/\/+$/g, "");
  return url.endsWith("/v1") ? url : `${url}/v1`;
};

const withTimeout = (runner, ms = DEFAULT_TIMEOUT) =>
  new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("请求超时"));
    }, ms);
    runner(controller.signal)
      .then((res) => resolve(res))
      .catch((err) => reject(err))
      .finally(() => clearTimeout(timer));
  });

const readProfiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("读取配置失败", e);
    return [];
  }
};

const writeProfiles = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("保存配置失败", e);
  }
};

const createProfileId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const initApiSettings = () => {
  const urlInput = document.getElementById("apiUrl");
  const keyInput = document.getElementById("apiKey");
  const modelSelect = document.getElementById("modelSelect");
  const fetchBtn = document.getElementById("btnFetchModels");
  const testBtn = document.getElementById("btnTest");
  const saveBtn = document.getElementById("btnSave");
  const profileList = document.getElementById("profileList");
  const testStatus = document.getElementById("testStatus");
  const savePopup = document.getElementById("savePopup");
  const saveNameInput = document.getElementById("saveNameInput");
  const saveCancelBtn = document.getElementById("btnSaveCancel");
  const saveConfirmBtn = document.getElementById("btnSaveConfirm");

  if (
    !urlInput ||
    !keyInput ||
    !modelSelect ||
    !fetchBtn ||
    !testBtn ||
    !saveBtn ||
    !profileList ||
    !testStatus ||
    !savePopup ||
    !saveNameInput ||
    !saveCancelBtn ||
    !saveConfirmBtn
  )
    return;

  const changeModelBy = (delta) => {
    const options = modelSelect.options;
    if (!options || options.length === 0) return;
    const current = modelSelect.selectedIndex < 0 ? 0 : modelSelect.selectedIndex;
    const next = Math.min(Math.max(current + delta, 0), options.length - 1);
    modelSelect.selectedIndex = next;
  };

  // 滚轮与触摸滑动支持
  modelSelect.addEventListener(
    "wheel",
    (e) => {
      const delta = e.deltaY > 0 ? 1 : -1;
      if (!modelSelect.matches(":focus")) {
        e.preventDefault();
        changeModelBy(delta);
      }
      // 若下拉已展开，交给原生滚动处理
    },
    { passive: false }
  );

  let touchStartY = null;
  modelSelect.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  });
  modelSelect.addEventListener("touchmove", (e) => {
    if (touchStartY === null) return;
    const diff = e.touches[0].clientY - touchStartY;
    if (Math.abs(diff) > 12) {
      changeModelBy(diff > 0 ? 1 : -1);
      touchStartY = e.touches[0].clientY;
    }
  });
  modelSelect.addEventListener("touchend", () => {
    touchStartY = null;
  });

  // 焦点时展开可滚动列表，失焦还原
  modelSelect.addEventListener("focus", () => {
    const visibleCount = Math.min(modelSelect.options.length || 1, 8);
    if (visibleCount > 1) {
      modelSelect.size = visibleCount;
      modelSelect.classList.add("is-expanded");
    }
  });
  modelSelect.addEventListener("blur", () => {
    modelSelect.size = 0;
    modelSelect.removeAttribute("size");
    modelSelect.classList.remove("is-expanded");
  });

  let currentProfileId = null;

  const ensureModelOption = (model) => {
    if (!model) return;
    const exists = Array.from(modelSelect.options).some((opt) => opt.value === model);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = model;
      opt.textContent = model;
      modelSelect.appendChild(opt);
    }
  };

  const closeDropdown = () => {
    profileList.classList.remove("open");
    const current = profileList.querySelector(".profile-current");
    if (current) current.setAttribute("aria-expanded", "false");
  };

  const openDropdown = () => {
    profileList.classList.add("open");
    const current = profileList.querySelector(".profile-current");
    if (current) current.setAttribute("aria-expanded", "true");
  };

  const switchProfileBy = (delta) => {
    const list = readProfiles();
    if (!list.length) return;
    const currentIdx = Math.max(
      0,
      list.findIndex((p) => p.id === currentProfileId)
    );
    const nextIdx = Math.min(
      Math.max(currentIdx + delta, 0),
      list.length - 1
    );
    const nextProfile = list[nextIdx];
    currentProfileId = nextProfile.id;
    applyProfile(nextProfile);
    renderProfiles(list, currentProfileId);
  };

  const renderProfiles = (list, activeId = currentProfileId) => {
    // 1. 强制父容器相对定位
    profileList.style.position = "relative"; 

    if (!list.length) {
      profileList.classList.remove("open");
      profileList.innerHTML = `<div class="profile-empty">暂无配置</div>`;
      return;
    }
    const active = list.find((p) => p.id === activeId) || list[0];
    currentProfileId = active.id;

    const dropdown = list
      .map(
        (p) => `<button class="profile-item${p.id === active.id ? " active" : ""}" data-id="${p.id}" role="option">
            <span class="profile-name">${p.name || "未命名"}</span>
            <span class="profile-desc">${p.model || "未选模型"}</span>
          </button>`
      )
      .join("");

    const expanded = profileList.classList.contains("open") ? "true" : "false";

    // 修正样式：确保下拉菜单可以滚动
    profileList.innerHTML = `
      <div class="profile-current" tabindex="0" role="button" aria-expanded="${expanded}">
        <div class="text">
          <span class="profile-name">${active.name || "未命名"}</span>
          <span class="profile-desc">${active.model || "未选模型"}</span>
        </div>
        <span class="caret">▾</span>
      </div>
      <div class="profile-dropdown" role="listbox" style="
          position: absolute; 
          top: 100%; 
          left: 0; 
          right: 0;
          z-index: 10000; 
          background: var(--bg-color, #fff); 
          border: 1px solid #ccc;
          max-height: 250px; 
          overflow-y: auto; 
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        ${dropdown}
      </div>
    `;
  };

  const applyProfile = (profile, silent = false) => {
    if (!profile) return;
    urlInput.value = profile.url || "";
    keyInput.value = profile.key || "";
    if (profile.model) {
      ensureModelOption(profile.model);
      modelSelect.value = profile.model;
    }
    if (!silent) {
      setStatus(testStatus, `已切换到配置：${profile.name || ""}`, "success");
    }
  };

  const bootstrapProfiles = () => {
    const list = readProfiles();
    if (list.length) {
      currentProfileId = list[0].id;
      applyProfile(list[0], true);
    }
    renderProfiles(list, currentProfileId);
  };

  const requireUrlKey = () => {
    const baseUrl = normalizeBaseUrl(urlInput.value);
    const apiKey = keyInput.value.trim();
    if (!baseUrl || !apiKey) {
      setStatus(testStatus, "请先填写地址与密钥", "error");
      return null;
    }
    return { baseUrl, apiKey };
  };

  const fillModels = (list, previousValue) => {
    modelSelect.innerHTML =
      `<option value="">请选择模型</option>` +
      list
        .map((m) => {
          const id = m?.id || m?.name || "";
          return id ? `<option value="${id}">${id}</option>` : "";
        })
        .join("");
    if (previousValue) {
      const found = Array.from(modelSelect.options).find(
        (opt) => opt.value === previousValue
      );
      if (found) modelSelect.value = previousValue;
    }
  };

  // 拉取模型列表（真实 OpenAI 兼容模式）
  fetchBtn.addEventListener("click", async () => {
    const required = requireUrlKey();
    if (!required) return;
    const { baseUrl, apiKey } = required;

    setStatus(testStatus, "拉取中…", "loading");
    fetchBtn.disabled = true;
    testBtn.disabled = true;

    try {
      const count = await withTimeout(async (signal) => {
        const resp = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal,
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} ${resp.statusText || ""}`.trim());
        }
        const data = await resp.json();
        const list = Array.isArray(data?.data) ? data.data : [];
        if (!list.length) throw new Error("未获取到模型列表");
        const previousValue = modelSelect.value;
        fillModels(list, previousValue);
        return list.length;
      });

      setStatus(testStatus, `模型列表已更新 (${count} 个)`, "success");
    } catch (err) {
      console.error("拉取模型失败", err);
      setStatus(testStatus, err.message || "拉取失败，请检查地址/密钥", "error");
    } finally {
      fetchBtn.disabled = false;
      testBtn.disabled = false;
    }
  });

  // 测试连接（真实探活：对选中模型发起最小 chat/completions）
  testBtn.addEventListener("click", async () => {
    const required = requireUrlKey();
    if (!required) return;
    const { baseUrl, apiKey } = required;
    const model = modelSelect.value || "";
    if (!model) {
      setStatus(testStatus, "请先选择模型后再测试", "error");
      return;
    }

    setStatus(testStatus, "测试中…", "loading");
    testBtn.disabled = true;
    fetchBtn.disabled = true;

    try {
      const message = await withTimeout(async (signal) => {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "hello" }],
            max_tokens: 16,
            stream: false,
          }),
          signal,
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status} ${resp.statusText || ""}`.trim());
        }
        const data = await resp.json();
        const content =
          data?.choices?.[0]?.message?.content ||
          data?.choices?.[0]?.delta?.content ||
          "";
        return content;
      });

      setStatus(
        testStatus,
        message ? "连接正常，模型可用" : "连接正常，已响应",
        "success"
      );
    } catch (err) {
      console.error("测试连接失败", err);
      setStatus(testStatus, err.message || "连接失败，请检查地址/密钥/模型", "error");
    } finally {
      testBtn.disabled = false;
      fetchBtn.disabled = false;
    }
  });

  const openSavePopup = () => {
    savePopup.classList.add("active");
    savePopup.setAttribute("aria-hidden", "false");
    saveNameInput.value = "";
    requestAnimationFrame(() => saveNameInput.focus());
  };

  const closeSavePopup = () => {
    savePopup.classList.remove("active");
    savePopup.setAttribute("aria-hidden", "true");
  };

  // 点击"保存配置"弹出命名框
  saveBtn.addEventListener("click", () => {
    const { baseUrl, apiKey } = requireUrlKey() || {};
    if (!baseUrl || !apiKey) return;
    openSavePopup();
  });

  saveCancelBtn.addEventListener("click", () => closeSavePopup());

  // 确认保存配置到本地并生成可切换列表
  saveConfirmBtn.addEventListener("click", () => {
    const required = requireUrlKey();
    if (!required) return;
    const { baseUrl, apiKey } = required;

    const name = saveNameInput.value;
    if (!name || !name.trim()) {
      setStatus(testStatus, "已取消保存（未填写名称）", "error");
      return;
    }

    const model = modelSelect.value || "";
    const trimmedName = name.trim();

    const list = readProfiles();
    const existing = list.find((p) => p.name === trimmedName);
    const profile = {
      id: existing?.id || createProfileId(),
      name: trimmedName,
      url: baseUrl,
      key: apiKey,
      model,
    };

    const nextList = existing
      ? list.map((p) => (p.id === existing.id ? profile : p))
      : [...list, profile];

    writeProfiles(nextList);
    currentProfileId = profile.id;
    renderProfiles(nextList, currentProfileId);
    setStatus(testStatus, `已保存配置：${trimmedName}`, "success");
    closeSavePopup();
  });

  // 点击弹窗外关闭
  savePopup.addEventListener("click", (e) => {
    if (e.target === savePopup) closeSavePopup();
  });

  // 鼠标滚轮切换配置（在标题区域滚轮，展开状态下滚动列表本身不会触发）
  profileList.addEventListener(
    "wheel",
    (e) => {
      const delta = e.deltaY > 0 ? 1 : -1;
      const isDropdownArea = e.target.closest(".profile-dropdown");
      // 若在可滚动的下拉区域内，允许原生滚动，不切换
      if (profileList.classList.contains("open") && isDropdownArea) {
        return;
      }
      e.preventDefault();
      switchProfileBy(delta);
    },
    { passive: false }
  );

  // ==========================================
  // 【核心修复】配置列表交互：展开/收起、选择
  // ==========================================
  profileList.addEventListener("click", (e) => {
    const current = e.target.closest(".profile-current");
    const item = e.target.closest(".profile-item");
    const dropdown = e.target.closest(".profile-dropdown"); // 🔑 关键添加

    if (item) {
      const id = item.dataset.id;
      const list = readProfiles();
      const profile = list.find((p) => p.id === id);
      if (!profile) return;
      currentProfileId = id;
      applyProfile(profile);
      renderProfiles(list, currentProfileId);
      closeDropdown();
      return;
    }

    // 🔑 关键修复：如果点击的是下拉菜单区域（滚动条或空白处），不做任何操作
    if (dropdown && !item) {
      e.stopPropagation(); // 阻止事件冒泡
      return; // 允许滚动，不关闭菜单
    }

    if (current) {
      if (profileList.classList.contains("open")) {
        closeDropdown();
      } else {
        openDropdown();
      }
    }
  });

  // 键盘操作：Enter/Space 展开或选择
  profileList.addEventListener("keydown", (e) => {
    const isEnter = e.key === "Enter";
    const isSpace = e.key === " ";
    if (!isEnter && !isSpace) return;

    const current = e.target.closest(".profile-current");
    const item = e.target.closest(".profile-item");

    if (item) {
      e.preventDefault();
      item.click();
      return;
    }

    if (current) {
      e.preventDefault();
      current.click();
    }
  });

  // 点击弹窗外关闭列表
  document.addEventListener("click", (e) => {
    if (!profileList.contains(e.target)) {
      closeDropdown();
    }
  });

  // 🔑 新增：阻止下拉菜单内的触摸滚动事件冒泡
  profileList.addEventListener("touchmove", (e) => {
    const dropdown = e.target.closest(".profile-dropdown");
    if (dropdown) {
      e.stopPropagation(); // 阻止触摸滚动事件冒泡
    }
  }, { passive: true });

  bootstrapProfiles();
};
