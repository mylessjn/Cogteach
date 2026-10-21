import { useCallback, useEffect, useRef, useState } from 'react'
import { useKidPermission } from '@k-id/core'
import { getMedia, getVersion, listenLessons, listenProgress } from '../../lib/data.js'

// Hearing the Inworld voice and saying words into the mic need ai-voice-mode.
export const useVoice = () => useKidPermission().can('ai-voice-mode')

// Published lessons for one age group, with each study set's title.
export function useLessons(classId, group) {
  const [lessons, setLessons] = useState(null)
  useEffect(
    () =>
      listenLessons(classId, async (all) => {
        const mine = all.filter((l) => l.publishedGroups?.includes(group))
        const withSets = await Promise.all(
          mine.map(async (l) => ({ ...l, studySet: await getVersion(classId, l.id, group) })),
        )
        // Lessons from before v2 (with `sections`) need to be made again.
        setLessons(withSets.filter((l) => l.studySet?.status === 'published' && !l.studySet.sections))
      }),
    [classId, group],
  )
  return lessons
}

export function useProgress(classId, accountId) {
  const [progress, setProgress] = useState(null)
  useEffect(() => listenProgress(classId, accountId, setProgress), [classId, accountId])
  return progress
}

// One lesson's study set and media. undefined = loading, null = not available.
export function useStudySet(classId, lessonId, group) {
  const [state, setState] = useState(undefined)
  useEffect(() => {
    let cancelled = false
    Promise.all([getVersion(classId, lessonId, group), getMedia(classId, lessonId, group)]).then(
      ([studySet, media]) => {
        if (cancelled) return
        setState(studySet?.status === 'published' && !studySet.sections ? { studySet, media } : null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [classId, lessonId, group])
  return state
}

// Seconds since the lesson opened.
export function useTimer() {
  const start = useRef(0)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    start.current = Date.now()
    const t = setInterval(() => setSeconds(Math.round((Date.now() - start.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  return seconds
}

// ---- audio ----
let current = null
export function playMp3(mp3) {
  if (!mp3) return null
  current?.pause()
  current = new Audio(`data:audio/mpeg;base64,${mp3}`)
  current.play().catch(() => {})
  return current
}

// Records a short mic clip and returns it as base64 (webm/opus or mp4).
export function useRecorder() {
  const [state, setState] = useState('idle') // idle | recording | error
  const record = useCallback(async (ms = 2500) => {
    setState('recording')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      const done = new Promise((resolve) => {
        recorder.onstop = resolve
      })
      recorder.start()
      await new Promise((r) => setTimeout(r, ms))
      recorder.stop()
      await done
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: recorder.mimeType })
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.readAsDataURL(blob)
      })
      setState('idle')
      return base64
    } catch (err) {
      setState('error')
      throw err
    }
  }, [])
  return { state, record }
}

// ---- answers ----
const clean = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

// Did the student say the target word? Forgiving: accents, punctuation, an
// article in front ("el perro"), and one or two letters off all count.
export function saidWord(transcript, target) {
  const heard = clean(transcript)
  const want = clean(target)
  if (!heard || !want) return false
  if (heard === want || heard.split(' ').includes(want) || heard.includes(want)) return true
  const slack = want.length > 5 ? 2 : 1
  return heard.split(' ').some((w) => distance(w, want) <= slack)
}

// ---- streaks ----
// Days in a row studied, ending today or yesterday.
export function streak(days = []) {
  const set = new Set(days)
  const d = new Date()
  if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(d.toISOString().slice(0, 10))) {
    n += 1
    d.setDate(d.getDate() - 1)
  }
  return n
}

// ---- flashcards (Leitner boxes) ----
const INTERVAL_DAYS = [0, 1, 2, 4, 7, 14] // box 1..5
const addDays = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const cardId = (lessonId, i) => `${lessonId}~vocab.${i}`

// Cards due today or never seen.
export function isDue(card) {
  return !card || card.due <= addDays(0)
}

export function nextCard(card, knewIt) {
  const box = knewIt ? Math.min((card?.box ?? 0) + 1, 5) : 1
  return { box, due: addDays(knewIt ? INTERVAL_DAYS[box] : 0) }
}

export function shuffle(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
