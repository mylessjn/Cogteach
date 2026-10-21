// Firestore reads and writes. Layout:
//   classes/{classId}                name, teacherId (account id), joinCode
//     students/{accountId}           displayName, ageGroup, kidSessionId, status
//     lessons/{lessonId}             prompt, title, createdAt, publishedGroups[]
//       versions/{ageGroup}          study set + status, reviewedBy, reviewedAt
//       media/{ageGroup}.{key}       group, key, mp3 and/or img (base64 / data URL)
//     flags/{flagId}                 lessonId, ageGroup, part, reason, note, studentId, status
//     progress/{accountId}           displayName, ageGroup, points, days[], avatar,
//                                    onLeaderboard, done{}, cards{}
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'

const classDoc = (classId) => doc(db, 'classes', classId)
const lessonDoc = (classId, lessonId) => doc(db, 'classes', classId, 'lessons', lessonId)
const versionDoc = (classId, lessonId, group) =>
  doc(db, 'classes', classId, 'lessons', lessonId, 'versions', group)
const mediaCol = (classId, lessonId) => collection(db, 'classes', classId, 'lessons', lessonId, 'media')
const progressDoc = (classId, accountId) => doc(db, 'classes', classId, 'progress', accountId)

const withId = (snap) => ({ id: snap.id, ...snap.data() })
const listen = (q, onChange) =>
  onSnapshot(q, (snap) => onChange(snap.docs.map(withId)), (err) => console.error(err))

export const today = () => new Date().toISOString().slice(0, 10)

// ---- classes ----
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function newJoinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

export async function createClass(teacherId, name) {
  const ref = await addDoc(collection(db, 'classes'), {
    name,
    teacherId,
    joinCode: newJoinCode(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export const listenTeacherClasses = (teacherId, onChange) =>
  listen(query(collection(db, 'classes'), where('teacherId', '==', teacherId)), onChange)

export const listenClass = (classId, onChange) =>
  onSnapshot(classDoc(classId), (snap) => onChange(snap.exists() ? withId(snap) : null))

export async function getClass(classId) {
  const snap = await getDoc(classDoc(classId))
  return snap.exists() ? withId(snap) : null
}

// Looks a class up by join code. Gives up after `timeoutMs` instead of hanging.
export async function findClassByCode(code, timeoutMs = 8000) {
  const lookup = getDocs(
    query(collection(db, 'classes'), where('joinCode', '==', code.trim().toUpperCase())),
  ).then((snap) => (snap.empty ? null : withId(snap.docs[0])))
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Looking up the class took too long. Check your internet and try again.')), timeoutMs),
  )
  return Promise.race([lookup, timeout])
}

// ---- students ----
export const saveStudent = (classId, accountId, data) =>
  setDoc(doc(db, 'classes', classId, 'students', accountId), data, { merge: true })

export const listenStudents = (classId, onChange) =>
  listen(collection(db, 'classes', classId, 'students'), onChange)

// ---- lessons ----
export async function createLesson(classId, prompt, title) {
  const ref = await addDoc(collection(db, 'classes', classId, 'lessons'), {
    prompt,
    title,
    createdAt: serverTimestamp(),
    publishedGroups: [],
  })
  return ref.id
}

export const listenLessons = (classId, onChange) =>
  listen(query(collection(db, 'classes', classId, 'lessons'), orderBy('createdAt', 'desc')), onChange)

export const saveDraftVersion = (classId, lessonId, group, studySet) =>
  setDoc(versionDoc(classId, lessonId, group), { ...studySet, status: 'draft' })

export async function getVersion(classId, lessonId, group) {
  const snap = await getDoc(versionDoc(classId, lessonId, group))
  return snap.exists() ? snap.data() : null
}

// Publishes (or updates) one age group's study set with its media:
// media = { [key]: { mp3?, img? } }.
export async function publishVersion(classId, lessonId, group, studySet, teacherId, media) {
  const batch = writeBatch(db)
  batch.set(versionDoc(classId, lessonId, group), {
    ...studySet,
    status: 'published',
    reviewedBy: teacherId,
    reviewedAt: serverTimestamp(),
  })
  batch.update(lessonDoc(classId, lessonId), { publishedGroups: arrayUnion(group) })
  for (const [key, value] of Object.entries(media)) {
    batch.set(doc(mediaCol(classId, lessonId), `${group}.${key}`), { group, key, ...value }, { merge: true })
  }
  await batch.commit()
}

// All media for one lesson and group: { [key]: { mp3?, img? } }.
export async function getMedia(classId, lessonId, group) {
  const snap = await getDocs(query(mediaCol(classId, lessonId), where('group', '==', group)))
  return Object.fromEntries(snap.docs.map((d) => [d.data().key, d.data()]))
}

// One media item, e.g. a lesson's first picture for a home tile.
export async function getMediaItem(classId, lessonId, group, key) {
  const snap = await getDoc(doc(mediaCol(classId, lessonId), `${group}.${key}`))
  return snap.exists() ? snap.data() : null
}

// ---- flags ----
export const addFlag = (classId, flag) =>
  addDoc(collection(db, 'classes', classId, 'flags'), {
    ...flag,
    status: 'open',
    createdAt: serverTimestamp(),
  })

export const listenFlags = (classId, onChange) =>
  listen(query(collection(db, 'classes', classId, 'flags'), orderBy('createdAt', 'desc')), onChange)

export const resolveFlag = (classId, flagId) =>
  updateDoc(doc(db, 'classes', classId, 'flags', flagId), { status: 'resolved' })

// ---- progress ----
export const listenProgress = (classId, accountId, onChange) =>
  onSnapshot(progressDoc(classId, accountId), (snap) => onChange(snap.exists() ? snap.data() : {}))

export const listenClassProgress = (classId, onChange) =>
  listen(collection(db, 'classes', classId, 'progress'), onChange)

export const saveProgress = (classId, accountId, data) =>
  setDoc(progressDoc(classId, accountId), data, { merge: true })

// A finished lesson: score, time, points, and today counts toward the streak.
export function recordLesson(classId, account, lessonId, { score, total, seconds, points }) {
  return saveProgress(classId, account.id, {
    displayName: account.displayName,
    ageGroup: account.ageGroup,
    points: increment(points),
    days: arrayUnion(today()),
    done: { [lessonId]: { score, total, seconds, at: Date.now() } },
  })
}

// Points for a single correct answer, and today counts toward the streak.
export function addPoints(classId, account, points) {
  return saveProgress(classId, account.id, {
    displayName: account.displayName,
    ageGroup: account.ageGroup,
    points: increment(points),
    days: arrayUnion(today()),
  })
}
