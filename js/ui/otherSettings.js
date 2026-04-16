const STORAGE_KEY = "xinliaoNearbyTone";
const DEFAULT_TONE = 6;

const clampTone = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return DEFAULT_TONE;
  return Math.max(0, Math.min(10, Math.round(num)));
};

export const getNearbyToneSetting = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return clampTone(raw ?? DEFAULT_TONE);
};

export const initOtherSettings = () => {
  const range = document.getElementById("nearbyToneRange");
  const valueEl = document.getElementById("nearbyToneValue");
  if (!range || !valueEl) return;

  const applyTone = (tone) => {
    const safe = clampTone(tone);
    range.value = String(safe);
    valueEl.textContent = String(safe);
    localStorage.setItem(STORAGE_KEY, String(safe));
  };

  // 初始化
  applyTone(getNearbyToneSetting());

  range.addEventListener("input", (e) => {
    applyTone(e.target.value);
  });
};
