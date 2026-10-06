export const fileToDataUrl = (f: Blob) =>
  new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });

export async function resizeImage(src: string, max = 1024): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export async function videoFrames(file: File, count = 8): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url; v.muted = true; v.preload = "auto";
  await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = () => j(new Error("Cannot read this video")); });
  const c = document.createElement("canvas");
  const k = Math.min(1, 768 / Math.max(v.videoWidth, v.videoHeight));
  c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    v.currentTime = (v.duration * (i + 0.5)) / count;
    await new Promise((r) => (v.onseeked = r));
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    out.push(c.toDataURL("image/jpeg", 0.8));
  }
  URL.revokeObjectURL(url);
  return out;
}

export async function blobToBase64(b: Blob) {
  return (await fileToDataUrl(b)).split(",")[1] ?? "";
}
