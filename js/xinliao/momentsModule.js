/**
 * 动态模块：渲染和交互逻辑
 * 管理朋友圈动态的显示和发布功能
 */

import {
  loadStoredMoments,
  saveMoments,
  addMoment,
  addComment,
  deleteComment,
  deleteComments,
  deleteMoment,
  toggleLike,
  addContactLike,
  formatTime,
} from "./momentsData.js";
import { placeholderContacts } from "./xinliaoData.js";
import { requestChatReply, getActiveProfile } from "./apiClient.js";

// 获取 DOM 元素的辅助函数
const getEl = (id) => document.getElementById(id);

/**
 * 构建头像 HTML
 * @param {string} avatar - 头像内容（URL 或 emoji）
 * @returns {string} 头像 HTML
 */
const buildAvatarMarkup = (avatar) => {
  if (!avatar) return `<span class="xinliao-avatar-text">👤</span>`;
  const avatarText = String(avatar).trim();
  if (
    avatarText.startsWith("http://") ||
    avatarText.startsWith("https://") ||
    avatarText.startsWith("data:")
  ) {
    return `<img class="xinliao-avatar-image" src="${avatarText}" alt="avatar" />`;
  }
  return `<span class="xinliao-avatar-text">${avatarText}</span>`;
};

/**
 * 构建图片网格 HTML
 * @param {Array} images - 图片列表
 * @returns {string} 图片网格 HTML
 */
const buildImagesMarkup = (images) => {
  if (!images || !images.length) return "";
  const count = Math.min(images.length, 9);
  const gridClass = count === 1 ? "single" : count <= 4 ? "small" : "large";
  
  const imagesHtml = images
    .slice(0, 9)
    .map(
      (img) => `
        <div class="xinliao-moment-image">
          <img src="${img}" alt="moment image" />
        </div>
      `
    )
    .join("");

  return `<div class="xinliao-moment-images ${gridClass}">${imagesHtml}</div>`;
};

/**
 * 构建单条评论 HTML
 * @param {Object} comment - 评论数据
 * @param {string} momentId - 动态 ID
 * @returns {string} 评论 HTML
 */
const buildCommentMarkup = (comment, momentId) => {
  // 如果有回复对象，显示回复格式
  const replyTo = comment.replyTo ? `<span class="xinliao-comment-reply-to">回复 ${comment.replyTo}：</span>` : "";
  
  return `
    <div class="xinliao-moment-comment" data-comment-id="${comment.id}" data-author="${comment.author}">
      <span class="xinliao-moment-comment-author">${comment.author}</span>
      ${replyTo}
      <span class="xinliao-moment-comment-text">${comment.content}</span>
    </div>
  `;
};

/**
 * 构建点赞列表 HTML
 * @param {Array} likes - 点赞列表
 * @returns {string} 点赞列表 HTML
 */
const buildLikesMarkup = (likes) => {
  if (!likes || !likes.length) return "";
  
  // 将 "me" 替换为 "我"
  const displayNames = likes.map((name) => (name === "me" ? "我" : name));
  
  return `
    <div class="xinliao-moment-likes">
      <span class="xinliao-moment-likes-icon">♥</span>
      <span class="xinliao-moment-likes-names">${displayNames.join("、")}</span>
    </div>
  `;
};

/**
 * 构建单条动态 HTML
 * @param {Object} moment - 动态数据
 * @returns {string} 动态 HTML
 */
const buildMomentMarkup = (moment) => {
  const timeStr = formatTime(moment.timestamp);
  const hasLiked = moment.likes.includes("me");
  const likeCount = moment.likes.length;
  const commentCount = moment.comments.length;

  const commentsHtml = moment.comments
    .map((c) => buildCommentMarkup(c, moment.id))
    .join("");

  const likesHtml = buildLikesMarkup(moment.likes);

  return `
    <div class="xinliao-moment-item" data-moment-id="${moment.id}">
      <div class="xinliao-moment-avatar">
        ${buildAvatarMarkup(moment.avatar)}
      </div>
      <div class="xinliao-moment-body">
        <div class="xinliao-moment-author">${moment.author}</div>
        <div class="xinliao-moment-content">${moment.content}</div>
        ${buildImagesMarkup(moment.images)}
        <div class="xinliao-moment-footer">
          <span class="xinliao-moment-time">${timeStr}</span>
          <div class="xinliao-moment-actions">
            <button class="xinliao-moment-action-btn xinliao-moment-like ${hasLiked ? "is-liked" : ""}" data-action="like">
              <span class="xinliao-moment-action-icon">${hasLiked ? "♥" : "♡"}</span>
              ${likeCount > 0 ? `<span class="xinliao-moment-action-count">${likeCount}</span>` : ""}
            </button>
            <button class="xinliao-moment-action-btn xinliao-moment-comment-btn" data-action="comment">
              <span class="xinliao-moment-action-icon">○···</span>
              ${commentCount > 0 ? `<span class="xinliao-moment-action-count">${commentCount}</span>` : ""}
            </button>
          </div>
        </div>
        ${likesHtml}
        ${
          moment.comments.length > 0
            ? `<div class="xinliao-moment-comments" data-moment-id="${moment.id}">${commentsHtml}</div>`
            : `<div class="xinliao-moment-comments is-empty" data-moment-id="${moment.id}"></div>`
        }
        <div class="xinliao-comment-input-wrapper is-hidden" data-moment-id="${moment.id}">
          <input type="text" class="xinliao-comment-input" placeholder="写评论..." />
          <button class="xinliao-comment-send-btn" type="button">发送</button>
        </div>
      </div>
    </div>
  `;
};

/**
 * 渲染动态列表
 * @param {HTMLElement} container - 容器元素
 * @param {Array} moments - 动态列表
 */
export const renderMomentsList = (container, moments) => {
  if (!container) return;

  if (!moments.length) {
    container.innerHTML = `
      <div class="xinliao-moments-empty">
        <div class="xinliao-moments-empty-icon">📷</div>
        <div class="xinliao-moments-empty-text">暂无动态</div>
        <div class="xinliao-moments-empty-hint">点击右上角相机发布第一条动态</div>
      </div>
    `;
    return;
  }

  container.innerHTML = moments.map(buildMomentMarkup).join("");
};

/**
 * 初始化动态模块
 * @returns {Object} 模块接口
 */
export const initMomentsModule = () => {
  // 动态列表
  let moments = loadStoredMoments();

  // DOM 元素
  const momentsList = getEl("xinliaoMomentsList");
  const momentsAdd = getEl("xinliaoMomentsAdd");
  const momentsEditor = getEl("xinliaoMomentsEditor");
  const editorContent = getEl("xinliaoMomentsContent");
  const editorImages = getEl("xinliaoMomentsImages");
  const editorImageInput = getEl("xinliaoMomentsImageInput");
  const editorPublish = getEl("xinliaoMomentsPublish");
  const editorCancel = getEl("xinliaoMomentsCancel");
  const momentsStatus = getEl("xinliaoMomentsStatus");
  const momentsCoverImg = getEl("xinliaoMomentsCoverImg");
  const momentsCover = getEl("xinliaoMomentsCover");

  // 已选择的图片
  let selectedImages = [];

  // 存储 key
  const COVER_STORAGE_KEY = "xinliaoCover";
  const USER_AVATAR_KEY = "xinliaoUserAvatar";
  const USER_NAME_KEY = "xinliaoUserName";

  // 用户头像和昵称元素
  const userAvatar = getEl("xinliaoMomentsUserAvatar");
  const username = getEl("xinliaoMomentsUsername");

  /**
   * 加载封面图片
   */
  const loadCover = () => {
    try {
      const cover = localStorage.getItem(COVER_STORAGE_KEY);
      if (cover && momentsCoverImg) {
        momentsCoverImg.src = cover;
      }
    } catch (e) {
      // 忽略
    }
  };

  /**
   * 保存封面图片
   * @param {string} dataUrl - 图片 data URL
   */
  const saveCover = (dataUrl) => {
    try {
      localStorage.setItem(COVER_STORAGE_KEY, dataUrl);
    } catch (e) {
      console.warn("保存封面失败", e);
    }
  };

  /**
   * 处理封面图片更换（文件上传）
   * @param {Event} event - 文件选择事件
   */
  const handleCoverFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (momentsCoverImg) {
        momentsCoverImg.src = dataUrl;
      }
      saveCover(dataUrl);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  /**
   * 设置封面图片（URL）
   * @param {string} url - 图片 URL
   */
  const setCoverFromUrl = (url) => {
    if (!url || !url.trim()) return;
    const trimmedUrl = url.trim();
    if (momentsCoverImg) {
      momentsCoverImg.src = trimmedUrl;
    }
    saveCover(trimmedUrl);
  };

  /**
   * 显示图片选择弹窗
   * @param {string} title - 弹窗标题
   * @param {Function} onFileSelect - 文件选择回调
   * @param {Function} onUrlInput - URL 输入回调
   */
  const showImagePickerDialog = (title, onFileSelect, onUrlInput) => {
    // 创建弹窗
    const overlay = document.createElement("div");
    overlay.className = "xinliao-image-picker-overlay";
    overlay.innerHTML = `
      <div class="xinliao-image-picker-dialog">
        <div class="xinliao-image-picker-title">${title}</div>
        <div class="xinliao-image-picker-options">
          <button class="xinliao-btn secondary xinliao-picker-file-btn">上传图片</button>
          <button class="xinliao-btn primary xinliao-picker-url-btn">输入链接</button>
        </div>
        <button class="xinliao-image-picker-cancel">取消</button>
      </div>
    `;

    // 关闭弹窗
    const closeDialog = () => {
      overlay.remove();
    };

    // 点击遮罩关闭
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    // 取消按钮
    overlay.querySelector(".xinliao-image-picker-cancel").addEventListener("click", closeDialog);

    // 上传图片按钮
    overlay.querySelector(".xinliao-picker-file-btn").addEventListener("click", () => {
      closeDialog();
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = onFileSelect;
      input.click();
    });

    // 输入链接按钮
    overlay.querySelector(".xinliao-picker-url-btn").addEventListener("click", () => {
      closeDialog();
      const url = prompt("请输入图片链接（图床 URL）");
      if (url && url.trim()) {
        onUrlInput(url.trim());
      }
    });

    document.body.appendChild(overlay);
  };

  /**
   * 加载用户头像
   */
  const loadUserAvatar = () => {
    try {
      const avatar = localStorage.getItem(USER_AVATAR_KEY);
      if (avatar && userAvatar) {
        userAvatar.innerHTML = `<img class="xinliao-avatar-image" src="${avatar}" alt="avatar" />`;
      }
    } catch (e) {
      // 忽略
    }
  };

  /**
   * 加载用户昵称
   */
  const loadUserName = () => {
    try {
      const name = localStorage.getItem(USER_NAME_KEY);
      if (name && username) {
        username.textContent = name;
      }
    } catch (e) {
      // 忽略
    }
  };

  /**
   * 处理用户头像文件上传
   * @param {Event} event - 文件选择事件
   */
  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (userAvatar) {
        userAvatar.innerHTML = `<img class="xinliao-avatar-image" src="${dataUrl}" alt="avatar" />`;
      }
      try {
        localStorage.setItem(USER_AVATAR_KEY, dataUrl);
      } catch (err) {
        console.warn("保存头像失败", err);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * 设置用户头像（URL）
   * @param {string} url - 图片 URL
   */
  const setAvatarFromUrl = (url) => {
    if (!url || !url.trim()) return;
    const trimmedUrl = url.trim();
    if (userAvatar) {
      userAvatar.innerHTML = `<img class="xinliao-avatar-image" src="${trimmedUrl}" alt="avatar" />`;
    }
    try {
      localStorage.setItem(USER_AVATAR_KEY, trimmedUrl);
    } catch (err) {
      console.warn("保存头像失败", err);
    }
  };

  /**
   * 处理用户头像点击（更换头像）
   */
  const handleAvatarClick = () => {
    showImagePickerDialog(
      "更换头像",
      handleAvatarFileChange,
      setAvatarFromUrl
    );
  };

  /**
   * 处理用户昵称点击（修改昵称）
   */
  const handleUsernameClick = () => {
    const currentName = username?.textContent || "我";
    const newName = prompt("请输入新昵称", currentName);
    if (newName && newName.trim()) {
      const trimmedName = newName.trim();
      if (username) {
        username.textContent = trimmedName;
      }
      try {
        localStorage.setItem(USER_NAME_KEY, trimmedName);
      } catch (err) {
        console.warn("保存昵称失败", err);
      }
    }
  };

  /**
   * 更新动态列表显示
   */
  const updateMomentsList = () => {
    renderMomentsList(momentsList, moments);
    // 隐藏状态提示
    if (momentsStatus) {
      momentsStatus.classList.add("is-hidden");
    }
  };

  /**
   * 打开发布编辑器
   */
  const openEditor = () => {
    if (!momentsEditor) return;
    momentsEditor.classList.remove("is-hidden");
    if (editorContent) {
      editorContent.value = "";
      editorContent.focus();
    }
    selectedImages = [];
    updateImagesPreview();
  };

  /**
   * 关闭发布编辑器
   */
  const closeEditor = () => {
    if (!momentsEditor) return;
    momentsEditor.classList.add("is-hidden");
    if (editorContent) editorContent.value = "";
    selectedImages = [];
    updateImagesPreview();
  };

  /**
   * 更新图片预览
   */
  const updateImagesPreview = () => {
    if (!editorImages) return;
    if (!selectedImages.length) {
      editorImages.innerHTML = "";
      return;
    }
    editorImages.innerHTML = selectedImages
      .map(
        (img, index) => `
          <div class="xinliao-editor-image" data-index="${index}">
            <img src="${img}" alt="preview" />
            <button class="xinliao-editor-image-remove" data-index="${index}">×</button>
          </div>
        `
      )
      .join("");
  };

  /**
   * 处理图片选择
   * @param {Event} event - 文件选择事件
   */
  const handleImageSelect = (event) => {
    const files = event.target.files;
    if (!files || !files.length) return;

    Array.from(files).forEach((file) => {
      if (selectedImages.length >= 9) return;
      const reader = new FileReader();
      reader.onload = () => {
        selectedImages.push(reader.result);
        updateImagesPreview();
      };
      reader.readAsDataURL(file);
    });

    // 清空 input 以便重复选择同一文件
    event.target.value = "";
  };

  /**
   * 移除已选图片
   * @param {number} index - 图片索引
   */
  const removeImage = (index) => {
    selectedImages.splice(index, 1);
    updateImagesPreview();
  };

  /**
   * 获取联系人列表（从 localStorage 或使用默认）
   * @returns {Array} 联系人列表
   */
  const getContacts = () => {
    try {
      const stored = localStorage.getItem("xinliaoContacts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      // 忽略
    }
    return placeholderContacts;
  };

  /**
   * 随机选择联系人评论动态
   * @param {string} momentId - 动态 ID
   * @param {string} momentContent - 动态内容
   */
  const requestContactComments = async (momentId, momentContent) => {
    // 检查是否配置了 API
    const profile = getActiveProfile();
    if (!profile?.url || !profile?.key || !profile?.model) {
      console.log("未配置 API，跳过自动评论");
      return;
    }

    const contacts = getContacts();
    if (!contacts.length) return;

    // 随机选择 2-5 个联系人（增加评论数量）
    const shuffled = [...contacts].sort(() => Math.random() - 0.5);
    const selectedCount = Math.min(Math.floor(Math.random() * 4) + 2, shuffled.length);
    const selectedContacts = shuffled.slice(0, selectedCount);

    // 为每个选中的联系人请求评论
    for (const contact of selectedContacts) {
      try {
        // 构建评论请求
        const commentPrompt = `你的朋友发了一条动态："${momentContent}"。请以你的角色身份写一条简短的评论回复（10-30字），像真实朋友圈评论一样自然。只输出评论内容，不要有任何其他文字。`;
        
        const replies = await requestChatReply({
          contact,
          chatHistory: [],
          userMessage: commentPrompt,
        });

        if (replies && replies.length > 0) {
          // 取第一条回复作为评论
          const commentContent = replies[0].replace(/^["']|["']$/g, "").trim();
          if (commentContent) {
            // 添加评论到动态
            moments = addComment(moments, momentId, {
              author: contact.name,
              content: commentContent,
            });
          }
        }

        // 添加随机延迟，模拟真实评论间隔
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
      } catch (err) {
        console.warn(`联系人 ${contact.name} 评论失败:`, err);
      }
    }

    // 更新显示
    updateMomentsList();
  };

  /**
   * 发布动态
   */
  const publishMoment = () => {
    const content = editorContent?.value.trim() || "";
    if (!content && !selectedImages.length) {
      return;
    }

    // 从 localStorage 读取用户设置的昵称和头像
    const storedName = localStorage.getItem(USER_NAME_KEY);
    const storedAvatar = localStorage.getItem(USER_AVATAR_KEY);

    const newMoment = {
      author: storedName || "我",
      avatar: storedAvatar || "👤",
      content,
      images: [...selectedImages],
      timestamp: Date.now(),
    };

    console.log("publishMoment: 发布动态", newMoment);
    moments = addMoment(moments, newMoment);
    console.log("publishMoment: 动态列表更新后", moments.length, "条");
    
    // 强制再次保存到 localStorage（确保保存成功）
    saveMoments(moments);
    console.log("publishMoment: 已保存到 localStorage");
    
    updateMomentsList();
    closeEditor();

    // 异步请求联系人点赞和评论（不阻塞发布流程）
    if (content) {
      const momentId = moments[0]?.id; // 新发布的动态在列表最前面
      if (momentId) {
        // 先请求点赞
        requestContactLikes(momentId, content);
        // 再请求评论
        requestContactComments(momentId, content);
      }
    }
  };

  /**
   * 处理点赞
   * @param {string} momentId - 动态 ID
   */
  const handleLike = (momentId) => {
    moments = toggleLike(moments, momentId, "me");
    updateMomentsList();
  };

  /**
   * 处理删除
   * @param {string} momentId - 动态 ID
   */
  const handleDelete = (momentId) => {
    moments = deleteMoment(moments, momentId);
    updateMomentsList();
  };

  // 绑定事件 - 打开编辑器
  momentsAdd?.addEventListener("click", openEditor);

  // 绑定事件 - 关闭编辑器
  editorCancel?.addEventListener("click", closeEditor);

  // 绑定事件 - 发布动态
  editorPublish?.addEventListener("click", publishMoment);

  // 绑定事件 - 选择图片
  editorImageInput?.addEventListener("change", handleImageSelect);

  // 绑定事件 - 移除图片
  editorImages?.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".xinliao-editor-image-remove");
    if (!removeBtn) return;
    const index = parseInt(removeBtn.dataset.index, 10);
    if (!isNaN(index)) {
      removeImage(index);
    }
  });

  // 当前回复状态
  let currentReplyTo = null; // { momentId, author } 或 null

  /**
   * 切换评论输入框显示
   * @param {string} momentId - 动态 ID
   * @param {string} replyToAuthor - 回复对象（可选）
   */
  const toggleCommentInput = (momentId, replyToAuthor = null) => {
    const inputWrapper = momentsList?.querySelector(`.xinliao-comment-input-wrapper[data-moment-id="${momentId}"]`);
    
    // 如果当前输入框已显示且没有指定回复对象，则收起
    if (inputWrapper && !inputWrapper.classList.contains("is-hidden") && !replyToAuthor && currentReplyTo?.momentId === momentId) {
      hideCommentInput();
      return;
    }

    // 隐藏所有其他输入框
    const allInputWrappers = momentsList?.querySelectorAll(".xinliao-comment-input-wrapper");
    allInputWrappers?.forEach((wrapper) => {
      wrapper.classList.add("is-hidden");
    });

    // 显示当前动态的输入框
    if (inputWrapper) {
      inputWrapper.classList.remove("is-hidden");
      const input = inputWrapper.querySelector(".xinliao-comment-input");
      if (input) {
        input.placeholder = replyToAuthor ? `回复 ${replyToAuthor}...` : "写评论...";
        input.focus();
      }
    }

    currentReplyTo = replyToAuthor ? { momentId, author: replyToAuthor } : { momentId, author: null };
  };

  /**
   * 隐藏评论输入框
   */
  const hideCommentInput = () => {
    const allInputWrappers = momentsList?.querySelectorAll(".xinliao-comment-input-wrapper");
    allInputWrappers?.forEach((wrapper) => {
      wrapper.classList.add("is-hidden");
    });
    currentReplyTo = null;
  };

  /**
   * 请求角色回复评论
   * @param {string} momentId - 动态 ID
   * @param {Object} userComment - 用户评论
   * @param {Object} moment - 动态数据
   */
  const requestReplyToComment = async (momentId, userComment, moment) => {
    const profile = getActiveProfile();
    if (!profile?.url || !profile?.key || !profile?.model) {
      return;
    }

    const contacts = getContacts();
    if (!contacts.length) return;

    // 获取被回复的角色（如果有）
    let targetContact = null;
    if (userComment.replyTo) {
      targetContact = contacts.find((c) => c.name === userComment.replyTo);
    }

    // 如果没有特定回复对象，随机选择一个角色回复
    if (!targetContact) {
      const shuffled = [...contacts].sort(() => Math.random() - 0.5);
      targetContact = shuffled[0];
    }

    if (!targetContact) return;

    try {
      // 构建评论上下文
      const recentComments = moment.comments.slice(-5).map((c) => `${c.author}：${c.content}`).join("\n");
      const commentPrompt = `在朋友圈动态下，有人评论了："${userComment.content}"${userComment.replyTo ? `（回复 ${userComment.replyTo}）` : ""}。
动态内容："${moment.content}"
最近的评论：
${recentComments}

请以你的角色身份写一条简短的回复（10-30字），像真实朋友圈评论一样自然。只输出评论内容，不要有任何其他文字。`;

      const replies = await requestChatReply({
        contact: targetContact,
        chatHistory: [],
        userMessage: commentPrompt,
      });

      if (replies && replies.length > 0) {
        const replyContent = replies[0].replace(/^["']|["']$/g, "").trim();
        if (replyContent) {
          // 添加角色回复
          moments = addComment(moments, momentId, {
            author: targetContact.name,
            content: replyContent,
            replyTo: userComment.author,
          });
          updateMomentsList();

          // 有概率触发其他角色互相评论
          if (Math.random() < 0.4 && contacts.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
            await requestContactInteraction(momentId, moment);
          }
        }
      }
    } catch (err) {
      console.warn("角色回复评论失败:", err);
    }
  };

  /**
   * 请求角色之间互相评论
   * @param {string} momentId - 动态 ID
   * @param {Object} moment - 动态数据
   */
  const requestContactInteraction = async (momentId, moment) => {
    const profile = getActiveProfile();
    if (!profile?.url || !profile?.key || !profile?.model) {
      return;
    }

    const contacts = getContacts();
    if (contacts.length < 2) return;

    // 获取最近评论的角色
    const recentCommentAuthors = moment.comments.slice(-3).map((c) => c.author);
    const availableContacts = contacts.filter((c) => !recentCommentAuthors.includes(c.name) || Math.random() < 0.3);

    if (!availableContacts.length) return;

    // 随机选择一个角色
    const shuffled = [...availableContacts].sort(() => Math.random() - 0.5);
    const contact = shuffled[0];

    // 随机选择一个要回复的评论
    const targetComment = moment.comments[Math.floor(Math.random() * moment.comments.length)];
    if (!targetComment || targetComment.author === contact.name) return;

    try {
      const commentPrompt = `在朋友圈动态下，${targetComment.author} 评论了："${targetComment.content}"。
动态内容："${moment.content}"

请以你的角色身份写一条简短的回复（10-30字），回复 ${targetComment.author} 的评论，像真实朋友圈评论一样自然。只输出评论内容，不要有任何其他文字。`;

      const replies = await requestChatReply({
        contact,
        chatHistory: [],
        userMessage: commentPrompt,
      });

      if (replies && replies.length > 0) {
        const replyContent = replies[0].replace(/^["']|["']$/g, "").trim();
        if (replyContent) {
          moments = addComment(moments, momentId, {
            author: contact.name,
            content: replyContent,
            replyTo: targetComment.author,
          });
          updateMomentsList();
        }
      }
    } catch (err) {
      console.warn("角色互动评论失败:", err);
    }
  };

  /**
   * 处理用户发送评论
   * @param {string} momentId - 动态 ID
   * @param {string} content - 评论内容
   */
  const handleSendComment = async (momentId, content) => {
    if (!content.trim()) return;

    const moment = moments.find((m) => m.id === momentId);
    if (!moment) return;

    // 获取用户昵称
    const userName = localStorage.getItem(USER_NAME_KEY) || "我";

    // 创建用户评论
    const userComment = {
      author: userName,
      content: content.trim(),
      replyTo: currentReplyTo?.author || null,
    };

    // 添加评论
    moments = addComment(moments, momentId, userComment);
    updateMomentsList();
    hideCommentInput();

    // 异步请求角色回复
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
    await requestReplyToComment(momentId, userComment, moment);
  };

  // 绑定事件 - 动态列表交互
  momentsList?.addEventListener("click", (event) => {
    // 处理点赞和评论按钮
    const actionBtn = event.target.closest(".xinliao-moment-action-btn");
    if (actionBtn) {
      const momentItem = event.target.closest(".xinliao-moment-item");
      if (!momentItem) return;

      const momentId = momentItem.dataset.momentId;
      const action = actionBtn.dataset.action;

      if (action === "like") {
        handleLike(momentId);
      } else if (action === "comment") {
        toggleCommentInput(momentId);
      }
      return;
    }

    // 处理点击评论区域（回复某人）
    const commentEl = event.target.closest(".xinliao-moment-comment");
    if (commentEl) {
      const commentsWrapper = commentEl.closest(".xinliao-moment-comments");
      const momentId = commentsWrapper?.dataset.momentId;
      const author = commentEl.dataset.author;
      if (momentId && author) {
        toggleCommentInput(momentId, author);
      }
      return;
    }

    // 处理发送评论按钮
    const sendBtn = event.target.closest(".xinliao-comment-send-btn");
    if (sendBtn) {
      const inputWrapper = sendBtn.closest(".xinliao-comment-input-wrapper");
      const momentId = inputWrapper?.dataset.momentId;
      const input = inputWrapper?.querySelector(".xinliao-comment-input");
      if (momentId && input) {
        handleSendComment(momentId, input.value);
        input.value = "";
      }
      return;
    }
  });

  // 绑定事件 - 评论输入框回车发送
  momentsList?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      const input = event.target.closest(".xinliao-comment-input");
      if (input) {
        event.preventDefault();
        const inputWrapper = input.closest(".xinliao-comment-input-wrapper");
        const momentId = inputWrapper?.dataset.momentId;
        if (momentId) {
          handleSendComment(momentId, input.value);
          input.value = "";
        }
      }
    }
  });

  /**
   * 处理删除单条评论
   * @param {string} momentId - 动态 ID
   * @param {string} commentId - 评论 ID
   */
  const handleDeleteComment = (momentId, commentId) => {
    moments = deleteComment(moments, momentId, commentId);
    updateMomentsList();
  };

  // 长按评论删除
  let commentLongPressTimer = null;
  momentsList?.addEventListener("pointerdown", (event) => {
    const commentEl = event.target.closest(".xinliao-moment-comment");
    if (commentEl) {
      const commentsWrapper = commentEl.closest(".xinliao-moment-comments");
      const momentId = commentsWrapper?.dataset.momentId;
      const commentId = commentEl.dataset.commentId;
      
      if (momentId && commentId) {
        commentLongPressTimer = setTimeout(() => {
          if (confirm("确定要删除这条评论吗？")) {
            handleDeleteComment(momentId, commentId);
          }
        }, 500);
      }
      return;
    }

    // 长按删除动态
    const momentItem = event.target.closest(".xinliao-moment-item");
    if (!momentItem) return;

    longPressTimer = setTimeout(() => {
      const momentId = momentItem.dataset.momentId;
      if (confirm("确定要删除这条动态吗？")) {
        handleDelete(momentId);
      }
    }, 800);
  });

  // 长按删除动态
  let longPressTimer = null;

  momentsList?.addEventListener("pointerup", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (commentLongPressTimer) {
      clearTimeout(commentLongPressTimer);
      commentLongPressTimer = null;
    }
  });

  momentsList?.addEventListener("pointerleave", () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (commentLongPressTimer) {
      clearTimeout(commentLongPressTimer);
      commentLongPressTimer = null;
    }
  });

  /**
   * 请求角色点赞动态
   * @param {string} momentId - 动态 ID
   * @param {string} momentContent - 动态内容
   */
  const requestContactLikes = async (momentId, momentContent) => {
    const contacts = getContacts();
    if (!contacts.length) return;

    // 随机选择 1-3 个联系人点赞
    const shuffled = [...contacts].sort(() => Math.random() - 0.5);
    const likeCount = Math.min(Math.floor(Math.random() * 3) + 1, shuffled.length);
    const selectedContacts = shuffled.slice(0, likeCount);

    // 为每个选中的联系人添加点赞
    for (const contact of selectedContacts) {
      // 随机延迟，模拟真实点赞间隔
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 800));
      moments = addContactLike(moments, momentId, contact.name);
      updateMomentsList();
    }
  };

  // 绑定事件 - 点击封面更换背景图
  momentsCover?.addEventListener("click", () => {
    showImagePickerDialog(
      "更换封面",
      handleCoverFileChange,
      setCoverFromUrl
    );
  });

  // 绑定事件 - 更换用户头像
  userAvatar?.addEventListener("click", handleAvatarClick);

  // 绑定事件 - 修改用户昵称
  username?.addEventListener("click", handleUsernameClick);

  /**
   * 角色发布动态
   * @param {Object} contact - 角色信息
   * @param {string} content - 动态内容（可选，如果不提供则由 API 生成）
   */
  const publishContactMoment = async (contact, content = null) => {
    if (!contact) {
      console.log("publishContactMoment: contact 为空");
      return;
    }

    console.log("publishContactMoment: 开始为角色发动态", contact.name);

    let momentContent = content;

    // 如果没有提供内容，调用 API 生成
    if (!momentContent) {
      const profile = getActiveProfile();
      if (!profile?.url || !profile?.key || !profile?.model) {
        console.log("未配置 API，无法生成动态内容");
        return;
      }

      try {
        const momentPrompt = `请以你的角色身份发一条朋友圈动态（20-80字），内容可以是日常生活、心情感悟、分享趣事等，像真实朋友圈一样自然。只输出动态内容，不要有任何其他文字。`;

        console.log("publishContactMoment: 调用 API 生成动态内容...");
        const replies = await requestChatReply({
          contact,
          chatHistory: [],
          userMessage: momentPrompt,
        });

        console.log("publishContactMoment: API 返回", replies);

        if (replies && replies.length > 0) {
          momentContent = replies[0].replace(/^["']|["']$/g, "").trim();
        }
      } catch (err) {
        console.warn("生成动态内容失败:", err);
        return;
      }
    }

    if (!momentContent) {
      console.log("publishContactMoment: 没有生成动态内容");
      return;
    }

    console.log("publishContactMoment: 动态内容", momentContent);

    // 发布动态
    const newMoment = {
      author: contact.name,
      avatar: contact.avatar || "👤",
      content: momentContent,
      images: [],
      timestamp: Date.now(),
    };

    console.log("publishContactMoment: 添加动态", newMoment);
    moments = addMoment(moments, newMoment);
    console.log("publishContactMoment: 动态列表更新后", moments.length, "条");
    
    // 强制保存到 localStorage
    saveMoments(moments);
    console.log("publishContactMoment: 已保存到 localStorage");
    
    updateMomentsList();
    console.log("publishContactMoment: UI 已更新");

    // 异步请求其他联系人评论
    const momentId = moments[0]?.id;
    if (momentId) {
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
      await requestContactComments(momentId, momentContent);
    }

    return momentId;
  };

  /**
   * 角色评论用户的动态
   * @param {Object} contact - 角色信息
   * @param {string} momentId - 动态 ID（可选，如果不提供则评论最新动态）
   */
  const contactCommentOnMoment = async (contact, momentId = null) => {
    if (!contact) return;

    const profile = getActiveProfile();
    if (!profile?.url || !profile?.key || !profile?.model) {
      return;
    }

    // 如果没有指定动态，找用户最新的动态
    let targetMoment = null;
    if (momentId) {
      targetMoment = moments.find((m) => m.id === momentId);
    } else {
      // 找用户发的最新动态
      const userName = localStorage.getItem(USER_NAME_KEY) || "我";
      targetMoment = moments.find((m) => m.author === userName);
    }

    if (!targetMoment) {
      console.log("没有找到可评论的动态");
      return;
    }

    try {
      const commentPrompt = `你的朋友发了一条动态："${targetMoment.content}"。请以你的角色身份写一条简短的评论回复（10-30字），像真实朋友圈评论一样自然。只输出评论内容，不要有任何其他文字。`;

      const replies = await requestChatReply({
        contact,
        chatHistory: [],
        userMessage: commentPrompt,
      });

      if (replies && replies.length > 0) {
        const commentContent = replies[0].replace(/^["']|["']$/g, "").trim();
        if (commentContent) {
          moments = addComment(moments, targetMoment.id, {
            author: contact.name,
            content: commentContent,
          });
          updateMomentsList();
        }
      }
    } catch (err) {
      console.warn("角色评论失败:", err);
    }
  };

  // 初始化
  loadCover();
  loadUserAvatar();
  loadUserName();
  updateMomentsList();

  // 返回模块接口
  return {
    updateMomentsList,
    getMoments: () => moments,
    reloadMoments: () => {
      moments = loadStoredMoments();
      updateMomentsList();
    },
    // 新增：角色发动态
    publishContactMoment,
    // 新增：角色评论动态
    contactCommentOnMoment,
  };
};
