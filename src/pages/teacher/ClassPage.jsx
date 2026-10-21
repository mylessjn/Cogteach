import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useParams } from 'react-router-dom'
import { listenClass, listenFlags } from '../../lib/data.js'
import CreateTab from './CreateTab.jsx'
import ModifyTab from './ModifyTab.jsx'
import StudentsTab from './StudentsTab.jsx'

const TABS = { students: 'Students', create: 'Create', modify: 'Modify' }

export default function ClassPage({ teacherId }) {
  const { classId, tab } = useParams()
  const [cls, setCls] = useState(undefined)
  const [flags, setFlags] = useState([])

  useEffect(() => listenClass(classId, setCls), [classId])
  useEffect(() => listenFlags(classId, setFlags), [classId])

  if (!tab || !TABS[tab]) return <Navigate to={`/teacher/class/${classId}/create`} replace />
  if (cls === undefined) return <p className="muted">Loading…</p>
  if (cls === null || cls.teacherId !== teacherId) {
    return (
      <div className="notice">
        <h2>Class not found</h2>
        <Link to="/teacher">Back to classes →</Link>
      </div>
    )
  }

  const openFlags = flags.filter((f) => f.status === 'open').length

  return (
    <>
      <p className="crumbs">
        <span className="pill fill-green">✓ Verified adult</span>
        <Link to="/teacher">Classes</Link> · <strong>{cls.name}</strong> ·{' '}
        <span className="muted small">
          join code <code className="code">{cls.joinCode}</code>
        </span>
      </p>
      <nav className="tabs">
        {Object.entries(TABS).map(([id, label]) => (
          <NavLink key={id} to={`/teacher/class/${classId}/${id}`} className="navlink">
            {label}
            {id === 'modify' && openFlags > 0 && <span className="badge">{openFlags}</span>}
          </NavLink>
        ))}
      </nav>
      {tab === 'students' && <StudentsTab classId={classId} />}
      {tab === 'create' && <CreateTab classId={classId} teacherId={teacherId} />}
      {tab === 'modify' && <ModifyTab classId={classId} teacherId={teacherId} flags={flags} />}
    </>
  )
}
