import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../../components/Layout.jsx'
import { getVersion, listenLessons } from '../../lib/data.js'
import { groupById } from '../../lib/groups.js'

// Published lessons for this student's age group only.
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
      <Hero eyebrow={`${profile.className} · ${groupById(profile.ageGroup).label}`}>
        Hi {profile.displayName}, here are your <em>lessons</em>.
      </Hero>
      {lessons === null ? (
        <p className="muted">Loading…</p>
      ) : lessons.length === 0 ? (
        <p className="muted">No lessons yet. Your teacher will add some soon.</p>
      ) : (
        <ul className="cards">
          {lessons.map((l) => (
            <li key={l.id} className="card">
              <h3>{titles[l.id] ?? '…'}</h3>
              <Link to={`/student/${profile.id}/lesson/${l.id}`} className="btn small primary">
                Open lesson →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
