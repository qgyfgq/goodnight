// 世界书数据管理模块

const STORAGE_KEY = "worldbookData";

/**
 * 读取世界书数据
 * @returns {{ groups: Array, entries: Array }}
 */
export const loadWorldbookData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { groups: [], entries: [] };
    const data = JSON.parse(raw);
    return {
      groups: Array.isArray(data.groups) ? data.groups : [],
      entries: Array.isArray(data.entries) ? data.entries : [],
    };
  } catch (e) {
    console.warn("读取世界书数据失败", e);
    return { groups: [], entries: [] };
  }
};

/**
 * 保存世界书数据
 * @param {{ groups: Array, entries: Array }} data
 */
export const saveWorldbookData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("保存世界书数据失败", e);
  }
};

/**
 * 生成唯一 ID
 * @param {string} prefix
 * @returns {string}
 */
export const generateId = (prefix = "wb") => {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
};

/**
 * 创建分组
 * @param {string} name
 * @returns {Object}
 */
export const createGroup = (name) => ({
  id: generateId("group"),
  name: name || "未命名分组",
  createdAt: Date.now(),
});

/**
 * 创建设定条目
 * @param {Object} options
 * @returns {Object}
 */
export const createEntry = ({ name, content, groupId, keywords = [], enabled = true }) => ({
  id: generateId("entry"),
  name: name || "未命名设定",
  content: content || "",
  groupId: groupId || null,
  keywords: keywords,
  enabled: enabled,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * 解析 DOCX 文件内容
 * DOCX 是 ZIP 格式，使用浏览器原生解压
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
export const parseDocxContent = async (buffer) => {
  try {
    // 使用 Blob 和 Response 来解压 ZIP
    const blob = new Blob([buffer], { type: "application/zip" });
    
    // 尝试使用 CompressionStream（现代浏览器支持）
    // 但 DOCX 是 ZIP 格式，需要手动解析
    
    // 简单方法：直接在二进制中搜索 document.xml 内容
    const uint8 = new Uint8Array(buffer);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(uint8);
    
    // 查找 word/document.xml 的内容
    // DOCX 中的文本在 <w:t> 标签中
    const textMatches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches && textMatches.length > 0) {
      const extractedText = textMatches
        .map((m) => {
          const match = m.match(/>([^<]*)</);
          return match ? match[1] : "";
        })
        .join("");
      
      if (extractedText.trim()) {
        return extractedText;
      }
    }
    
    // 备用方法：查找段落标记之间的文本
    const paragraphs = text.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g);
    if (paragraphs) {
      const result = paragraphs
        .map((p) => {
          const texts = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          if (texts) {
            return texts.map((t) => t.replace(/<[^>]+>/g, "")).join("");
          }
          return "";
        })
        .filter((p) => p.trim())
        .join("\n");
      
      if (result.trim()) {
        return result;
      }
    }
    
    console.warn("DOCX 解析：未找到文本内容");
    return "";
  } catch (e) {
    console.warn("解析 DOCX 失败", e);
    return "";
  }
};

/**
 * 解析导入的 JSON 数据
 * 支持多种格式：SillyTavern 世界书、数组格式、自定义格式
 * @param {Object|Array} data
 * @returns {{ groups: Array, entries: Array }}
 */
export const parseImportedJson = (data) => {
  // 格式1：SillyTavern 世界书格式
  // { entries: { "0": { comment, content, ... }, "1": {...} } }
  if (data.entries && typeof data.entries === "object" && !Array.isArray(data.entries)) {
    const entriesObj = data.entries;
    const parsedEntries = [];
    
    // 遍历对象的所有键（"0", "1", "2" 等）
    for (const key of Object.keys(entriesObj)) {
      const item = entriesObj[key];
      if (item && typeof item === "object") {
        // SillyTavern 格式：comment 是名称，content 是内容
        const name = item.comment || item.name || item.title || `设定 ${key}`;
        const content = item.content || item.description || "";
        
        // 跳过禁用的条目或空内容
        if (item.disable === true) continue;
        
        parsedEntries.push(createEntry({
          name: name,
          content: content,
          keywords: item.key || item.keys || item.keywords || [],
        }));
      }
    }
    
    return {
      groups: [],
      entries: parsedEntries,
    };
  }
  
  // 格式2：数组格式
  if (Array.isArray(data)) {
    return {
      groups: [],
      entries: data.map((item) => createEntry({
        name: item.name || item.title || item.key || item.comment || "未命名",
        content: item.content || item.description || item.value || item.text || "",
        keywords: item.keywords || item.keys || item.key || [],
      })),
    };
  }
  
  // 格式3：带有 entries 数组的格式
  if (Array.isArray(data.entries)) {
    return {
      groups: (data.groups || []).map((g) => ({
        id: g.id || generateId("group"),
        name: g.name || "未命名分组",
        createdAt: g.createdAt || Date.now(),
      })),
      entries: data.entries.map((e) => createEntry({
        name: e.name || e.title || e.comment || "未命名",
        content: e.content || e.description || "",
        groupId: e.groupId || null,
        keywords: e.keywords || e.key || [],
      })),
    };
  }
  
  // 格式4：单个设定对象
  return {
    groups: [],
    entries: [createEntry({
      name: data.name || data.title || data.comment || "未命名",
      content: data.content || data.description || "",
      keywords: data.keywords || data.key || [],
    })],
  };
};
