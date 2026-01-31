import { SYSTEM_PROMPTS, APP_SYSTEM_PROMPT } from "./prompts.js";
import { loadWorldbookData } from "../worldbook/worldbookData.js";

const STORAGE_KEY = "apiProfiles";
const ACTIVE_PROFILE_KEY = "apiActiveProfile";
const DEFAULT_TIMEOUT = 30000;

const readProfiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("读取 API 配置失败", e);
    return [];
  }
};

export const getActiveProfile = () => {
  const list = readProfiles();
  if (!list.length) return null;
  
  // 读取保存的活动配置ID
  const savedActiveId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (savedActiveId) {
    const activeProfile = list.find((p) => p.id === savedActiveId);
    if (activeProfile) return activeProfile;
  }
  
  // 如果没有保存的或找不到，返回第一个
  return list[0];
};

const withTimeout = (runner, ms = DEFAULT_TIMEOUT) =>
  new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("请求超时"));
    }, ms);

    runner(controller.signal)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });

const extractJsonText = (raw) => {
  if (!raw) return "";
  let trimmed = raw.trim();
  
  // 移除可能的 markdown 代码块标记
  trimmed = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  trimmed = trimmed.replace(/\s*```$/i, "");
  trimmed = trimmed.trim();
  
  // 尝试提取 JSON 数组
  const firstBrace = trimmed.indexOf("[");
  const lastBrace = trimmed.lastIndexOf("]");
  if (firstBrace !== -1 && lastBrace !== -1) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  
  // 尝试提取 JSON 对象
  const firstObj = trimmed.indexOf("{");
  const lastObj = trimmed.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1) {
    return trimmed.slice(firstObj, lastObj + 1);
  }
  
  return trimmed;
};

const buildSystemMessages = () => {
  const messages = [];
  if (SYSTEM_PROMPTS?.xinliaoChat) {
    messages.push({
      role: "system",
      content: SYSTEM_PROMPTS.xinliaoChat,
    });
  }
  messages.push({
    role: "system",
    content: "你是 JSON 数据生成器。只输出 JSON，不要附加说明文字。",
  });
  return messages;
};

/**
 * 请求聊天回复（角色扮演）
 * @param {Object} options - 配置选项
 * @param {Object} options.contact - 角色信息（char 人设）
 * @param {Array} options.chatHistory - 聊天历史
 * @param {string} options.userMessage - 用户最新消息（可选）
 * @returns {Promise<string[]>} 角色回复内容数组（多条消息）
 */
export const requestChatReply = async ({ contact, chatHistory = [], userMessage = "" }) => {
  const profile = getActiveProfile();
  if (!profile?.url || !profile?.key || !profile?.model) {
    throw new Error("请先在设置中配置 API 地址、密钥与模型");
  }

  // 构建角色设定（char 人设）
  const charPrompt = buildCharPrompt(contact);

  // 构建系统提示词
  const systemPrompt = `${APP_SYSTEM_PROMPT}

【角色设定】
${charPrompt}

【输出格式要求】
你必须以 JSON 数组格式输出回复，每条消息是数组中的一个字符串。
示例格式：["消息1", "消息2", "消息3"]
回复 2-5 条消息，每条消息简短自然，像真实聊天一样。
只输出 JSON 数组，不要有任何其他内容。`;

  // 构建消息历史
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  // 添加聊天历史（最近 20 条）
  const recentHistory = chatHistory.slice(-20);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // 如果有新的用户消息且不在历史中
  if (userMessage && !recentHistory.some(m => m.content === userMessage && m.role === "user")) {
    messages.push({
      role: "user",
      content: userMessage,
    });
  }

  // 如果没有用户消息，添加一个触发回复的提示
  if (!userMessage && messages.filter(m => m.role === "user").length === 0) {
    messages.push({
      role: "user",
      content: "（请以角色身份主动发起对话）",
    });
  }

  const payload = {
    model: profile.model,
    messages,
    max_tokens: 800,
    temperature: 0.85,
    stream: false,
  };

  const response = await withTimeout(async (signal) => {
    const resp = await fetch(`${profile.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText || ""}`.trim());
    }
    return resp.json();
  }, DEFAULT_TIMEOUT);

  const content =
    response?.choices?.[0]?.message?.content ||
    response?.choices?.[0]?.delta?.content ||
    "";

  if (!content.trim()) {
    throw new Error("API 返回内容为空");
  }

  // 解析 JSON 数组格式的回复
  return parseMultipleMessages(content.trim());
};

/**
 * 解析多条消息回复
 * @param {string} content - API 返回的内容
 * @returns {string[]} 消息数组
 */
const parseMultipleMessages = (content) => {
  try {
    // 尝试提取 JSON 数组
    const jsonText = extractJsonText(content);
    const parsed = JSON.parse(jsonText);
    
    if (Array.isArray(parsed)) {
      // 过滤掉空消息，确保每条都是字符串
      return parsed
        .filter(msg => msg && typeof msg === "string" && msg.trim())
        .map(msg => msg.trim());
    }
    
    // 如果解析结果不是数组，当作单条消息
    return [String(parsed).trim()];
  } catch (e) {
    // JSON 解析失败，尝试按换行分割
    const lines = content
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("[") && !line.startsWith("]"));
    
    if (lines.length > 0) {
      return lines;
    }
    
    // 最后兜底：当作单条消息
    return [content];
  }
};

/**
 * 获取角色关联的世界书内容
 * @param {Array} worldbookIds - 关联的世界书设定 ID 列表
 * @returns {string} 世界书内容文本
 */
const getWorldbookContent = (worldbookIds) => {
  if (!worldbookIds || !worldbookIds.length) return "";

  const { entries } = loadWorldbookData();
  if (!entries || !entries.length) return "";

  // 获取关联的设定内容
  const relatedEntries = entries.filter(
    (entry) => worldbookIds.includes(entry.id) && entry.enabled !== false
  );

  if (!relatedEntries.length) return "";

  // 构建世界书内容
  const contents = relatedEntries.map((entry) => {
    return `【${entry.name}】\n${entry.content}`;
  });

  return contents.join("\n\n");
};

/**
 * 构建角色设定提示词（char 人设）
 * @param {Object} contact - 角色信息
 * @returns {string} 角色设定提示词
 */
const buildCharPrompt = (contact) => {
  if (!contact) return "你是一个友好的聊天伙伴。";

  let prompt = `角色名：${contact.name}\n`;

  // persona 字段是角色的人设描述
  if (contact.persona) {
    prompt += `人设：${contact.persona}\n`;
  }

  if (contact.description) {
    prompt += `简介：${contact.description}\n`;
  }

  if (contact.personality) {
    prompt += `性格：${contact.personality}\n`;
  }

  if (contact.background) {
    prompt += `背景：${contact.background}\n`;
  }

  // 添加关联的世界书内容
  if (contact.worldbookIds && contact.worldbookIds.length > 0) {
    const worldbookContent = getWorldbookContent(contact.worldbookIds);
    if (worldbookContent) {
      prompt += `\n【世界观设定】\n${worldbookContent}\n`;
    }
  }

  return prompt;
};

export const requestChatJson = async ({ prompt }) => {
  const profile = getActiveProfile();
  if (!profile?.url || !profile?.key || !profile?.model) {
    throw new Error("请先在设置中配置 API 地址、密钥与模型");
  }

  const payload = {
    model: profile.model,
    messages: [...buildSystemMessages(), { role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.7,
    stream: false,
  };

  const response = await withTimeout(async (signal) => {
    const resp = await fetch(`${profile.url}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${profile.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} ${resp.statusText || ""}`.trim());
    }
    return resp.json();
  });

  const content =
    response?.choices?.[0]?.message?.content ||
    response?.choices?.[0]?.delta?.content ||
    "";

  const jsonText = extractJsonText(content);
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error("API 返回的数据格式不正确");
  }

  return parsed;
};
