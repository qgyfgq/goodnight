/**
 * 音乐 API 客户端模块
 * 使用 TuneHub API 搜索和获取在线歌曲
 */

const API_BASE = 'https://tunehub.sayqz.com/api';
// API Key - 用于解析接口
const API_KEY = 'th_dd6c3fd1af25e9256f869b5839268bdca29ab70df9fe85f2';

/**
 * 搜索在线歌曲
 * 由于 CORS 限制，搜索功能需要通过服务端代理
 * 这里我们使用一个公开的 CORS 代理服务
 * @param {string} keyword 搜索关键词
 * @param {number} page 页码（从0开始）
 * @param {number} pageSize 每页数量
 * @returns {Promise<Array>} 歌曲列表
 */
export async function searchOnline(keyword, page = 0, pageSize = 30) {
  try {
    // 首先获取方法配置
    const configRes = await fetch(`${API_BASE}/v1/methods/kuwo/search`);
    const configResult = await configRes.json();
    
    if (configResult.code !== 0 || !configResult.data) {
      throw new Error('无法获取搜索配置');
    }
    
    const config = configResult.data;
    
    // 构建请求参数
    const params = {};
    for (const [key, value] of Object.entries(config.params || {})) {
      let newValue = String(value);
      // 替换模板变量
      if (key === 'all' || newValue.includes('{{keyword}}')) {
        newValue = keyword;
      }
      if (key === 'pn' || newValue.includes('{{page}}')) {
        newValue = String(page);
      }
      if (key === 'rn' || newValue.includes('{{pageSize}}')) {
        newValue = String(pageSize);
      }
      params[key] = newValue;
    }
    
    // 构建完整 URL
    const targetUrl = new URL(config.url);
    targetUrl.search = new URLSearchParams(params);
    
    // 使用公开的 CORS 代理服务
    // 注意：这些代理服务可能不稳定，生产环境建议自建代理
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];
    
    let response = null;
    let lastError = null;
    
    for (const proxy of corsProxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(targetUrl.toString());
        response = await fetch(proxyUrl, {
          headers: config.headers || {}
        });
        if (response.ok) break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    
    if (!response || !response.ok) {
      throw lastError || new Error('所有代理都失败了');
    }
    
    const data = await response.text();
    return parseSearchResult(data);
  } catch (e) {
    console.error('搜索在线歌曲失败:', e);
    throw e;
  }
}

/**
 * 解析搜索结果
 */
function parseSearchResult(data) {
  const songs = [];
  
  try {
    // 如果是字符串，尝试解析为 JSON
    let jsonData = data;
    if (typeof data === 'string') {
      try {
        jsonData = JSON.parse(data);
      } catch {
        // 尝试提取 JSON 部分
        const match = data.match(/\{[\s\S]*\}/);
        if (match) {
          jsonData = JSON.parse(match[0]);
        }
      }
    }
    
    // 酷我音乐格式
    if (jsonData && jsonData.abslist) {
      for (const item of jsonData.abslist) {
        const rid = item.MUSICRID?.replace('MUSIC_', '') || item.DC_TARGETID || '';
        songs.push({
          id: `kuwo_${rid}`,
          rid: rid,
          name: item.SONGNAME || item.NAME || '未知歌曲',
          artist: item.ARTIST || item.SINGER || '未知歌手',
          album: item.ALBUM || '',
          duration: parseInt(item.DURATION) || 0,
          cover: item.web_albumpic_short 
            ? `https://img1.kuwo.cn/star/albumcover/${item.web_albumpic_short}` 
            : '',
          source: 'kuwo',
          isOnline: true
        });
      }
    }
    
    // 如果是数组格式（已解析的结果）
    if (Array.isArray(jsonData)) {
      return jsonData;
    }
  } catch (e) {
    console.error('解析搜索结果失败:', e);
  }
  
  return songs;
}

/**
 * 获取歌曲播放地址
 * 使用 TuneHub 的解析接口（需要 API Key）
 * @param {string} rid 歌曲 RID
 * @returns {Promise<string>} 播放地址
 */
export async function getPlayUrl(rid) {
  console.log('getPlayUrl 被调用, rid:', rid);
  
  try {
    // 使用 TuneHub 的解析接口
    const requestBody = {
      platform: 'kuwo',
      ids: rid,
      quality: '320k'
    };
    console.log('请求体:', requestBody);
    
    const response = await fetch(`${API_BASE}/v1/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('API 响应状态:', response.status);
    const result = await response.json();
    console.log('API 响应内容 (完整JSON):', JSON.stringify(result, null, 2));
    
    if (result.code === 0 && result.data) {
      // API 响应结构: result.data.data[0].url
      // result.data 是一个对象，包含 data 数组
      let songData;
      if (result.data.data && Array.isArray(result.data.data)) {
        // 嵌套结构: result.data.data[0]
        songData = result.data.data[0];
      } else if (Array.isArray(result.data)) {
        // 直接数组: result.data[0]
        songData = result.data[0];
      } else {
        // 单个对象
        songData = result.data;
      }
      
      console.log('歌曲数据 (完整JSON):', JSON.stringify(songData, null, 2));
      
      if (songData && songData.success) {
        const playUrl = songData.url || null;
        console.log('提取的播放地址:', playUrl);
        return playUrl;
      }
      
      console.error('歌曲解析失败:', songData);
      return null;
    }
    
    console.error('解析失败:', result);
    return null;
  } catch (e) {
    console.error('获取播放地址失败:', e);
    return null;
  }
}

/**
 * 获取歌词
 * @param {string} rid 歌曲 RID
 * @returns {Promise<string>} 歌词文本
 */
export async function getLyrics(rid) {
  console.log('getLyrics 被调用, rid:', rid);
  
  try {
    // 酷我音乐歌词 API
    const lyricsUrl = `https://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${rid}`;
    
    // 使用 CORS 代理
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];
    
    let response = null;
    let lastError = null;
    
    for (const proxy of corsProxies) {
      try {
        const proxyUrl = proxy + encodeURIComponent(lyricsUrl);
        response = await fetch(proxyUrl);
        if (response.ok) break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }
    
    if (!response || !response.ok) {
      throw lastError || new Error('获取歌词失败');
    }
    
    const data = await response.json();
    console.log('歌词 API 响应:', data);
    
    if (data.status === 200 && data.data && data.data.lrclist) {
      // 解析歌词列表
      const lrcList = data.data.lrclist;
      const lyrics = lrcList.map(item => item.lineLyric).join('\n');
      return lyrics || '暂无歌词';
    }
    
    return '暂无歌词';
  } catch (e) {
    console.error('获取歌词失败:', e);
    return '暂无歌词';
  }
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
