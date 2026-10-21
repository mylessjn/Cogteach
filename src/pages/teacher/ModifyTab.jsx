import { useEffect, useState } from 'react'
import { VersionEditor } from '../../components/VersionEditor.jsx'
import { getVersion, listenLessons, listenStudents, resolveFlag } from '../../lib/data.js'
import { GROUPS, groupById } from '../../lib/groups.js'
import { publishWithAudio } from './publish.js'

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

function EditVersion({ classId, teacherId, lessonId, groupId, flags, onClose }) {
  const [version, setVersion] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    getVersion(classId, lessonId, groupId).then(setVersion)
  }, [classId, lessonId, groupId])

  if (!version) return <p className="muted">Loading…</p>

  const canUpdate = !saving && (!groupById(groupId).reviewRequired || reviewed)

  async function onUpdate() {
    setSaving(true)
    setMessage(null)
    try {
      await publishWithAudio(teacherId, classId, lessonId, groupId, version)
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
        <VersionEditor
          groupId={groupId}
          version={version}
          onChange={setVersion}
          reviewed={reviewed}
          onReviewed={setReviewed}
          flags={flags}
          onResolve={(flagId) => resolveFlag(classId, flagId)}
        />
      </div>
      <div className="actions sticky">
        <button className="btn primary" disabled={!canUpdate} onClick={onUpdate}>
          {saving ? 'Updating…' : 'Update →'}
        </button>
        {message && <span className="muted small">{message}</span>}
      </div>
    </>
  )
}
