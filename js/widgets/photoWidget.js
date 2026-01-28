/**
 * 照片小组件：支持点击替换照片（图床链接或本地文件）
 */

export const initPhotoWidget = () => {
  const photoImg = document.getElementById('photoImg');

  if (!photoImg) return;

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

  const showMenu = (e) => {
    const rect = photoImg.getBoundingClientRect();
    menu.style.top = Math.max(10, rect.top - menu.offsetHeight - 10) + 'px';
    menu.style.left = Math.max(10, rect.left + (rect.width - menu.offsetWidth) / 2) + 'px';
    menu.classList.add('show');
    overlay.classList.add('show');
  };

  // 点击图片显示菜单
  photoImg.addEventListener('click', (e) => {
    e.stopPropagation();
    showMenu(e);
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
          photoImg.src = event.target?.result || '';
          photoImg.alt = file.name;
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
      photoImg.src = url.trim();
      closeMenu();
    }
  });

  // 取消
  document.getElementById('photoMenuCancel').addEventListener('click', closeMenu);

  // 点击菜单外部关闭
  overlay.addEventListener('click', closeMenu);
};

