/**
 * Gets a base64-encoded frame from a video.
 * Typically the video comes from a phone camera.
 */
export function getDataUrlFromFile(file, cb) {
  const reader = new FileReader();
  reader.addEventListener('load', () => cb(reader.result));
  reader.readAsDataURL(file);
}

/**
 * Gets a base64-encoded frame from a video.
 * Typically the video comes from a phone camera.
 */
export function getDataUrlFromVideo(video, canvas) {
  // This is not defined in tests run in jsdom.
  if (!navigator.getUserMedia) return '';

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Gets the file size, width, and height of an image file
 * where the size is in bytes and width/height are in pixels.
 * @param {R} file a File object
 * @param {*} cb a function that will be passed the size, width, and height
 */
export function getImageSize(file, cb) {
  const img = new Image();
  img.src = window.URL.createObjectURL(file);
  img.onload = () => {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    window.URL.revokeObjectURL(img.src);
    cb(file.size, width, height);
  };
}
