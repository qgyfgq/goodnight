/**
 * 状态栏组件：显示时间和电池电量
 */

const padZero = (n) => (n < 10 ? `0${n}` : `${n}`);

const formatTime = () => {
  const now = new Date();
  const hh = padZero(now.getHours());
  const mm = padZero(now.getMinutes());
  return `${hh}:${mm}`;
};

const getBatteryStatus = async () => {
  try {
    const battery = await navigator.getBattery?.() || await navigator.battery?.();
    if (!battery) {
      return { level: Math.random() * 100 | 0, charging: false };
    }
    return {
      level: Math.round(battery.level * 100),
      charging: battery.charging
    };
  } catch {
    // 回退方案：显示随机电量（仅用于演示）
    return { level: Math.random() * 100 | 0, charging: false };
  }
};

const updateBatteryRing = (percentage, element) => {
  const circle = element.querySelector('.battery-circle');
  if (!circle) return;

  // 计算 stroke-dashoffset（141.37 是周长）
  const circumference = 141.37;
  const offset = circumference * (1 - percentage / 100);
  circle.style.strokeDashoffset = offset;

  // 根据电量改变颜色
  circle.classList.remove('charge-high', 'charge-mid', 'charge-low');
  if (percentage > 50) {
    circle.classList.add('charge-high');
  } else if (percentage > 20) {
    circle.classList.add('charge-mid');
  } else {
    circle.classList.add('charge-low');
  }
};

export const initStatusBar = async () => {
  const timeEl = document.getElementById('statusTime');
  const percentageEl = document.getElementById('batteryPercentage');
  const chargingEl = document.getElementById('chargingIcon');
  const batteryWidget = document.querySelector('.battery-widget');

  if (!timeEl || !percentageEl || !batteryWidget) return;

  const updateTime = () => {
    timeEl.textContent = formatTime();
  };

  const updateBattery = async () => {
    const { level, charging } = await getBatteryStatus();
    percentageEl.textContent = `${level}%`;
    chargingEl.style.display = charging ? 'block' : 'none';
    updateBatteryRing(level, batteryWidget);
  };

  // 初始化
  updateTime();
  updateBattery();

  // 每分钟更新时间
  setInterval(updateTime, 60 * 1000);

  // 每 2 秒更新电池（或监听电池事件）
  setInterval(updateBattery, 2000);

  // 如果浏览器支持电池 API 事件
  if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
    });
  }
};
