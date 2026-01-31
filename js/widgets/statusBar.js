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

// 缓存电池对象和状态
let batteryInstance = null;
let lastBatteryStatus = { level: 100, charging: false };

// 初始化电池 API
const initBattery = async () => {
  try {
    if (navigator.getBattery) {
      batteryInstance = await navigator.getBattery();
    } else if (navigator.battery) {
      batteryInstance = navigator.battery;
    }
  } catch (e) {
    console.log('Battery API not supported');
  }
  return batteryInstance;
};

// 从电池对象获取状态
const getBatteryFromInstance = () => {
  if (!batteryInstance) {
    return lastBatteryStatus;
  }
  lastBatteryStatus = {
    level: Math.round(batteryInstance.level * 100),
    charging: batteryInstance.charging
  };
  return lastBatteryStatus;
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

  const updateBattery = () => {
    const { level, charging } = getBatteryFromInstance();
    percentageEl.textContent = `${level}%`;
    if (chargingEl) {
      chargingEl.style.display = charging ? 'block' : 'none';
    }
    updateBatteryRing(level, batteryWidget);
  };

  // 初始化时间
  updateTime();

  // 初始化电池 API
  await initBattery();
  
  // 初始化电池显示
  updateBattery();

  // 每分钟更新时间
  setInterval(updateTime, 60 * 1000);

  // 如果有电池实例，监听事件实现实时更新
  if (batteryInstance) {
    // 监听电量变化
    batteryInstance.addEventListener('levelchange', () => {
      updateBattery();
    });
    
    // 监听充电状态变化
    batteryInstance.addEventListener('chargingchange', () => {
      updateBattery();
    });
    
    // 监听充电时间变化（可选）
    batteryInstance.addEventListener('chargingtimechange', () => {
      updateBattery();
    });
    
    // 监听放电时间变化（可选）
    batteryInstance.addEventListener('dischargingtimechange', () => {
      updateBattery();
    });
  }

  // 备用：每 30 秒轮询更新（防止事件不触发的情况）
  setInterval(updateBattery, 30 * 1000);
};
