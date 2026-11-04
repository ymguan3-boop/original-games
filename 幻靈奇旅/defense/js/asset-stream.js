/* Yield between decoded/batched assets; never monopolize the main thread. */
export async function streamAssets(tasks, concurrency = 2, yieldControl = () => new Promise(resolve => setTimeout(resolve, 0))) {
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      try { await task(); } catch (error) { console.warn('守護戰素材稍後重試', error); }
      await yieldControl();
    }
  };
  await Promise.all(Array.from({length: Math.min(Math.max(1, concurrency), tasks.length)}, worker));
}

export function createImageCache(ImageType = Image) {
  const images = new Map();
  return src => {
    if (!images.has(src)) images.set(src, new Promise(resolve => {
      const image = new ImageType(); image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => { images.delete(src); resolve(null); };
      image.src = src;
    }));
    return images.get(src);
  };
}
