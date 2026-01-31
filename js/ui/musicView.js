/**
 * 音乐视图模块
 * 管理音乐播放器界面
 */

import {
  initMusicDB,
  addSong,
  getAllSongs,
  searchSongs,
  getPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  getSongData,
  formatDuration
} from '../music/musicData.js';

import {
  searchOnline,
  getPlayUrl,
  getLyrics,
  formatDuration as formatOnlineDuration
} from '../music/musicApi.js';

import {
  saveSettingToIDB,
  loadSettingFromIDB
} from '../storage/indexedDB.js';

// 状态
let isPlaying = false;
let currentSong = null;
let currentIndex = -1;
let playlist = [];
let audioElement = null;
let currentTab = 'local';
let showLyrics = false;
// 播放模式: 'list' 列表循环, 'single' 单曲循环, 'shuffle' 随机播放
let playMode = 'list';
// 缓存在线搜索结果
let onlineSearchResults = [];
let lastSearchKeyword = '';

/**
 * 初始化音乐视图
 */
export async function initMusicView() {
  const musicView = document.getElementById('musicView');
  if (!musicView) return;

  // 初始化音乐数据库
  try {
    await initMusicDB();
    console.log('音乐数据库初始化成功');
  } catch (e) {
    console.error('音乐数据库初始化失败:', e);
  }

  // 创建音频元素
  audioElement = new Audio();
  audioElement.addEventListener('timeupdate', updateProgress);
  audioElement.addEventListener('ended', handleSongEnd);
  audioElement.addEventListener('loadedmetadata', updateTotalTime);

  // 绑定返回按钮
  const backBtn = document.getElementById('musicBack');
  if (backBtn) {
    backBtn.addEventListener('click', closeMusicView);
  }

  // 绑定搜索按钮
  const searchBtn = document.getElementById('musicSearchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', openSearchPanel);
  }

  // 绑定播放控制
  const playBtn = document.getElementById('musicPlayBtn');
  if (playBtn) {
    playBtn.addEventListener('click', togglePlay);
  }

  // 绑定上一首/下一首
  const prevBtn = document.getElementById('musicPrevBtn');
  const nextBtn = document.getElementById('musicNextBtn');
  if (prevBtn) prevBtn.addEventListener('click', playPrev);
  if (nextBtn) nextBtn.addEventListener('click', playNext);

  // 绑定播放列表按钮
  const listBtn = document.querySelector('.music-controls .music-ctrl-btn.small:last-child');
  if (listBtn) {
    listBtn.addEventListener('click', openPlaylistPanel);
  }

  // 绑定播放模式按钮
  const modeBtn = document.getElementById('musicModeBtn');
  if (modeBtn) {
    modeBtn.addEventListener('click', togglePlayMode);
  }

  // 绑定唱片点击打开外观设置
  const discLarge = document.getElementById('musicDiscLarge');
  if (discLarge) {
    discLarge.addEventListener('click', openMusicAppearanceSettings);
  }

  // 初始化搜索面板
  initSearchPanel();

  // 绑定主页唱片点击
  bindDiscClick();

  // 绑定主页控制按钮
  bindHomePlayerControls();

  // 绑定进度条拖动
  bindProgressBarDrag();

  // 加载播放列表
  await loadPlaylist();
  
  // 加载保存的外观设置
  loadMusicAppearance();
}

/**
 * 绑定主页唱片点击事件
 */
function bindDiscClick() {
  const musicPlayer = document.querySelector('.music-player');
  if (musicPlayer) {
    musicPlayer.addEventListener('click', (e) => {
      if (e.target.closest('.player-controls')) return;
      openMusicView();
    });
  }
}

/**
 * 打开音乐视图
 */
export function openMusicView() {
  const musicView = document.getElementById('musicView');
  const homeView = document.getElementById('homeView');
  
  if (musicView) {
    musicView.classList.add('active');
  }
  if (homeView) {
    homeView.style.display = 'none';
  }
}

/**
 * 关闭音乐视图
 */
function closeMusicView() {
  const musicView = document.getElementById('musicView');
  const homeView = document.getElementById('homeView');
  
  if (musicView) {
    musicView.classList.remove('active');
  }
  if (homeView) {
    homeView.style.display = '';
  }
}

/**
 * 切换播放状态
 */
async function togglePlay() {
  if (!currentSong && playlist.length > 0) {
    // 如果没有当前歌曲但有播放列表，播放第一首
    await playSongAtIndex(0);
    return;
  }
  
  if (!currentSong) {
    console.log('没有可播放的歌曲');
    return;
  }
  
  if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
  } else {
    audioElement.play();
    isPlaying = true;
  }
  
  updatePlayButton();
  updateDiscAnimation();
}

/**
 * 播放指定索引的歌曲
 */
async function playSongAtIndex(index) {
  if (index < 0 || index >= playlist.length) return;
  
  currentIndex = index;
  const item = playlist[index];
  
  try {
    let songData = await getSongData(item.id);
    
    // 如果是在线歌曲且没有找到数据，或者需要刷新播放地址
    if (!songData && item.id.startsWith('online_')) {
      console.log('在线歌曲数据不存在，尝试重新获取播放地址');
      const rid = item.id.replace('online_', '');
      songData = await refreshOnlineSongUrl(item, rid);
    }
    
    if (!songData) {
      console.error('找不到歌曲数据');
      showToast('无法播放此歌曲');
      return;
    }
    
    currentSong = songData;
    
    // 尝试播放，如果失败则可能是在线歌曲地址过期
    try {
      audioElement.src = songData.data;
      await audioElement.play();
      isPlaying = true;
    } catch (playError) {
      // 如果是在线歌曲，尝试刷新播放地址
      if (songData.isOnline) {
        console.log('播放失败，尝试刷新在线歌曲地址');
        showToast('正在刷新播放地址...');
        const rid = songData.rid || item.id.replace('online_', '');
        const refreshedData = await refreshOnlineSongUrl(item, rid);
        if (refreshedData) {
          currentSong = refreshedData;
          audioElement.src = refreshedData.data;
          await audioElement.play();
          isPlaying = true;
        } else {
          throw new Error('无法刷新播放地址');
        }
      } else {
        throw playError;
      }
    }
    
    updateSongInfo();
    updatePlayButton();
    updateDiscAnimation();
  } catch (e) {
    console.error('播放歌曲失败:', e);
    showToast('播放失败');
  }
}

/**
 * 刷新在线歌曲的播放地址
 */
async function refreshOnlineSongUrl(item, rid) {
  try {
    const playUrl = await getPlayUrl(rid);
    if (!playUrl) {
      return null;
    }
    
    // 创建更新后的歌曲对象
    const refreshedSong = {
      id: item.id,
      rid: rid,
      name: item.name,
      artist: item.artist,
      cover: item.cover || '',
      data: playUrl,
      isOnline: true,
      duration: item.duration || 0
    };
    
    // 更新缓存
    const { saveOnlineSong } = await import('../music/musicData.js');
    await saveOnlineSong(refreshedSong);
    
    return refreshedSong;
  } catch (e) {
    console.error('刷新在线歌曲地址失败:', e);
    return null;
  }
}

/**
 * 上一首
 */
function playPrev() {
  if (playlist.length === 0) return;
  
  let newIndex = currentIndex - 1;
  if (newIndex < 0) newIndex = playlist.length - 1;
  
  playSongAtIndex(newIndex);
}

/**
 * 下一首
 */
function playNext() {
  if (playlist.length === 0) return;
  
  let newIndex = currentIndex + 1;
  if (newIndex >= playlist.length) newIndex = 0;
  
  playSongAtIndex(newIndex);
}

/**
 * 歌曲播放结束
 */
function handleSongEnd() {
  if (playMode === 'single') {
    // 单曲循环
    audioElement.currentTime = 0;
    audioElement.play();
  } else if (playMode === 'shuffle') {
    // 随机播放
    playRandomNext();
  } else {
    // 列表循环
    playNext();
  }
}

/**
 * 随机播放下一首
 */
function playRandomNext() {
  if (playlist.length === 0) return;
  if (playlist.length === 1) {
    playSongAtIndex(0);
    return;
  }
  
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * playlist.length);
  } while (newIndex === currentIndex);
  
  playSongAtIndex(newIndex);
}

/**
 * 切换播放模式
 */
function togglePlayMode() {
  const modes = ['list', 'single', 'shuffle'];
  const currentModeIndex = modes.indexOf(playMode);
  playMode = modes[(currentModeIndex + 1) % modes.length];
  
  updatePlayModeButton();
  
  // 显示提示
  const modeNames = {
    list: '列表循环',
    single: '单曲循环',
    shuffle: '随机播放'
  };
  showToast(modeNames[playMode]);
}

/**
 * 更新播放模式按钮图标
 */
function updatePlayModeButton() {
  const modeBtn = document.getElementById('musicModeBtn');
  if (!modeBtn) return;
  
  const icons = {
    list: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    single: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 7l-5-5-5 5"/><text x="12" y="16" font-size="8" text-anchor="middle" fill="currentColor">1</text></svg>',
    shuffle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>'
  };
  
  modeBtn.innerHTML = icons[playMode];
}

/**
 * 打开音乐外观设置面板
 */
async function openMusicAppearanceSettings() {
  const musicView = document.getElementById('musicView');
  if (!musicView) return;
  
  // 检查设置面板是否存在
  let settingsPanel = document.getElementById('musicAppearancePanel');
  
  if (!settingsPanel) {
    settingsPanel = document.createElement('div');
    settingsPanel.id = 'musicAppearancePanel';
    settingsPanel.className = 'music-appearance-panel';
    musicView.appendChild(settingsPanel);
  }
  
  // 从 IndexedDB 获取当前设置
  let savedBg = '';
  let savedDiscImg = '';
  try {
    savedBg = await loadSettingFromIDB('musicViewBackground', '');
    savedDiscImg = await loadSettingFromIDB('musicDiscImage', '');
  } catch (e) {
    console.error('加载外观设置失败:', e);
  }
  
  settingsPanel.innerHTML = `
    <header class="music-appearance-header">
      <button class="music-appearance-back" id="musicAppearanceBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="music-appearance-title">外观设置</div>
      <div class="music-appearance-spacer"></div>
    </header>
    <div class="music-appearance-content">
      <div class="music-appearance-section">
        <h3 class="music-appearance-subtitle">🎨 背景设置</h3>
        <div class="music-appearance-field">
          <label>背景图片链接</label>
          <input type="text" id="musicBgUrlInput" placeholder="https://..." value="${savedBg}" />
        </div>
        <div class="music-appearance-field">
          <label>或上传图片</label>
          <input type="file" id="musicBgFileInput" accept="image/*" class="music-appearance-file" />
        </div>
        <div class="music-appearance-preview" id="musicBgPreview">
          ${savedBg ? `<img src="${savedBg}" alt="背景预览" />` : '<span>背景预览</span>'}
        </div>
      </div>
      
      <div class="music-appearance-section">
        <h3 class="music-appearance-subtitle">💿 唱片图片</h3>
        <div class="music-appearance-field">
          <label>唱片图片链接</label>
          <input type="text" id="musicDiscUrlInput" placeholder="https://..." value="${savedDiscImg}" />
        </div>
        <div class="music-appearance-field">
          <label>或上传图片</label>
          <input type="file" id="musicDiscFileInput" accept="image/*" class="music-appearance-file" />
        </div>
        <div class="music-appearance-disc-preview" id="musicDiscPreview">
          <div class="music-appearance-disc-sample">
            ${savedDiscImg ? `<img src="${savedDiscImg}" alt="唱片预览" />` : ''}
            <div class="music-appearance-disc-center">♪</div>
          </div>
        </div>
      </div>
    </div>
    <div class="music-appearance-actions">
      <button class="music-appearance-btn secondary" id="musicAppearanceReset">恢复默认</button>
      <button class="music-appearance-btn primary" id="musicAppearanceApply">应用设置</button>
    </div>
  `;
  
  settingsPanel.classList.add('active');
  
  // 绑定事件
  document.getElementById('musicAppearanceBack').addEventListener('click', closeMusicAppearanceSettings);
  document.getElementById('musicAppearanceApply').addEventListener('click', applyMusicAppearance);
  document.getElementById('musicAppearanceReset').addEventListener('click', resetMusicAppearance);
  
  // 背景图片输入
  document.getElementById('musicBgUrlInput').addEventListener('input', (e) => {
    const preview = document.getElementById('musicBgPreview');
    if (e.target.value) {
      preview.innerHTML = `<img src="${e.target.value}" alt="背景预览" />`;
    } else {
      preview.innerHTML = '<span>背景预览</span>';
    }
  });
  
  // 背景图片上传
  document.getElementById('musicBgFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      document.getElementById('musicBgUrlInput').value = dataUrl;
      document.getElementById('musicBgPreview').innerHTML = `<img src="${dataUrl}" alt="背景预览" />`;
    }
  });
  
  // 唱片图片输入
  document.getElementById('musicDiscUrlInput').addEventListener('input', (e) => {
    updateDiscPreview(e.target.value);
  });
  
  // 唱片图片上传
  document.getElementById('musicDiscFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      document.getElementById('musicDiscUrlInput').value = dataUrl;
      updateDiscPreview(dataUrl);
    }
  });
}

/**
 * 更新唱片预览
 */
function updateDiscPreview(imgUrl) {
  const preview = document.getElementById('musicDiscPreview');
  if (preview) {
    preview.innerHTML = `
      <div class="music-appearance-disc-sample">
        ${imgUrl ? `<img src="${imgUrl}" alt="唱片预览" />` : ''}
        <div class="music-appearance-disc-center">♪</div>
      </div>
    `;
  }
}

/**
 * 文件转 DataURL（带压缩）
 */
function fileToDataUrl(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 计算压缩后的尺寸
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round(height * maxSize / width);
            width = maxSize;
          } else {
            width = Math.round(width * maxSize / height);
            height = maxSize;
          }
        }
        
        // 创建 canvas 压缩图片
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 JPEG 格式，质量 0.8
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        console.log('图片压缩完成，原始大小:', Math.round(reader.result.length / 1024), 'KB，压缩后:', Math.round(compressedDataUrl.length / 1024), 'KB');
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 关闭外观设置面板
 */
function closeMusicAppearanceSettings() {
  const panel = document.getElementById('musicAppearancePanel');
  if (panel) {
    panel.classList.remove('active');
  }
}

/**
 * 应用音乐外观设置
 */
async function applyMusicAppearance() {
  const bgUrl = document.getElementById('musicBgUrlInput').value.trim();
  const discUrl = document.getElementById('musicDiscUrlInput').value.trim();
  
  // 保存设置到 IndexedDB
  try {
    await saveSettingToIDB('musicViewBackground', bgUrl);
    await saveSettingToIDB('musicDiscImage', discUrl);
    console.log('外观设置已保存到 IndexedDB');
  } catch (e) {
    console.error('保存外观设置失败:', e);
  }
  
  // 应用背景
  applyMusicBackground(bgUrl);
  
  // 应用唱片图片
  applyDiscImage(discUrl);
  
  showToast('外观设置已应用');
  closeMusicAppearanceSettings();
}

/**
 * 应用音乐背景
 */
function applyMusicBackground(bgUrl) {
  const musicView = document.getElementById('musicView');
  if (musicView) {
    if (bgUrl) {
      musicView.style.backgroundImage = `url(${bgUrl})`;
      musicView.style.backgroundSize = 'cover';
      musicView.style.backgroundPosition = 'center';
    } else {
      musicView.style.backgroundImage = '';
      musicView.style.backgroundSize = '';
      musicView.style.backgroundPosition = '';
    }
  }
}

/**
 * 应用唱片图片（应用到中心区域）
 */
function applyDiscImage(discUrl) {
  const discInner = document.querySelector('.music-disc-inner');
  if (discInner) {
    if (discUrl) {
      discInner.style.backgroundImage = `url(${discUrl})`;
      discInner.style.backgroundSize = 'cover';
      discInner.style.backgroundPosition = 'center';
      discInner.innerHTML = ''; // 隐藏音乐符号
    } else {
      discInner.style.backgroundImage = '';
      discInner.style.backgroundSize = '';
      discInner.style.backgroundPosition = '';
      discInner.innerHTML = '♪'; // 恢复音乐符号
    }
  }
}

/**
 * 恢复默认外观
 */
async function resetMusicAppearance() {
  // 从 IndexedDB 删除设置
  try {
    await saveSettingToIDB('musicViewBackground', '');
    await saveSettingToIDB('musicDiscImage', '');
  } catch (e) {
    console.error('删除外观设置失败:', e);
  }
  
  document.getElementById('musicBgUrlInput').value = '';
  document.getElementById('musicDiscUrlInput').value = '';
  document.getElementById('musicBgPreview').innerHTML = '<span>背景预览</span>';
  updateDiscPreview('');
  
  applyMusicBackground('');
  applyDiscImage('');
  
  showToast('已恢复默认外观');
}

/**
 * 加载保存的外观设置
 */
async function loadMusicAppearance() {
  try {
    const bgUrl = await loadSettingFromIDB('musicViewBackground', '');
    const discUrl = await loadSettingFromIDB('musicDiscImage', '');
    
    console.log('从 IndexedDB 加载外观设置:', { bgUrl: bgUrl ? '有背景' : '无', discUrl: discUrl ? '有唱片图' : '无' });
    
    applyMusicBackground(bgUrl);
    applyDiscImage(discUrl);
  } catch (e) {
    console.error('加载外观设置失败:', e);
  }
}

/**
 * 更新进度
 */
function updateProgress() {
  if (!audioElement.duration) return;
  
  const progress = (audioElement.currentTime / audioElement.duration) * 100;
  const progressFill = document.getElementById('musicProgressFill');
  const currentTimeEl = document.getElementById('musicTimeCurrent');
  
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  
  if (currentTimeEl) {
    currentTimeEl.textContent = formatDuration(audioElement.currentTime);
  }
}

/**
 * 更新总时长
 */
function updateTotalTime() {
  const totalTimeEl = document.getElementById('musicTimeTotal');
  if (totalTimeEl && audioElement.duration) {
    totalTimeEl.textContent = formatDuration(audioElement.duration);
  }
}

/**
 * 更新歌曲信息
 */
function updateSongInfo() {
  const titleEl = document.getElementById('musicSongTitle');
  const subtitleEl = document.querySelector('.music-subtitle');
  
  if (titleEl && currentSong) {
    titleEl.textContent = currentSong.name;
  }
  
  if (subtitleEl && currentSong) {
    subtitleEl.textContent = currentSong.artist;
  }
}

/**
 * 更新播放按钮
 */
function updatePlayButton() {
  const playBtn = document.getElementById('musicPlayBtn');
  if (playBtn) {
    playBtn.innerHTML = isPlaying 
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}

/**
 * 更新唱片动画
 */
function updateDiscAnimation() {
  // 更新音乐视图中的大唱片
  const disc = document.querySelector('.music-disc-large');
  if (disc) {
    if (isPlaying) {
      disc.classList.add('playing');
    } else {
      disc.classList.remove('playing');
    }
  }
  
  // 更新主页的小唱片机
  const homePlayer = document.querySelector('.music-player');
  if (homePlayer) {
    if (isPlaying) {
      homePlayer.classList.add('playing');
    } else {
      homePlayer.classList.remove('playing');
    }
  }
  
  // 更新主页播放按钮图标
  updateHomePlayButton();
}

/**
 * 更新主页播放按钮图标
 */
function updateHomePlayButton() {
  const playerControls = document.querySelector('.player-controls');
  if (!playerControls) return;
  
  const buttons = playerControls.querySelectorAll('.player-btn');
  if (buttons.length >= 3) {
    const playBtn = buttons[1]; // 中间的播放/暂停按钮
    playBtn.innerHTML = isPlaying 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }
}

/**
 * 加载播放列表
 */
async function loadPlaylist() {
  try {
    playlist = await getPlaylist();
    console.log('播放列表已加载:', playlist.length, '首歌曲');
  } catch (e) {
    console.error('加载播放列表失败:', e);
    playlist = [];
  }
}

/**
 * 初始化搜索面板
 */
function initSearchPanel() {
  // 搜索返回按钮
  const searchBack = document.getElementById('musicSearchBack');
  if (searchBack) {
    searchBack.addEventListener('click', closeSearchPanel);
  }

  // 搜索输入框
  const searchInput = document.getElementById('musicSearchInput');
  const searchClear = document.getElementById('musicSearchClear');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (searchClear) {
        searchClear.classList.toggle('show', searchInput.value.length > 0);
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
  
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchClear.classList.remove('show');
        searchInput.focus();
      }
    });
  }

  // 搜索标签页切换
  const tabs = document.querySelectorAll('.music-search-tab');
  const uploadFab = document.getElementById('musicUploadFab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      currentTab = tab.dataset.tab;
      
      // 根据标签页显示/隐藏上传按钮
      if (uploadFab) {
        if (currentTab === 'local') {
          uploadFab.classList.remove('is-hidden');
        } else {
          uploadFab.classList.add('is-hidden');
        }
      }
      
      // 刷新列表
      if (currentTab === 'local') {
        showLocalSongs();
      } else {
        // 显示缓存的在线搜索结果
        showOnlineSearchResults();
      }
    });
  });

  // 搜索提交
  const searchSubmit = document.getElementById('musicSearchSubmit');
  if (searchSubmit) {
    searchSubmit.addEventListener('click', handleSearch);
  }

  // 上传按钮
  const uploadInput = document.getElementById('musicUploadInput');
  
  if (uploadFab && uploadInput) {
    uploadFab.addEventListener('click', () => {
      uploadInput.click();
    });
    
    uploadInput.addEventListener('change', handleFileUpload);
  }
}

/**
 * 处理文件上传
 */
async function handleFileUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  const content = document.getElementById('musicSearchContent');
  
  for (const file of files) {
    try {
      console.log('正在上传:', file.name);
      const song = await addSong(file);
      console.log('上传成功:', song.name);
    } catch (err) {
      console.error('上传失败:', err);
    }
  }
  
  // 清空 input
  e.target.value = '';
  
  // 刷新本地歌曲列表
  await showLocalSongs();
  updateLocalSongCount();
}

/**
 * 显示本地歌曲列表
 */
async function showLocalSongs() {
  const content = document.getElementById('musicSearchContent');
  if (!content) return;
  
  try {
    const songs = await getAllSongs();
    
    if (songs.length === 0) {
      content.innerHTML = `
        <div class="music-search-empty">
          <div class="music-search-empty-icon">♪</div>
          <div class="music-search-empty-text">未找到本地歌曲</div>
        </div>
      `;
      return;
    }
    
    content.innerHTML = `
      <div class="music-search-list">
        ${songs.map(song => renderSongItem(song)).join('')}
      </div>
    `;
    
    // 绑定点击事件
    bindSongItemEvents(content);
  } catch (e) {
    console.error('获取本地歌曲失败:', e);
  }
}

/**
 * 渲染歌曲项
 */
function renderSongItem(song) {
  return `
    <div class="music-search-item" data-id="${song.id}">
      <div class="music-search-item-cover">♪</div>
      <div class="music-search-item-info">
        <div class="music-search-item-title">${song.name}</div>
        <div class="music-search-item-artist">${song.artist} · ${formatDuration(song.duration)}</div>
      </div>
      <button class="music-search-item-action" data-action="add" data-id="${song.id}" aria-label="添加到播放列表">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * 绑定歌曲项事件
 */
function bindSongItemEvents(container) {
  // 添加到播放列表
  container.querySelectorAll('.music-search-item-action[data-action="add"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await handleAddToPlaylist(id);
    });
  });
  
  // 点击歌曲项直接播放
  container.querySelectorAll('.music-search-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = item.dataset.id;
      await handlePlaySong(id);
    });
  });
}

/**
 * 添加到播放列表
 */
async function handleAddToPlaylist(id) {
  try {
    const songData = await getSongData(id);
    if (!songData) return;
    
    await addToPlaylist(songData);
    await loadPlaylist();
    
    console.log('已添加到播放列表:', songData.name);
    
    // 显示提示
    showToast('已添加到播放列表');
  } catch (e) {
    console.error('添加到播放列表失败:', e);
  }
}

/**
 * 直接播放歌曲
 */
async function handlePlaySong(id) {
  try {
    const songData = await getSongData(id);
    if (!songData) return;
    
    // 先添加到播放列表
    await addToPlaylist(songData);
    await loadPlaylist();
    
    // 找到在播放列表中的索引
    const index = playlist.findIndex(item => item.id === id);
    if (index >= 0) {
      await playSongAtIndex(index);
    }
    
    // 关闭搜索面板
    closeSearchPanel();
  } catch (e) {
    console.error('播放歌曲失败:', e);
  }
}

/**
 * 更新本地歌曲数量
 */
async function updateLocalSongCount() {
  try {
    const songs = await getAllSongs();
    const tab = document.querySelector('.music-search-tab[data-tab="local"]');
    if (tab) {
      tab.textContent = `本地歌曲 (${songs.length})`;
    }
  } catch (e) {
    console.error('更新歌曲数量失败:', e);
  }
}

/**
 * 打开搜索面板
 */
async function openSearchPanel() {
  const searchPanel = document.getElementById('musicSearchPanel');
  if (searchPanel) {
    searchPanel.classList.add('active');
    
    // 聚焦输入框
    const input = document.getElementById('musicSearchInput');
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
    
    // 显示本地歌曲
    await showLocalSongs();
    await updateLocalSongCount();
  }
}

/**
 * 关闭搜索面板
 */
function closeSearchPanel() {
  const searchPanel = document.getElementById('musicSearchPanel');
  if (searchPanel) {
    searchPanel.classList.remove('active');
  }
}

/**
 * 处理搜索
 */
async function handleSearch() {
  const input = document.getElementById('musicSearchInput');
  if (!input) return;
  
  const keyword = input.value.trim();
  const content = document.getElementById('musicSearchContent');
  
  if (!keyword) {
    // 空关键词根据当前标签页显示内容
    if (currentTab === 'local') {
      await showLocalSongs();
    } else {
      content.innerHTML = `
        <div class="music-search-empty">
          <div class="music-search-empty-icon">🔍</div>
          <div class="music-search-empty-text">请输入关键词搜索在线歌曲</div>
        </div>
      `;
    }
    return;
  }
  
  if (currentTab === 'local') {
    // 搜索本地歌曲
    try {
      const songs = await searchSongs(keyword);
      
      if (songs.length === 0) {
        content.innerHTML = `
          <div class="music-search-empty">
            <div class="music-search-empty-icon">🔍</div>
            <div class="music-search-empty-text">未找到 "${keyword}" 相关本地歌曲</div>
          </div>
        `;
        return;
      }
      
      content.innerHTML = `
        <div class="music-search-list">
          ${songs.map(song => renderSongItem(song)).join('')}
        </div>
      `;
      
      bindSongItemEvents(content);
    } catch (e) {
      console.error('搜索本地歌曲失败:', e);
    }
  } else {
    // 搜索在线歌曲
    await searchOnlineSongs(keyword);
  }
}

/**
 * 搜索在线歌曲
 */
async function searchOnlineSongs(keyword) {
  const content = document.getElementById('musicSearchContent');
  
  // 显示加载状态
  content.innerHTML = `
    <div class="music-search-empty">
      <div class="music-search-empty-icon">⏳</div>
      <div class="music-search-empty-text">正在搜索...</div>
    </div>
  `;
  
  try {
    const songs = await searchOnline(keyword);
    
    // 缓存搜索结果
    onlineSearchResults = songs;
    lastSearchKeyword = keyword;
    
    // 更新在线歌曲数量
    const onlineTab = document.querySelector('.music-search-tab[data-tab="online"]');
    if (onlineTab) {
      onlineTab.textContent = `在线歌曲 (${songs.length})`;
    }
    
    if (songs.length === 0) {
      content.innerHTML = `
        <div class="music-search-empty">
          <div class="music-search-empty-icon">🔍</div>
          <div class="music-search-empty-text">未找到 "${keyword}" 相关在线歌曲</div>
        </div>
      `;
      return;
    }
    
    content.innerHTML = `
      <div class="music-search-list">
        ${songs.map(song => renderOnlineSongItem(song)).join('')}
      </div>
    `;
    
    bindOnlineSongItemEvents(content);
  } catch (e) {
    console.error('搜索在线歌曲失败:', e);
    content.innerHTML = `
      <div class="music-search-empty">
        <div class="music-search-empty-icon">❌</div>
        <div class="music-search-empty-text">搜索失败，请稍后重试</div>
      </div>
    `;
  }
}

/**
 * 显示缓存的在线搜索结果
 */
function showOnlineSearchResults() {
  const content = document.getElementById('musicSearchContent');
  if (!content) return;
  
  // 更新在线歌曲数量
  const onlineTab = document.querySelector('.music-search-tab[data-tab="online"]');
  if (onlineTab) {
    onlineTab.textContent = `在线歌曲 (${onlineSearchResults.length})`;
  }
  
  if (onlineSearchResults.length === 0) {
    content.innerHTML = `
      <div class="music-search-empty">
        <div class="music-search-empty-icon">🔍</div>
        <div class="music-search-empty-text">请输入关键词搜索在线歌曲</div>
      </div>
    `;
    return;
  }
  
  content.innerHTML = `
    <div class="music-search-list">
      ${onlineSearchResults.map(song => renderOnlineSongItem(song)).join('')}
    </div>
  `;
  
  bindOnlineSongItemEvents(content);
}

/**
 * 渲染在线歌曲项
 */
function renderOnlineSongItem(song) {
  const durationText = song.duration ? formatOnlineDuration(song.duration) : '';
  return `
    <div class="music-search-item" data-id="${song.id}" data-rid="${song.rid}" data-online="true" 
         data-name="${encodeURIComponent(song.name)}" 
         data-artist="${encodeURIComponent(song.artist)}"
         data-cover="${encodeURIComponent(song.cover || '')}">
      <div class="music-search-item-cover">
        ${song.cover ? `<img src="${song.cover}" alt="cover" />` : '♪'}
      </div>
      <div class="music-search-item-info">
        <div class="music-search-item-title">${song.name}</div>
        <div class="music-search-item-artist">${song.artist}${durationText ? ` · ${durationText}` : ''}</div>
      </div>
      <button class="music-search-item-action" data-action="add-online" data-rid="${song.rid}" aria-label="加入播放列表">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * 绑定在线歌曲项事件
 */
function bindOnlineSongItemEvents(container) {
  console.log('绑定在线歌曲事件, container:', container);
  
  // 点击添加按钮 - 加入播放列表
  const addBtns = container.querySelectorAll('.music-search-item-action[data-action="add-online"]');
  console.log('找到添加按钮数量:', addBtns.length);
  
  addBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const rid = btn.dataset.rid;
      const item = btn.closest('.music-search-item');
      await handleAddOnlineSongToPlaylist(item, rid);
    });
  });
  
  // 点击歌曲项直接播放
  const onlineItems = container.querySelectorAll('.music-search-item[data-online="true"]');
  console.log('找到在线歌曲项数量:', onlineItems.length);
  
  onlineItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      // 如果点击的是添加按钮，不重复处理
      if (e.target.closest('.music-search-item-action')) return;
      console.log('点击在线歌曲项:', item.dataset.rid);
      const rid = item.dataset.rid;
      await handlePlayOnlineSong(item, rid);
    });
  });
}

/**
 * 添加在线歌曲到播放列表
 */
async function handleAddOnlineSongToPlaylist(item, rid) {
  console.log('handleAddOnlineSongToPlaylist 被调用, rid:', rid);
  
  const songName = decodeURIComponent(item.dataset.name || '未知歌曲');
  const artist = decodeURIComponent(item.dataset.artist || '未知歌手');
  const cover = decodeURIComponent(item.dataset.cover || '');
  
  console.log('歌曲信息:', { songName, artist, cover });
  showToast('正在获取播放地址...');
  
  try {
    const playUrl = await getPlayUrl(rid);
    console.log('获取到播放地址:', playUrl);
    
    if (!playUrl) {
      showToast('无法获取播放地址');
      return;
    }
    
    // 创建在线歌曲对象
    const onlineSong = {
      id: `online_${rid}`,
      rid: rid,
      name: songName,
      artist: artist,
      cover: cover,
      data: playUrl,
      isOnline: true,
      duration: 0
    };
    
    // 添加到播放列表
    await addToPlaylist(onlineSong);
    await loadPlaylist();
    
    showToast('已添加到播放列表');
  } catch (e) {
    console.error('添加在线歌曲失败:', e);
    showToast('添加失败');
  }
}

/**
 * 播放在线歌曲
 */
async function handlePlayOnlineSong(item, rid) {
  console.log('handlePlayOnlineSong 被调用, rid:', rid);
  
  const nameEl = item.querySelector('.music-search-item-title');
  const artistEl = item.querySelector('.music-search-item-artist');
  const coverEl = item.querySelector('.music-search-item-cover img');
  
  const songName = nameEl?.textContent || '未知歌曲';
  const artistText = artistEl?.textContent || '未知歌手';
  const artist = artistText.split(' · ')[0]; // 去掉时长部分
  const cover = coverEl?.src || '';
  
  console.log('歌曲信息:', { songName, artist, cover });
  showToast('正在获取播放地址...');
  console.log('开始获取播放地址...');
  
  try {
    // 同时获取播放地址和歌词
    const [playUrl, lyrics] = await Promise.all([
      getPlayUrl(rid),
      getLyrics(rid)
    ]);
    console.log('获取到播放地址:', playUrl);
    console.log('获取到歌词:', lyrics ? '有歌词' : '无歌词');
    
    if (!playUrl) {
      showToast('无法获取播放地址');
      console.log('播放地址为空');
      return;
    }
    
    // 创建在线歌曲对象
    const onlineSong = {
      id: `online_${rid}`,
      rid: rid,
      name: songName,
      artist: artist,
      cover: cover,
      data: playUrl,
      lyrics: lyrics || '暂无歌词',
      isOnline: true,
      duration: 0
    };
    
    // 直接播放
    currentSong = onlineSong;
    audioElement.src = playUrl;
    audioElement.play();
    isPlaying = true;
    
    updateSongInfo();
    updatePlayButton();
    updateDiscAnimation();
    
    // 关闭搜索面板
    closeSearchPanel();
    
    showToast('开始播放');
  } catch (e) {
    console.error('播放在线歌曲失败:', e);
    showToast('播放失败');
  }
}

/**
 * 打开播放列表面板
 */
async function openPlaylistPanel() {
  // 创建播放列表面板（如果不存在）
  let panel = document.getElementById('musicPlaylistPanel');
  
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'musicPlaylistPanel';
    panel.className = 'music-playlist-panel';
    document.getElementById('musicView').appendChild(panel);
  }
  
  await loadPlaylist();
  
  panel.innerHTML = `
    <header class="music-playlist-header">
      <button class="music-playlist-back" id="musicPlaylistBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <div class="music-playlist-title">播放列表 (${playlist.length})</div>
      <button class="music-playlist-clear" id="musicPlaylistClear">清空</button>
    </header>
    <div class="music-playlist-content">
      ${playlist.length === 0 
        ? '<div class="music-playlist-empty">播放列表为空</div>'
        : `<div class="music-playlist-list">
            ${playlist.map((item, index) => `
              <div class="music-playlist-item ${index === currentIndex ? 'playing' : ''}" data-index="${index}">
                <div class="music-playlist-item-info">
                  <div class="music-playlist-item-name">${item.name}</div>
                  <div class="music-playlist-item-artist">${item.artist}</div>
                </div>
                <button class="music-playlist-item-remove" data-id="${item.id}">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `;
  
  panel.classList.add('active');
  
  // 绑定事件
  document.getElementById('musicPlaylistBack').addEventListener('click', closePlaylistPanel);
  document.getElementById('musicPlaylistClear').addEventListener('click', handleClearPlaylist);
  
  // 点击播放
  panel.querySelectorAll('.music-playlist-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.music-playlist-item-remove')) return;
      const index = parseInt(item.dataset.index);
      playSongAtIndex(index);
      closePlaylistPanel();
    });
  });
  
  // 移除歌曲
  panel.querySelectorAll('.music-playlist-item-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      await removeFromPlaylist(id);
      await loadPlaylist();
      openPlaylistPanel(); // 刷新面板
    });
  });
}

/**
 * 关闭播放列表面板
 */
function closePlaylistPanel() {
  const panel = document.getElementById('musicPlaylistPanel');
  if (panel) {
    panel.classList.remove('active');
  }
}

/**
 * 清空播放列表
 */
async function handleClearPlaylist() {
  if (!confirm('确定要清空播放列表吗？')) return;
  
  const { clearPlaylist } = await import('../music/musicData.js');
  await clearPlaylist();
  await loadPlaylist();
  
  currentSong = null;
  currentIndex = -1;
  
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
  }
  
  isPlaying = false;
  updatePlayButton();
  updateDiscAnimation();
  
  // 重置显示
  const titleEl = document.getElementById('musicSongTitle');
  const subtitleEl = document.querySelector('.music-subtitle');
  if (titleEl) titleEl.textContent = '暂无歌曲';
  if (subtitleEl) subtitleEl.textContent = '请搜索或上传歌曲';
  
  openPlaylistPanel(); // 刷新面板
}

/**
 * 绑定主页播放器控制按钮
 */
function bindHomePlayerControls() {
  const playerControls = document.querySelector('.player-controls');
  if (!playerControls) return;
  
  const buttons = playerControls.querySelectorAll('.player-btn');
  if (buttons.length >= 3) {
    // 上一首按钮
    buttons[0].addEventListener('click', (e) => {
      e.stopPropagation();
      playPrev();
    });
    
    // 播放/暂停按钮
    buttons[1].addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlay();
    });
    
    // 下一首按钮
    buttons[2].addEventListener('click', (e) => {
      e.stopPropagation();
      playNext();
    });
  }
}

/**
 * 绑定进度条拖动
 */
function bindProgressBarDrag() {
  const progressBar = document.querySelector('.music-progress-bar');
  if (!progressBar) return;
  
  let isDragging = false;
  
  // 点击进度条跳转
  progressBar.addEventListener('click', (e) => {
    if (!audioElement.duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioElement.currentTime = percent * audioElement.duration;
  });
  
  // 拖动开始
  progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleDrag(e);
  });
  
  progressBar.addEventListener('touchstart', (e) => {
    isDragging = true;
    handleDrag(e.touches[0]);
  });
  
  // 拖动中
  document.addEventListener('mousemove', (e) => {
    if (isDragging) handleDrag(e);
  });
  
  document.addEventListener('touchmove', (e) => {
    if (isDragging) handleDrag(e.touches[0]);
  });
  
  // 拖动结束
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  document.addEventListener('touchend', () => {
    isDragging = false;
  });
  
  function handleDrag(e) {
    if (!audioElement.duration) return;
    
    const rect = progressBar.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));
    audioElement.currentTime = percent * audioElement.duration;
  }
}

/**
 * 显示提示
 */
function showToast(message) {
  let toast = document.querySelector('.music-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'music-toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
