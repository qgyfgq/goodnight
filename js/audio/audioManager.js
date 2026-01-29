import { DEFAULT_SOUND_SOURCES, DEFAULT_SOUND_SETTINGS } from "./soundDefaults.js";

class AudioManager {
  constructor() {
    this.uiAudio = new Audio();
    this.messageAudio = new Audio();
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

  applyAudioState(audio, target, sourceUrl) {
    if (!target.enabled || target.volume <= 0) {
      audio.pause();
      return false;
    }
    audio.src = sourceUrl;
    audio.volume = target.volume;
    return true;
  }

  play(type, options = {}) {
    if (!options.userInitiated && type === "ui") {
      return;
    }

    const settings = this.getSavedSettings();
    const sourceUrl = this.getSourceUrl(type, settings);
    const target = type === "message" ? settings.message : settings.ui;
    const audio = type === "message" ? this.messageAudio : this.uiAudio;

    const canPlay = this.applyAudioState(audio, target, sourceUrl);
    if (!canPlay) return;

    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

let instance = null;

export const getAudioManager = () => {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
};
