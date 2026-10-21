import { api } from '../../kid/claim.js'
import { publishVersion } from '../../lib/data.js'
import { spokenParts } from '../../lib/studyset.js'

// Runs `fn` over items with at most `limit` in flight.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

// Publishes one age group's study set. Every spoken part is recorded once now
// (Inworld TTS), and the reviewed pictures are stored, so opening a lesson
// never calls the AI. `pictures` = { [key]: dataUrl }.
export async function publishStudySet({ token, teacherId, classId, lessonId, groupId, studySet, pictures = {} }) {
  const parts = spokenParts(groupId, studySet)
  const audio = await mapLimit(parts, 4, async (p) => {
    const language = p.english ? 'en' : studySet.language
    return (await api(token, 'POST', '/api/speak', { text: p.text, language })).audio
  })
  const media = {}
  parts.forEach((p, i) => {
    media[p.key] = { mp3: audio[i] }
  })
  for (const [key, img] of Object.entries(pictures)) {
    if (img) media[key] = { ...media[key], img }
  }
  await publishVersion(classId, lessonId, groupId, studySet, teacherId, media)
}

// Shrinks a picture to a square JPEG so it fits in Firestore.
export function shrinkImage(dataUrl, size = 384) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => reject(new Error('Could not read the picture.'))
    img.src = dataUrl
  })
}

// Asks the server for one cartoon picture and shrinks it.
export async function makePicture(token, description) {
  const { image } = await api(token, 'POST', '/api/picture', { description }, { timeoutMs: 90000 })
  return shrinkImage(image)
}
