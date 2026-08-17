// Vercel serverless functions cap the total request body at ~4.5MB
// regardless of multer's own per-file limits (5MB/10MB) - a registration
// submission with real phone-camera photos for the logo/profile picture
// can blow past that before Express ever sees the request, surfacing as a
// generic "Cannot submit registration" (axios has no JSON body to read an
// error message from). Compressing images client-side, using only the
// browser's native Canvas API, keeps typical submissions well under that
// ceiling without touching any backend validation.
export async function compressImageFile(file, { maxDimension = 1200, maxBytes = 500 * 1024 } = {}) {
  if (!file || !file.type?.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / bitmap.width, maxDimension / bitmap.height)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

  let quality = 0.85
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.15
    // eslint-disable-next-line no-await-in-loop
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  }

  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
}
