// Server-side Inworld client: Router (Gemini) for Build, Curate and Picture,
// TTS for Speak, STT for Listen. Uses INWORLD_API_KEY, so this file must only
// ever run on the server.
import { groupById } from '../src/lib/groups.js'
import {
  StudySetError,
  normalizeStudySet,
  studySetFocus,
  studySetJsonShape,
} from '../src/lib/studyset.js'

const API = 'https://api.inworld.ai'
const MODEL = 'google-ai-studio/gemini-3.1-flash-lite'
const IMAGE_MODEL = 'google-ai-studio/gemini-nano-banana-2.1'
const TTS_MODEL = 'inworld-tts-2'
const TTS_VOICE = 'Ashley'
const STT_MODEL = 'inworld/inworld-stt-1'

function apiKey() {
  const key = process.env.INWORLD_API_KEY
  if (!key) throw new Error('INWORLD_API_KEY is not set. Add it to .env.local.')
  return key
}

export class InworldError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

// The model returned something we can't use; the teacher can regenerate.
export class LessonFormatError extends Error {}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    console.error(`Inworld ${path} failed with ${res.status}`, data)
    throw new InworldError(
      `Inworld ${path} failed with ${res.status}`,
      res.status,
      data?.error?.message ?? data?.message,
    )
  }
  return data
}

async function chatJson(system, user) {
  const data = await post('/v1/chat/completions', {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
  })
  const text = data.choices?.[0]?.message?.content ?? ''
  try {
    return JSON.parse(text)
  } catch {
    throw new LessonFormatError('The model did not return valid JSON.')
  }
}

const isText = (v) => typeof v === 'string' && v.trim().length > 0

// 1. Build: teacher's prompt -> base lesson.
export async function build(prompt) {
  const lesson = await chatJson(
    [
      "You are a curriculum designer. Turn the teacher's prompt (a topic and goals) into a base lesson.",
      'Write 3 to 5 sections. Be accurate and neutral. If it is a language lesson, include the key words and phrases.',
      'Return only JSON in this shape:',
      '{ "title": string, "objective": string, "sections": [{ "heading": string, "content": string }] }',
    ].join('\n'),
    prompt,
  )
  const ok =
    isText(lesson?.title) &&
    Array.isArray(lesson.sections) &&
    lesson.sections.length >= 3 &&
    lesson.sections.every((s) => isText(s.heading) && isText(s.content))
  if (!ok) throw new LessonFormatError('The base lesson was not in the expected shape.')
  return {
    title: lesson.title,
    objective: isText(lesson.objective) ? lesson.objective : '',
    sections: lesson.sections.slice(0, 5).map(({ heading, content }) => ({ heading, content })),
  }
}

// 2. Curate: base lesson + age group -> that group's study set.
export async function curate(lesson, groupId) {
  const group = groupById(groupId)
  if (!group) throw new LessonFormatError(`Unknown age group ${groupId}.`)
  const raw = await chatJson(
    [
      `Turn this lesson into a study set for ${studySetFocus(groupId)}.`,
      `Remove anything not safe or appropriate for ages ${group.minAge} to ${group.maxAge}.`,
      'Any topic works. For a language lesson, the words and lines are in the language being learned; otherwise use the key terms of the topic in English and set "language" to "en".',
      'Return only JSON in this shape (comments explain each field; do not include them):',
      studySetJsonShape(groupId),
    ].join('\n'),
    JSON.stringify(lesson),
  )
  try {
    return normalizeStudySet(groupId, raw)
  } catch (err) {
    if (err instanceof StudySetError) throw new LessonFormatError(err.message)
    throw err
  }
}

// 3. Picture: description -> cartoon image (data URL). 3–6 and 7–11 only.
export async function picture(description) {
  const data = await post('/v1/chat/completions', {
    model: IMAGE_MODEL,
    messages: [
      {
        role: 'user',
        content: `A friendly, simple cartoon picture for a young child's flashcard: ${description}. Flat bright colors, plain white background, one clear subject, no text or letters, nothing scary.`,
      },
    ],
    modalities: ['text', 'image'],
    stream: false,
    image_config: { aspect_ratio: '1:1', image_size: '1K' },
  })
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) throw new InworldError('The image model returned no picture.', 502)
  if (url.startsWith('data:')) return url
  // An https download URL: fetch it and hand back a data URL.
  const res = await fetch(url)
  if (!res.ok) throw new InworldError('Could not download the picture.', 502)
  const type = res.headers.get('content-type') ?? 'image/png'
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
}

// Inworld allows 5 TTS requests at once on this plan; keep the whole server
// under that and retry when it still says 429.
const TTS_LIMIT = 4
let ttsActive = 0
const ttsWaiting = []
async function withTtsSlot(fn) {
  if (ttsActive >= TTS_LIMIT) await new Promise((resolve) => ttsWaiting.push(resolve))
  ttsActive += 1
  try {
    return await fn()
  } finally {
    ttsActive -= 1
    ttsWaiting.shift()?.()
  }
}

// 4. Speak: text -> base64 MP3. Low bitrate keeps it small enough to store.
export async function speak(text, language) {
  const body = {
    text: text.slice(0, 2000),
    voiceId: TTS_VOICE,
    modelId: TTS_MODEL,
    ...(language && { language }),
    audioConfig: { audioEncoding: 'MP3', bitRate: 48000, speakingRate: 0.9 },
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const data = await withTtsSlot(() => post('/tts/v1/voice', body))
      if (!data?.audioContent) throw new InworldError('Inworld TTS returned no audio.', 502)
      return data.audioContent
    } catch (err) {
      if (!(err instanceof InworldError) || err.status !== 429 || attempt >= 4) throw err
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
}

// 5. Listen: a short mic clip (base64, any common container) -> transcript.
export async function listen(audio, language) {
  const data = await post('/stt/v1/transcribe', {
    transcribeConfig: {
      modelId: STT_MODEL,
      audioEncoding: 'AUTO_DETECT',
      ...(language && { language }),
    },
    audioData: { content: audio },
  })
  return data?.transcription?.transcript ?? ''
}

export function checkApiKey() {
  apiKey()
}
