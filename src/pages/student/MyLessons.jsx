import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../../components/Layout.jsx'
import { getVersion, listenLessons } from '../../lib/data.js'
import { groupById } from '../../lib/groups.js'

// Published lessons for this student's age group only, as a course list.
export default function MyLessons({ profile }) {
  const [lessons, setLessons] = useState(null)
  const [titles, setTitles] = useState({})

  useEffect(
    () =>
      listenLessons(profile.classId, (all) =>
        setLessons(all.filter((l) => l.publishedGroups?.includes(profile.ageGroup))),
      ),
    [profile.classId, profile.ageGroup],
  )

  // Show each lesson's title as written for this age group.
  useEffect(() => {
    lessons?.forEach((l) => {
      getVersion(profile.classId, l.id, profile.ageGroup).then((v) => {
        if (v) setTitles((t) => ({ ...t, [l.id]: v.title }))
      })
    })
  }, [lessons, profile.classId, profile.ageGroup])

  return (
    <>
      <Hero eyebrow={`${profile.className} · Ages ${groupById(profile.ageGroup).label}`}>
        Hi {profile.displayName}! Here are your lessons.
      </Hero>
      {lessons === null ? (
        <p className="muted">Loading…</p>
      ) : lessons.length === 0 ? (
        <div className="notice">
          <p>No lessons yet. Your teacher will add some soon.</p>
        </div>
      ) : (
        <ul className="cards">
          {lessons.map((l, i) => (
            <li key={l.id} className="card">
              <p className="label">Lesson {lessons.length - i}</p>
              <h3>{titles[l.id] ?? '…'}</h3>
              <div className="actions">
                <Link to={`/student/${profile.id}/lesson/${l.id}`} className="btn primary small">
                  Start lesson →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
