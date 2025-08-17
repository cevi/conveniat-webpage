export const checkImageDimensions = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      const img = new Image();
      img.addEventListener('load', () => {
        resolve(img.width >= 1920 && img.height >= 1080);
      });
      img.src = event.target?.result as string;
    });
    reader.readAsDataURL(file);
  });
};
