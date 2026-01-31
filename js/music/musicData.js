/**
 * 音乐数据管理模块
 * 管理本地歌曲存储和播放列表
 */

// IndexedDB 数据库名称
const DB_NAME = 'MusicDB';
const DB_VERSION = 1;
const STORE_SONGS = 'songs';
const STORE_PLAYLIST = 'playlist';

let db = null;

/**
 * 初始化数据库
 */
export async function initMusicDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      
      // 歌曲存储
      if (!database.objectStoreNames.contains(STORE_SONGS)) {
        const songsStore = database.createObjectStore(STORE_SONGS, { keyPath: 'id' });
        songsStore.createIndex('name', 'name', { unique: false });
        songsStore.createIndex('artist', 'artist', { unique: false });
      }
      
      // 播放列表存储
      if (!database.objectStoreNames.contains(STORE_PLAYLIST)) {
        database.createObjectStore(STORE_PLAYLIST, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 添加歌曲到本地库
 * @param {File} file 音频文件
 * @returns {Promise<Object>} 歌曲信息
 */
export async function addSong(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async () => {
      const song = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''), // 去掉扩展名
        artist: '未知歌手',
        duration: 0,
        data: reader.result, // base64 数据
        type: file.type,
        size: file.size,
        addedAt: Date.now()
      };
      
      // 尝试获取音频时长
      try {
        song.duration = await getAudioDuration(reader.result);
      } catch (e) {
        console.warn('无法获取音频时长:', e);
      }
      
      // 解析文件名中的歌手信息（格式：歌名 - 歌手）
      const nameParts = song.name.split(' - ');
      if (nameParts.length >= 2) {
        // 最后一部分是歌手，前面的部分是歌名
        song.artist = nameParts[nameParts.length - 1].trim();
        song.name = nameParts.slice(0, -1).join(' - ').trim();
      }
      
      // 存储到数据库
      const tx = db.transaction(STORE_SONGS, 'readwrite');
      const store = tx.objectStore(STORE_SONGS);
      store.add(song);
      
      tx.oncomplete = () => resolve(song);
      tx.onerror = () => reject(tx.error);
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 获取音频时长
 */
function getAudioDuration(dataUrl) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error('无法加载音频'));
    audio.src = dataUrl;
  });
}

/**
 * 获取所有本地歌曲
 */
export async function getAllSongs() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readonly');
    const store = tx.objectStore(STORE_SONGS);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 搜索本地歌曲
 * @param {string} keyword 关键词
 */
export async function searchSongs(keyword) {
  const songs = await getAllSongs();
  const lowerKeyword = keyword.toLowerCase();
  
  return songs.filter(song => 
    song.name.toLowerCase().includes(lowerKeyword) ||
    song.artist.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * 删除歌曲
 */
export async function deleteSong(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    store.delete(id);
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取播放列表
 */
export async function getPlaylist() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLIST, 'readonly');
    const store = tx.objectStore(STORE_PLAYLIST);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 添加歌曲到播放列表
 */
export async function addToPlaylist(song) {
  // 如果是在线歌曲，同时存储到 songs 表以缓存播放地址
  if (song.isOnline && song.data) {
    await saveOnlineSong(song);
  }
  
  return new Promise((resolve, reject) => {
    const playlistItem = {
      id: song.id,
      name: song.name,
      artist: song.artist,
      duration: song.duration,
      addedAt: Date.now()
    };
    
    const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLIST);
    store.put(playlistItem); // 使用 put 避免重复添加报错
    
    tx.oncomplete = () => resolve(playlistItem);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 保存在线歌曲到本地（缓存播放地址）
 */
export async function saveOnlineSong(song) {
  return new Promise((resolve, reject) => {
    const onlineSong = {
      id: song.id,
      rid: song.rid,
      name: song.name,
      artist: song.artist,
      cover: song.cover || '',
      data: song.data, // 播放地址
      isOnline: true,
      duration: song.duration || 0,
      addedAt: Date.now()
    };
    
    const tx = db.transaction(STORE_SONGS, 'readwrite');
    const store = tx.objectStore(STORE_SONGS);
    store.put(onlineSong); // 使用 put 覆盖已存在的
    
    tx.oncomplete = () => resolve(onlineSong);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 从播放列表移除歌曲
 */
export async function removeFromPlaylist(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLIST);
    store.delete(id);
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 清空播放列表
 */
export async function clearPlaylist() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLIST, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLIST);
    store.clear();
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * 获取歌曲数据（用于播放）
 */
export async function getSongData(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, 'readonly');
    const store = tx.objectStore(STORE_SONGS);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 格式化时长
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
