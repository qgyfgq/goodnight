/**
 * 时间小组件：负责显示并每分钟更新当前时间
 */
const padZero = (n) => (n < 10 ? `0${n}` : `${n}`);

const formatTime = () => {
  const now = new Date();
  const hh = padZero(now.getHours());
  const mm = padZero(now.getMinutes());
  return `${hh}:${mm}`;
};

export const initTimeWidget = (el) => {
  if (!el) return;
  const update = () => {
    el.textContent = formatTime();
  };
  update();
  // 每分钟更新一次
  setInterval(update, 60 * 1000);
};
