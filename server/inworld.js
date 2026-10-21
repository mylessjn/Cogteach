// Server-side Inworld client: Router (Gemini) for Build and Curate, TTS for
// Speak. Uses INWORLD_API_KEY, so this file must only ever run on the server.
import { groupById } from '../src/lib/groups.js'

const API = 'https://api.inworld.ai'
const MODEL = 'google-ai-studio/gemini-3.1-flash-lite'
const TTS_MODEL = 'inworld-tts-2'
const TTS_VOICE = 'Ashley'

function apiKey() {
  const key = process.env.INWORLD_API_KEY
  if (!key) throw new Error('INWORLD_API_KEY is not set. Add it to .env.local.')
  return key
}

export class InworldError extends Error {}

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
    throw new InworldError(`Inworld ${path} failed with ${res.status}`)
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
      'You are a curriculum designer. Turn the teacher\'s prompt (a topic and goals) into a base lesson.',
      'Write 3 to 5 sections. Be accurate and neutral.',
      'Return only JSON in this shape:',
      '{ "title": string, "objective": string, "sections": [{ "heading": string, "content": string }] }',
    ].join('\n'),
    prompt,
  )
  const ok =
    isText(lesson?.title) &&
    Array.isArray(lesson.sections) &&
    lesson.sections.length >= 3 &&
    lesson.sections.length <= 5 &&
    lesson.sections.every((s) => isText(s.heading) && isText(s.content))
  if (!ok) throw new LessonFormatError('The base lesson was not in the expected shape.')
  return {
    title: lesson.title,
    objective: isText(lesson.objective) ? lesson.objective : '',
    sections: lesson.sections.map(({ heading, content }) => ({ heading, content })),
  }
}

// 2. Curate: base lesson + age group -> age version with the same sections.
export async function curate(lesson, groupId) {
  const group = groupById(groupId)
  if (!group) throw new LessonFormatError(`Unknown age group ${groupId}.`)
  const n = lesson.sections.length
  const version = await chatJson(
    [
      `Rewrite this lesson for ${group.description}.`,
      `Keep exactly ${n} sections, in the same order, one for each section of the base lesson.`,
      `Remove anything not safe or appropriate for ages ${group.minAge} to ${group.maxAge}.`,
      'Each section has a heading, a body, and a short activity the learner can do.',
      'Return only JSON in this shape:',
      '{ "title": string, "sections": [{ "heading": string, "body": string, "activity": string }] }',
    ].join('\n'),
    JSON.stringify(lesson),
  )
  const ok =
    isText(version?.title) &&
    Array.isArray(version.sections) &&
    version.sections.length === n &&
    version.sections.every((s) => isText(s.heading) && isText(s.body))
  if (!ok) throw new LessonFormatError('The age version was not in the expected shape.')
  return {
    title: version.title,
    sections: version.sections.map(({ heading, body, activity }) => ({
      heading,
      body,
      activity: isText(activity) ? activity : '',
    })),
  }
}

// 3. Speak: text -> base64 MP3. Low bitrate keeps it small enough to store.
export async function speak(text) {
  const data = await post('/tts/v1/voice', {
    text: text.slice(0, 2000),
    voiceId: TTS_VOICE,
    modelId: TTS_MODEL,
    audioConfig: { audioEncoding: 'MP3', bitRate: 48000, speakingRate: 0.9 },
  })
  if (!data?.audioContent) throw new InworldError('Inworld TTS returned no audio.')
  return data.audioContent
}

export function checkApiKey() {
  apiKey()
}
