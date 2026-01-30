import { DEFAULT_SOUND_SOURCES, DEFAULT_SOUND_SETTINGS } from "./soundDefaults.js";

class AudioManager {
  constructor() {
    // 音频池大小 - 允许快速连续播放
    this.poolSize = 3;
    
    // UI音频池
    this.uiPool = [];
    this.uiPoolIndex = 0;
    
    // 消息音频池
    this.messagePool = [];
    this.messagePoolIndex = 0;
    
    // 缓存当前音频源URL
    this.cachedUiSrc = "";
    this.cachedMessageSrc = "";
    
    // 缓存设置
    this.cachedSettings = null;
    this.settingsVersion = 0;
    
    // 初始化音频池
    this.initPools();
  }

  // 初始化音频池
  initPools() {
    for (let i = 0; i < this.poolSize; i++) {
      const uiAudio = new Audio();
      uiAudio.preload = "auto";
      this.uiPool.push(uiAudio);
      
      const msgAudio = new Audio();
      msgAudio.preload = "auto";
      this.messagePool.push(msgAudio);
    }
  }

  // 预加载音频文件
  preload() {
    const settings = this.getSavedSettings();
    const uiSrc = this.getSourceUrl("ui", settings);
    const msgSrc = this.getSourceUrl("message", settings);
    
    this.updatePoolSrc(this.uiPool, uiSrc, "ui");
    this.updatePoolSrc(this.messagePool, msgSrc, "message");
  }

  // 更新音频池的源
  updatePoolSrc(pool, src, type) {
    const cachedKey = type === "ui" ? "cachedUiSrc" : "cachedMessageSrc";
    
    if (this[cachedKey] !== src) {
      this[cachedKey] = src;
      pool.forEach(audio => {
        audio.src = src;
        // 触发预加载
        audio.load();
      });
    }
  }

  getSavedSettings() {
    try {
      const raw = localStorage.getItem("soundSettings");
      if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        ui: { ...DEFAULT_SOUND_SETTINGS.ui, ...parsed.ui },
        message: { ...DEFAULT_SOUND_SETTINGS.message, ...parsed.message },
      };
    } catch (err) {
      return { ...DEFAULT_SOUND_SETTINGS };
    }
  }

  getSourceUrl(type, settings) {
    const target = type === "message" ? settings.message : settings.ui;
    if (target.source === "custom" && target.customDataUrl) {
      return target.customDataUrl;
    }
    return type === "message"
      ? DEFAULT_SOUND_SOURCES.message
      : DEFAULT_SOUND_SOURCES.uiClick;
  }

  // 从池中获取下一个可用的音频实例
  getNextAudio(type) {
    if (type === "message") {
      const audio = this.messagePool[this.messagePoolIndex];
      this.messagePoolIndex = (this.messagePoolIndex + 1) % this.poolSize;
      return audio;
    } else {
      const audio = this.uiPool[this.uiPoolIndex];
      this.uiPoolIndex = (this.uiPoolIndex + 1) % this.poolSize;
      return audio;
    }
  }

  // 刷新设置并更新音频源
  refreshSettings() {
    const settings = this.getSavedSettings();
    const uiSrc = this.getSourceUrl("ui", settings);
    const msgSrc = this.getSourceUrl("message", settings);
    
    this.updatePoolSrc(this.uiPool, uiSrc, "ui");
    this.updatePoolSrc(this.messagePool, msgSrc, "message");
    
    this.cachedSettings = settings;
  }

  play(type, options = {}) {
    if (!options.userInitiated && type === "ui") {
      return;
    }

    const settings = this.getSavedSettings();
    const target = type === "message" ? settings.message : settings.ui;
    
    // 检查是否启用
    if (!target.enabled || target.volume <= 0) {
      return;
    }

    // 检查并更新音频源
    const sourceUrl = this.getSourceUrl(type, settings);
    const pool = type === "message" ? this.messagePool : this.uiPool;
    this.updatePoolSrc(pool, sourceUrl, type);

    // 获取下一个可用的音频实例
    const audio = this.getNextAudio(type);
    
    // 设置音量并播放
    audio.volume = target.volume;
    audio.currentTime = 0;
    
    // 使用 Promise 处理播放
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // 忽略播放错误（如用户未交互）
      });
    }
  }
}

let instance = null;

export const getAudioManager = () => {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
};
