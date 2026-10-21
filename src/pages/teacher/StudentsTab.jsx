import { useEffect, useState } from 'react'
import { countryFlag } from '../../kid/country.js'
import { listenStudents } from '../../lib/data.js'
import { GROUPS } from '../../lib/groups.js'

export default function StudentsTab({ classId }) {
  const [students, setStudents] = useState(null)
  useEffect(() => listenStudents(classId, setStudents), [classId])

  if (students === null) return <p className="muted">Loading…</p>
  if (students.length === 0) {
    return <p className="muted">No students yet. Share the join code with your class.</p>
  }

  return (
    <>
    <p className="muted small">
      k-ID checks each student's age under the laws of the country it detects, so who needs a
      parent's yes can differ from student to student.
    </p>
    <div className="groups">
      {GROUPS.map((g) => {
        const inGroup = students.filter((s) => s.ageGroup === g.id)
        if (inGroup.length === 0) return null
        return (
          <section key={g.id} className="card">
            <p className="label">
              Ages {g.label} · {inGroup.length} student{inGroup.length === 1 ? '' : 's'}
            </p>
            <h3>{g.name}</h3>
            <ul className="plain">
              {inGroup.map((s) => (
                <li key={s.id} className="row">
                  <span>
                    {s.displayName}
                    {s.country && (
                      <span className="muted small" title="Country k-ID detected; its laws set the consent rules">
                        {' '}
                        {countryFlag(s.country)} {s.country}
                      </span>
                    )}
                  </span>
                  <span className={`pill ${s.status === 'Active' ? 'green' : 'orange'}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
    </>
  )
}
