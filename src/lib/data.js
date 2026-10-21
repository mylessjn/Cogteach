// Firestore reads and writes. Layout:
//   classes/{classId}                name, teacherId, joinCode
//     students/{studentId}           displayName, ageGroup, kidSessionId, status
//     lessons/{lessonId}             prompt, title, createdAt, publishedGroups[]
//       versions/{ageGroup}          title, sections[], status, reviewedBy, reviewedAt
//       audio/{sectionIndex}         mp3 (base64), for the 5–7 group only
//     flags/{flagId}                 lessonId, ageGroup, sectionIndex, reason, note,
//                                    studentId, status, createdAt
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
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

const withId = (snap) => ({ id: snap.id, ...snap.data() })
const listen = (q, onChange) =>
  onSnapshot(q, (snap) => onChange(snap.docs.map(withId)), (err) => console.error(err))

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

export async function findClassByCode(code) {
  const snap = await getDocs(
    query(collection(db, 'classes'), where('joinCode', '==', code.trim().toUpperCase())),
  )
  return snap.empty ? null : withId(snap.docs[0])
}

// ---- students ----
export const saveStudent = (classId, studentId, data) =>
  setDoc(doc(db, 'classes', classId, 'students', studentId), data, { merge: true })

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

export const saveDraftVersion = (classId, lessonId, group, version) =>
  setDoc(versionDoc(classId, lessonId, group), { ...version, status: 'draft' })

export async function getVersion(classId, lessonId, group) {
  const snap = await getDoc(versionDoc(classId, lessonId, group))
  return snap.exists() ? snap.data() : null
}

// Publishes (or updates) one age version, with its audio for the 5–7 group.
export async function publishVersion(classId, lessonId, group, version, teacherId, audio) {
  const batch = writeBatch(db)
  batch.set(versionDoc(classId, lessonId, group), {
    title: version.title,
    sections: version.sections,
    status: 'published',
    reviewedBy: teacherId,
    reviewedAt: serverTimestamp(),
  })
  batch.update(lessonDoc(classId, lessonId), { publishedGroups: arrayUnion(group) })
  audio?.forEach((mp3, i) => {
    batch.set(doc(db, 'classes', classId, 'lessons', lessonId, 'audio', String(i)), { mp3 })
  })
  await batch.commit()
}

export async function getAudio(classId, lessonId, sectionIndex) {
  const snap = await getDoc(doc(db, 'classes', classId, 'lessons', lessonId, 'audio', String(sectionIndex)))
  return snap.exists() ? snap.data().mp3 : null
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
