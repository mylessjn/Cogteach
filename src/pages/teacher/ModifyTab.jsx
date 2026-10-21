import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/context.js'
import { StudySetEditor } from '../../components/StudySetEditor.jsx'
import { getMedia, getVersion, listenLessons, listenStudents, resolveFlag } from '../../lib/data.js'
import { GROUPS, groupById } from '../../lib/groups.js'
import { pictureParts } from '../../lib/studyset.js'
import { makePicture, publishStudySet } from './publish.js'

export default function ModifyTab({ classId, teacherId, flags }) {
  const [lessons, setLessons] = useState(null)
  const [students, setStudents] = useState([])
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState(null) // { lessonId, groupId }

  useEffect(() => listenLessons(classId, setLessons), [classId])
  useEffect(() => listenStudents(classId, setStudents), [classId])

  const nameOf = (studentId) => students.find((s) => s.id === studentId)?.displayName
  const openFlags = flags
    .filter((f) => f.status === 'open')
    .map((f) => ({ ...f, studentName: nameOf(f.studentId) }))

  if (open) {
    return (
      <EditVersion
        key={`${open.lessonId}/${open.groupId}`}
        classId={classId}
        teacherId={teacherId}
        {...open}
        flags={openFlags.filter((f) => f.lessonId === open.lessonId && f.ageGroup === open.groupId)}
        onClose={() => setOpen(null)}
      />
    )
  }

  if (lessons === null) return <p className="muted">Loading…</p>

  const shown = lessons.filter(
    (l) => l.publishedGroups?.length && (filter === 'all' || l.publishedGroups.includes(filter)),
  )

  return (
    <>
      <div className="filter">
        <label htmlFor="group-filter">Age group</label>
        <select id="group-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="muted">No published lessons yet.</p>
      ) : (
        <ul className="cards">
          {shown.map((l) => {
            const count = openFlags.filter((f) => f.lessonId === l.id).length
            return (
              <li key={l.id} className="card">
                <p className="label">Lesson</p>
                <h3>
                  {l.title} {count > 0 && <span className="badge">⚑ {count}</span>}
                </h3>
                <p className="muted small">{l.prompt}</p>
                <div className="actions">
                  {GROUPS.filter(
                    (g) => l.publishedGroups.includes(g.id) && (filter === 'all' || filter === g.id),
                  ).map((g) => {
                    const n = openFlags.filter((f) => f.lessonId === l.id && f.ageGroup === g.id).length
                    return (
                      <button
                        key={g.id}
                        className="btn small"
                        onClick={() => setOpen({ lessonId: l.id, groupId: g.id })}
                      >
                        {g.label}
                        {n > 0 && ` · ⚑ ${n}`} →
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

const META = ['status', 'reviewedBy', 'reviewedAt']
const stripMeta = (v) => Object.fromEntries(Object.entries(v).filter(([k]) => !META.includes(k)))

function EditVersion({ classId, teacherId, lessonId, groupId, flags, onClose }) {
  const { token } = useAuth()
  const [studySet, setStudySet] = useState(null)
  const [pictures, setPictures] = useState({})
  const [pictureError, setPictureError] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    Promise.all([getVersion(classId, lessonId, groupId), getMedia(classId, lessonId, groupId)]).then(
      ([version, media]) => {
        setStudySet(version ? stripMeta(version) : null)
        setPictures(
          Object.fromEntries(
            Object.entries(media).filter(([, m]) => m.img).map(([k, m]) => [k, { status: 'ready', img: m.img }]),
          ),
        )
      },
    )
  }, [classId, lessonId, groupId])

  if (studySet === null) return <p className="muted">Loading…</p>
  if (studySet.sections) {
    return (
      <div className="notice">
        <h2>Made before v2</h2>
        <p>This lesson uses the old format. Make it again in New lesson to get a study set.</p>
        <button className="btn" onClick={onClose}>
          ← All lessons
        </button>
      </div>
    )
  }

  const keys = pictureParts(groupId, studySet)
  const drawing = Object.values(pictures).some((p) => p.status === 'loading')
  const canUpdate = !saving && !drawing && (!groupById(groupId).reviewRequired || reviewed)

  async function newPicture(key) {
    setPictures((p) => ({ ...p, [key]: { ...p[key], status: 'loading' } }))
    try {
      const img = await makePicture(token, keys.find((k) => k.key === key).prompt)
      setPictures((p) => ({ ...p, [key]: { status: 'ready', img } }))
    } catch (err) {
      setPictures((p) => ({ ...p, [key]: { ...p[key], status: p[key]?.img ? 'ready' : 'error' } }))
      setPictureError(err.message)
    }
  }

  async function onUpdate() {
    setSaving(true)
    setMessage(null)
    try {
      const imgs = Object.fromEntries(
        Object.entries(pictures).filter(([, p]) => p.img).map(([k, p]) => [k, p.img]),
      )
      await publishStudySet({ token, teacherId, classId, lessonId, groupId, studySet, pictures: imgs })
      setReviewed(false)
      setMessage('Updated. Students see the new version now.')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button className="btn small" onClick={onClose}>
        ← All lessons
      </button>
      <div className="review-list">
        <StudySetEditor
          groupId={groupId}
          studySet={studySet}
          onChange={setStudySet}
          reviewed={reviewed}
          onReviewed={setReviewed}
          pictureKeys={keys}
          pictures={pictures}
          pictureError={pictureError}
          onNewPicture={newPicture}
          flags={flags}
          onResolve={(flagId) => resolveFlag(classId, flagId)}
        />
      </div>
      <div className="actions sticky">
        <button className="btn primary" disabled={!canUpdate} onClick={onUpdate}>
          {saving ? 'Re-recording voice and updating…' : 'Update'}
        </button>
        {message && <span className="muted small">{message}</span>}
      </div>
    </>
  )
}
