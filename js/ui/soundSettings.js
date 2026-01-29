import { DEFAULT_SOUND_SETTINGS } from "../audio/soundDefaults.js";

const STORAGE_KEY = "soundSettings";

const getStoredSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ui: { ...DEFAULT_SOUND_SETTINGS.ui, ...parsed.ui },
      message: { ...DEFAULT_SOUND_SETTINGS.message, ...parsed.message },
    };
  } catch (err) {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
};

const saveSettings = (settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const formatVolume = (value) => `${Math.round(value * 100)}%`;

const bindSection = (prefix, settings, audioType) => {
  const enable = document.getElementById(`${prefix}SoundEnable`);
  const volume = document.getElementById(`${prefix}SoundVolume`);
  const volumeValue = document.getElementById(`${prefix}SoundVolumeValue`);
  const source = document.getElementById(`${prefix}SoundSource`);
  const file = document.getElementById(`${prefix}SoundFile`);
  const hint = document.getElementById(`${prefix}SoundFileHint`);

  if (!enable || !volume || !volumeValue || !source || !file || !hint) {
    return;
  }

  enable.checked = settings.enabled;
  volume.value = settings.volume;
  volumeValue.textContent = formatVolume(settings.volume);
  source.value = settings.source;
  hint.textContent = settings.customName
    ? `已选择：${settings.customName}`
    : "未上传时使用默认音频";

  const updateSettings = () => {
    const current = getStoredSettings();
    current[audioType] = {
      ...current[audioType],
      enabled: enable.checked,
      volume: Number(volume.value),
      source: source.value,
    };
    saveSettings(current);
  };

  enable.addEventListener("change", updateSettings);

  volume.addEventListener("input", () => {
    volumeValue.textContent = formatVolume(Number(volume.value));
  });

  volume.addEventListener("change", updateSettings);

  source.addEventListener("change", updateSettings);

  file.addEventListener("change", () => {
    const selected = file.files && file.files[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onload = () => {
      const current = getStoredSettings();
      current[audioType] = {
        ...current[audioType],
        customDataUrl: reader.result,
        customName: selected.name,
        source: "custom",
      };
      saveSettings(current);
      source.value = "custom";
      hint.textContent = `已选择：${selected.name}`;
    };
    reader.readAsDataURL(selected);
  });
};

const setupDetailNavigation = () => {
  const soundSection = document.getElementById("soundSettings");
  const mainList = document.getElementById("soundSettingsMain");
  const uiEntry = document.getElementById("uiSoundEntry");
  const msgEntry = document.getElementById("msgSoundEntry");
  const uiDetail = document.getElementById("uiSoundDetail");
  const msgDetail = document.getElementById("msgSoundDetail");
  const backButton = document.getElementById("settingsBack");
  const title = document.getElementById("settingsTitle");
  const entryButton = document.getElementById("soundSettingsEntry");

  if (
    !soundSection ||
    !mainList ||
    !uiEntry ||
    !msgEntry ||
    !uiDetail ||
    !msgDetail ||
    !backButton ||
    !title
  ) {
    return;
  }

  const showList = () => {
    mainList.classList.add("active");
    uiDetail.classList.remove("active");
    msgDetail.classList.remove("active");
    soundSection.dataset.detail = "list";
    if (soundSection.classList.contains("active")) {
      title.textContent = "提示音设置";
    }
  };

  const showDetail = (type) => {
    mainList.classList.remove("active");
    uiDetail.classList.toggle("active", type === "ui");
    msgDetail.classList.toggle("active", type === "message");
    soundSection.dataset.detail = "detail";
    if (soundSection.classList.contains("active")) {
      title.textContent = type === "ui" ? "UI 提示音" : "消息提示音";
    }
  };

  uiEntry.addEventListener("click", () => showDetail("ui"));
  msgEntry.addEventListener("click", () => showDetail("message"));

  entryButton?.addEventListener("click", showList);

  backButton.addEventListener(
    "click",
    (event) => {
      if (
        soundSection.classList.contains("active") &&
        soundSection.dataset.detail === "detail"
      ) {
        event.stopImmediatePropagation();
        showList();
      }
    },
    true
  );

  showList();
};

export const initSoundSettings = () => {
  const settings = getStoredSettings();
  bindSection("ui", settings.ui, "ui");
  bindSection("msg", settings.message, "message");
  setupDetailNavigation();
};
