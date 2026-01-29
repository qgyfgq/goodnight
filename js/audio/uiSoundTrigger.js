import { getAudioManager } from "./audioManager.js";

const CLICKABLE_SELECTOR =
  "button, .app, .player-btn, .settings-item, .settings-link, input, select, .switch";

const isClickInsideDevice = (target) => {
  return target.closest(".device");
};

export const initUiSoundTrigger = () => {
  const audioManager = getAudioManager();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!isClickInsideDevice(target)) return;

    const clickable = target.closest(CLICKABLE_SELECTOR);
    if (!clickable) return;

    audioManager.play("ui", { userInitiated: true });
  });
};
