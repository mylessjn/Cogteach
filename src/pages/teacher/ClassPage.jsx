import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, useParams } from 'react-router-dom'
import { Crumbs } from '../../components/Layout.jsx'
import { listenClass, listenFlags } from '../../lib/data.js'
import CreateTab from './CreateTab.jsx'
import ModifyTab from './ModifyTab.jsx'
import StudentsTab from './StudentsTab.jsx'

// Sidebar entries, styled like a course's unit list.
const TABS = {
  students: { label: 'Students', title: 'Roster' },
  create: { label: 'Study sets', title: 'New lesson' },
  modify: { label: 'Lessons', title: 'Published' },
}

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
    <div className="with-sidebar">
      <aside className="sidebar">
        <div className="sidebar-head">
          <img src="/icon.png" alt="" />
          <div>
            <strong>{cls.name}</strong>
            <span className="muted small">
              Join code <span className="code">{cls.joinCode}</span>
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {Object.entries(TABS).map(([id, { label, title }]) => (
            <NavLink key={id} to={`/teacher/class/${classId}/${id}`} className="side-item">
              <span className="side-text">
                <span className="label">{label}</span>
                {title}
              </span>
              {id === 'modify' && openFlags > 0 && <span className="badge">{openFlags}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <section>
        <Crumbs items={[{ to: '/teacher', label: 'Classes' }, { label: cls.name }]} />
        <div className="crumbs">
          <span className="pill green">✓ Verified adult</span>
        </div>
        <h1>{TABS[tab].title}</h1>
        {tab === 'students' && <StudentsTab classId={classId} />}
        {tab === 'create' && <CreateTab classId={classId} teacherId={teacherId} />}
        {tab === 'modify' && <ModifyTab classId={classId} teacherId={teacherId} flags={flags} />}
      </section>
    </div>
  )
}
