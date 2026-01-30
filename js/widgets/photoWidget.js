/**
 * 照片小组件：支持点击替换照片（图床链接或本地文件）
 */

export const initPhotoWidget = () => {
  const photoImg = document.getElementById('photoImg');

  if (!photoImg) return;

  const PHOTO_STORAGE_KEY = 'notebookPhotoWidget';
  const loadStoredPhoto = () => {
    try {
      const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('读取手账照片失败:', error);
      return null;
    }
  };
  const savePhoto = (src, alt = '') => {
    try {
      localStorage.setItem(
        PHOTO_STORAGE_KEY,
        JSON.stringify({ src, alt })
      );
    } catch (error) {
      console.warn('保存手账照片失败:', error);
    }
  };

  const storedPhoto = loadStoredPhoto();
  if (storedPhoto?.src) {
    photoImg.src = storedPhoto.src;
    if (storedPhoto.alt) {
      photoImg.alt = storedPhoto.alt;
    }
  }

  // 创建菜单元素（如果不存在）
  let menu = document.getElementById('photoMenu');
  let overlay = document.getElementById('photoMenuOverlay');

  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'photoMenu';
    menu.className = 'photo-menu';
    menu.innerHTML = `
      <button class="photo-menu-btn" id="photoMenuUpload">📁 上传本地图片</button>
      <button class="photo-menu-btn" id="photoMenuUrl">🔗 输入图片链接</button>
      <button class="photo-menu-btn" id="photoMenuCancel">✕ 取消</button>
    `;
    document.body.appendChild(menu);

    overlay = document.createElement('div');
    overlay.id = 'photoMenuOverlay';
    overlay.className = 'photo-menu-overlay';
    document.body.appendChild(overlay);
  }

  const closeMenu = () => {
    menu.classList.remove('show');
    overlay.classList.remove('show');
  };

  const photoArea = photoImg.closest('.notebook-photo-stack') || photoImg;

  const showMenu = () => {
    const rect = (photoArea || photoImg).getBoundingClientRect();

    // 先测量菜单尺寸，方便居中定位
    menu.style.display = 'flex';
    menu.style.visibility = 'hidden';
    const menuWidth = menu.offsetWidth;
    menu.style.display = '';
    menu.style.visibility = '';

    const margin = 12;
    const viewportWidth = window.innerWidth;
    const top = rect.bottom + margin;
    const left = Math.min(
      viewportWidth - menuWidth - margin,
      Math.max(margin, rect.left + (rect.width - menuWidth) / 2)
    );

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.classList.add('show');
    overlay.classList.add('show');
  };

  // 点击右页区域（含图片周边）显示菜单，扩大触发范围
  const bindTarget = photoArea || photoImg;
  bindTarget.addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu();
  });

  // 上传本地图片
  document.getElementById('photoMenuUpload').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result || '';
          photoImg.src = result;
          photoImg.alt = file.name;
          savePhoto(result, file.name);
          closeMenu();
        };
        reader.readAsDataURL(file);
      }
    });

    input.click();
  });

  // 输入图片链接
  document.getElementById('photoMenuUrl').addEventListener('click', () => {
    const url = prompt('请输入图片链接（支持 http/https URL）:', photoImg.src);
    if (url && url.trim()) {
      const nextUrl = url.trim();
      photoImg.src = nextUrl;
      savePhoto(nextUrl, photoImg.alt || '');
      closeMenu();
    }
  });

  // 取消
  document.getElementById('photoMenuCancel').addEventListener('click', closeMenu);

  // 点击菜单外部关闭
  overlay.addEventListener('click', closeMenu);
};
