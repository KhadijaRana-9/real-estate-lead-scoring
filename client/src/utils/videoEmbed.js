// Real URL parsing, not a video provider integration - detects YouTube/
// Vimeo links so they render as an embedded player instead of an
// (unplayable) native <video> tag pointed at a webpage URL. Anything
// else is assumed to be a direct file link (mp4/mov/webm from local/
// Cloudinary/S3 upload) and rendered with the native player.
export function getVideoEmbed(url) {
  if (!url) return null

  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/)
  if (youtubeMatch) {
    return { type: 'embed', src: `https://www.youtube.com/embed/${youtubeMatch[1]}` }
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return { type: 'embed', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  return { type: 'native', src: url }
}
