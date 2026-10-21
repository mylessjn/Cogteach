import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/context.js'
import { recordLesson } from '../../lib/data.js'
import { FlagButton, Finished } from './bits.jsx'
import { useProgress, useStudySet } from './hooks.js'
import AdultPlayer from './players/AdultPlayer.jsx'
import EarlyPlayer from './players/EarlyPlayer.jsx'
import MiddlePlayer from './players/MiddlePlayer.jsx'
import TeenPlayer from './players/TeenPlayer.jsx'

const PLAYERS = {
  preoperational: EarlyPlayer,
  concrete: MiddlePlayer,
  formal: TeenPlayer,
  adult: AdultPlayer,
}

// Opens one published study set for the student's stage. Never calls the AI:
// the voice and pictures were made at publish.
export default function Lesson() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { account } = useAuth()
  const { classId, ageGroup } = account
  const data = useStudySet(classId, lessonId, ageGroup)
  const progress = useProgress(classId, account.id)
  const [openedAt] = useState(() => Date.now())
  const [result, setResult] = useState(null)

  if (data === undefined || progress === null) return <p className="muted">Loading…</p>
  if (data === null) {
    return (
      <div className="notice">
        <h2>This lesson isn't ready yet</h2>
        <Link to="/student">Back home →</Link>
      </div>
    )
  }
  const Player = PLAYERS[ageGroup]
  const flag = (part) => (
    <FlagButton key={part} classId={classId} lessonId={lessonId} ageGroup={ageGroup} part={part} studentId={account.id} />
  )

  async function onDone({ score, total, points }) {
    const seconds = Math.round((Date.now() - openedAt) / 1000)
    setResult({ score, total, points })
    await recordLesson(classId, account, lessonId, { score, total, seconds, points })
  }

  if (result) {
    return <Finished title={data.studySet.title} {...result} onBack={() => navigate('/student')} />
  }

  return (
    <article className={`player player-${ageGroup}`}>
      {ageGroup !== 'preoperational' && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/student">Home</Link>
          <span aria-hidden="true">·</span>
          <span>{data.studySet.title}</span>
        </nav>
      )}
      {ageGroup === 'preoperational' ? (
        <Link to="/student" className="home-btn" aria-label="Home">
          🏠
        </Link>
      ) : (
        <h1>{data.studySet.title}</h1>
      )}
      <Player
        classId={classId}
        lessonId={lessonId}
        studySet={data.studySet}
        media={data.media}
        progress={progress}
        flag={flag}
        onDone={onDone}
      />
    </article>
  )
}
