/**
 * 照片小组件：支持点击替换照片（图床链接或本地文件）
 */

export const initPhotoWidget = () => {
  const photoElement = document.getElementById('notebookPhoto');
  const photoImg = document.getElementById('photoImg');

  if (!photoElement || !photoImg) return;

  photoElement.addEventListener('click', () => {
    // 创建隐藏的输入框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        // 本地文件：使用 FileReader 转换为 data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          photoImg.src = event.target?.result || '';
          photoImg.alt = file.name;
        };
        reader.readAsDataURL(file);
      }
    });

    input.click();
  });

  // 添加长按或 Shift+Click 支持输入链接
  photoElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const url = prompt('请输入图片链接（支持 http/https URL）:', photoImg.src);
    if (url && url.trim()) {
      photoImg.src = url.trim();
    }
  });

  // Shift + Click 也支持输入链接
  photoElement.addEventListener('click', (e) => {
    if (e.shiftKey) {
      const url = prompt('请输入图片链接（支持 http/https URL）:', photoImg.src);
      if (url && url.trim()) {
        photoImg.src = url.trim();
      }
    }
  });
};
