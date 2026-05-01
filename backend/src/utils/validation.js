export const isAllowedType = (mimetype) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'video/mp4', 'application/pdf'];
  return allowedTypes.includes(mimetype);
};

export const getMaxSize = (mimetype) => {
  if (mimetype.startsWith('video/')) return 200 * 1024 * 1024;
  return 10 * 1024 * 1024;
};
