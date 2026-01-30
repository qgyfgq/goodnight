const DEFAULT_TIMEOUT = 8000;
const STORAGE_KEY = "apiProfiles";
const ACTIVE_PROFILE_KEY = "apiActiveProfile";

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
  const testStatus = document.getElementById("testStatus");
  const savePopup = document.getElementById("savePopup");
  const saveNameInput = document.getElementById("saveNameInput");
  const saveCancelBtn = document.getElementById("btnSaveCancel");
  const saveConfirmBtn = document.getElementById("btnSaveConfirm");
  
  // 新增的配置选择器元素
  const profileSelect = document.getElementById("profileSelect");
  const applyProfileBtn = document.getElementById("btnApplyProfile");
  const deleteProfileBtn = document.getElementById("btnDeleteProfile");

  if (
    !urlInput ||
    !keyInput ||
    !modelSelect ||
    !fetchBtn ||
    !testBtn ||
    !saveBtn ||
    !testStatus ||
    !savePopup ||
    !saveNameInput ||
    !saveCancelBtn ||
    !saveConfirmBtn ||
    !profileSelect ||
    !applyProfileBtn ||
    !deleteProfileBtn
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

  // 渲染配置下拉选择器
  const renderProfileSelect = (list, activeId = currentProfileId) => {
    profileSelect.innerHTML = `<option value="">-- 选择配置 --</option>`;
    list.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.model || "未选模型"})`;
      if (p.id === activeId) {
        opt.selected = true;
      }
      profileSelect.appendChild(opt);
    });
  };

  const applyProfile = (profile, silent = false) => {
    if (!profile) return;
    urlInput.value = profile.url || "";
    keyInput.value = profile.key || "";
    if (profile.model) {
      ensureModelOption(profile.model);
      modelSelect.value = profile.model;
    }
    currentProfileId = profile.id;
    // 保存活动配置ID到localStorage
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    // 同步更新配置选择器的选中状态
    profileSelect.value = profile.id;
    if (!silent) {
      setStatus(testStatus, `已应用配置：${profile.name || ""}`, "success");
    }
  };

  // 当模型选择变化时，自动更新当前配置
  const updateCurrentProfileModel = () => {
    if (!currentProfileId) return;
    
    const model = modelSelect.value;
    if (!model) return;
    
    const list = readProfiles();
    const profileIndex = list.findIndex((p) => p.id === currentProfileId);
    if (profileIndex === -1) return;
    
    // 更新配置中的模型
    list[profileIndex].model = model;
    writeProfiles(list);
    
    // 更新下拉选择器中的显示文本
    renderProfileSelect(list, currentProfileId);
  };

  // 监听模型选择变化
  modelSelect.addEventListener("change", () => {
    updateCurrentProfileModel();
  });

  const bootstrapProfiles = () => {
    const list = readProfiles();
    // 读取保存的活动配置ID
    const savedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    let activeProfile = null;
    
    if (savedActiveId) {
      activeProfile = list.find((p) => p.id === savedActiveId);
    }
    // 如果没有保存的或找不到，使用第一个
    if (!activeProfile && list.length) {
      activeProfile = list[0];
    }
    
    if (activeProfile) {
      currentProfileId = activeProfile.id;
      applyProfile(activeProfile, true);
    }
    renderProfileSelect(list, currentProfileId);
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

  // 拉取模型列表
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

  // 测试连接
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

  // 应用选中的配置
  applyProfileBtn.addEventListener("click", () => {
    const selectedId = profileSelect.value;
    if (!selectedId) {
      setStatus(testStatus, "请先选择一个配置", "error");
      return;
    }
    const list = readProfiles();
    const profile = list.find((p) => p.id === selectedId);
    if (!profile) {
      setStatus(testStatus, "配置不存在", "error");
      return;
    }
    applyProfile(profile);
    renderProfileSelect(list, selectedId);
  });

  // 删除选中的配置
  deleteProfileBtn.addEventListener("click", () => {
    const selectedId = profileSelect.value;
    if (!selectedId) {
      setStatus(testStatus, "请先选择要删除的配置", "error");
      return;
    }
    const list = readProfiles();
    const profile = list.find((p) => p.id === selectedId);
    if (!profile) {
      setStatus(testStatus, "配置不存在", "error");
      return;
    }
    
    if (!confirm(`确定要删除配置"${profile.name}"吗？`)) {
      return;
    }
    
    const newList = list.filter((p) => p.id !== selectedId);
    writeProfiles(newList);
    
    // 如果删除的是当前配置，清空当前配置ID和localStorage中的记录
    if (currentProfileId === selectedId) {
      currentProfileId = null;
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
    
    renderProfileSelect(newList, currentProfileId);
    setStatus(testStatus, `已删除配置：${profile.name}`, "success");
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

  // 确认保存配置
  saveConfirmBtn.addEventListener("click", () => {
    const required = requireUrlKey();
    if (!required) return;
    const { baseUrl, apiKey } = required;

    const name = saveNameInput.value;
    if (!name || !name.trim()) {
      setStatus(testStatus, "已取消保存（未填写名称）", "error");
      closeSavePopup();
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
    renderProfileSelect(nextList, currentProfileId);
    setStatus(testStatus, `已保存配置：${trimmedName}`, "success");
    closeSavePopup();
  });

  // 点击弹窗外关闭
  savePopup.addEventListener("click", (e) => {
    if (e.target === savePopup) closeSavePopup();
  });

  bootstrapProfiles();
};
