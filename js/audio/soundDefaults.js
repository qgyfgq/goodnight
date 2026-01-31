export const DEFAULT_SOUND_SOURCES = {
  uiClick: "assets/sounds/ui-click.mp3",
  // 暂时使用 ui-click.mp3 作为消息提示音的占位
  message: "assets/sounds/ui-click.mp3",
};

export const DEFAULT_SOUND_SETTINGS = {
  ui: {
    enabled: true,
    volume: 0.6,
    source: "default",
    customDataUrl: "",
    customName: "",
  },
  message: {
    enabled: true,
    volume: 0.6,
    source: "default",
    customDataUrl: "",
    customName: "",
  },
};
