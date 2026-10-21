import { useEffect, useState } from 'react'
import { useKidPermission } from '@k-id/core'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context.js'
import { PermissionNotice } from '../../kid/PermissionNotice.jsx'
import { getMediaItem, listenClassProgress, saveProgress } from '../../lib/data.js'
import { groupById } from '../../lib/groups.js'
import { Picture } from './bits.jsx'
import { cardId, isDue, streak, useLessons, useProgress } from './hooks.js'

// Home for the student's stage: 3–6 giant picture tiles, 7–11 grid with
// stickers, 12–18 dark list with streak/avatar/leaderboard, 19+ dashboard.
export default function StudentHome() {
  const { account } = useAuth()
  const lessons = useLessons(account.classId, account.ageGroup)
  const progress = useProgress(account.classId, account.id)
  if (lessons === null || progress === null) return <p className="muted">Loading…</p>

  const props = { account, lessons, progress }
  if (account.ageGroup === 'preoperational') return <EarlyHome {...props} />
  if (account.ageGroup === 'concrete') return <MiddleHome {...props} />
  if (account.ageGroup === 'formal') return <TeenHome {...props} />
  return <AdultHome {...props} />
}

const Empty = () => (
  <div className="notice">
    <p>No lessons yet. Your teacher will add some soon.</p>
  </div>
)

// ---- 3–6 ----
function Tile({ account, lesson, done }) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    getMediaItem(account.classId, lesson.id, account.ageGroup, 'card.0').then((m) => setImg(m?.img ?? null))
  }, [account.classId, account.ageGroup, lesson.id])
  return (
    <Link to={`/student/lesson/${lesson.id}`} className="giant-tile">
      <Picture img={img} emoji={lesson.studySet.cards?.[0]?.emoji} className="giant-pic" />
      <span className="giant-word">{lesson.studySet.title}</span>
      {done && <span className="tile-stars">⭐</span>}
    </Link>
  )
}

function EarlyHome({ account, lessons, progress }) {
  return (
    <div className="early-home">
      <h1>Hi {account.displayName}! 👋</h1>
      {lessons.length === 0 ? (
        <Empty />
      ) : (
        <div className="giant-tiles">
          {lessons.map((l) => (
            <Tile key={l.id} account={account} lesson={l} done={Boolean(progress.done?.[l.id])} />
          ))}
        </div>
      )}
      <p className="stars-total">⭐ {progress.points ?? 0}</p>
    </div>
  )
}

// ---- 7–11 ----
function MiddleHome({ account, lessons, progress }) {
  const doneCount = lessons.filter((l) => progress.done?.[l.id]).length
  return (
    <>
      <p className="eyebrow">Ages {groupById(account.ageGroup).label}</p>
      <h1>Hi {account.displayName}! Ready to play?</h1>
      <div className="stat-row">
        <div className="stat sticker">
          <span>🌟</span>
          <strong>{progress.points ?? 0}</strong> stickers
        </div>
        <div className="stat sticker">
          <span>🏅</span>
          <strong>{doneCount}</strong> badges
        </div>
        <div className="stat">
          <div className="progress big">
            <span style={{ width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%` }} />
          </div>
          {doneCount} of {lessons.length} lessons done
        </div>
      </div>
      {lessons.length === 0 ? (
        <Empty />
      ) : (
        <ul className="cards">
          {lessons.map((l) => {
            const d = progress.done?.[l.id]
            return (
              <li key={l.id} className="card">
                <div className="mini-pics">
                  {(l.studySet.words ?? []).slice(0, 4).map((w, i) => (
                    <span key={i}>{w.emoji}</span>
                  ))}
                </div>
                <h3>{l.studySet.title}</h3>
                <p className="muted small">{d ? `🏅 Done · ${d.score}/${d.total}` : 'Learn · Build · Match'}</p>
                <div className="actions">
                  <Link to={`/student/lesson/${l.id}`} className="btn primary small">
                    {d ? 'Play again' : 'Start'}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// ---- 12–18 ----
const AVATARS = ['🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐲', '🤖', '👾', '🌵']

function TeenHome({ account, lessons, progress }) {
  const { can, get } = useKidPermission()
  const leaderboardOn = can('leaderboard-and-rankings')
  const avatarOn = can('custom-avatar')
  const avatarPerm = get('custom-avatar')
  const [board, setBoard] = useState([])

  // Only appear on the leaderboard while k-ID allows it.
  useEffect(() => {
    if (Boolean(progress.onLeaderboard) !== leaderboardOn) {
      saveProgress(account.classId, account.id, {
        onLeaderboard: leaderboardOn,
        displayName: account.displayName,
        ageGroup: account.ageGroup,
      })
    }
  }, [leaderboardOn, progress.onLeaderboard, account])

  useEffect(() => {
    if (!leaderboardOn) return
    return listenClassProgress(account.classId, (all) =>
      setBoard(
        all
          .filter((p) => p.ageGroup === 'formal' && p.onLeaderboard)
          .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
          .slice(0, 10),
      ),
    )
  }, [leaderboardOn, account.classId])

  const days = streak(progress.days)

  return (
    <div className="teen-home">
      <div className="teen-head">
        <span className="avatar">{avatarOn && progress.avatar ? progress.avatar : '🙂'}</span>
        <div>
          <h1>{account.displayName}</h1>
          <p className="muted">
            🔥 {days}-day streak · {progress.points ?? 0} XP
          </p>
        </div>
      </div>

      {avatarOn ? (
        <div className="avatar-picker" aria-label="Pick an avatar">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              className={progress.avatar === a ? 'on' : ''}
              onClick={() => saveProgress(account.classId, account.id, { avatar: a })}
            >
              {a}
            </button>
          ))}
        </div>
      ) : (
        avatarPerm && (
          <PermissionNotice name="custom-avatar" feature="Avatars" settingsPath="/student/settings" />
        )
      )}

      <div className="teen-grid">
        <section>
          <p className="label">Lessons</p>
          {lessons.length === 0 ? (
            <Empty />
          ) : (
            <ul className="teen-list">
              {lessons.map((l) => {
                const d = progress.done?.[l.id]
                return (
                  <li key={l.id}>
                    <Link to={`/student/lesson/${l.id}`}>
                      <span>
                        <strong>{l.studySet.title}</strong>
                        <span className="muted small">{l.studySet.scene}</span>
                      </span>
                      <span className="muted small">{d ? `✓ ${d.score}/${d.total}` : '→'}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        {leaderboardOn ? (
          <section>
            <p className="label">Class leaderboard</p>
            <ol className="board">
              {board.map((p, i) => (
                <li key={p.id} className={p.id === account.id ? 'me' : ''}>
                  <span>
                    {i + 1}. {p.avatar ?? '🙂'} {p.displayName}
                  </span>
                  <span>{p.points ?? 0} XP</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <PermissionNotice name="leaderboard-and-rankings" feature="The leaderboard" settingsPath="/student/settings" />
        )}
      </div>
    </div>
  )
}

// ---- 19+ ----
function AdultHome({ account, lessons, progress }) {
  const done = lessons.map((l) => ({ l, d: progress.done?.[l.id] })).filter((x) => x.d)
  const avgScore = done.length
    ? Math.round((done.reduce((s, { d }) => s + (d.total ? d.score / d.total : 0), 0) / done.length) * 100)
    : 0
  const avgTime = done.length ? Math.round(done.reduce((s, { d }) => s + d.seconds, 0) / done.length) : 0
  const due = lessons.reduce(
    (n, l) => n + (l.studySet.vocab ?? []).filter((_, i) => isDue(progress.cards?.[cardId(l.id, i)])).length,
    0,
  )
  const fmt = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`

  return (
    <>
      <p className="eyebrow">Dashboard</p>
      <h1>Welcome back, {account.displayName}</h1>
      <div className="stat-row">
        <div className="stat">
          <strong>{due}</strong> cards due
        </div>
        <div className="stat">
          <strong>{done.length}</strong> of {lessons.length} lessons done
        </div>
        <div className="stat">
          <strong>{avgScore}%</strong> average score
        </div>
        <div className="stat">
          <strong>{done.length ? fmt(avgTime) : '–'}</strong> average time
        </div>
        <div className="stat">
          <strong>🔥 {streak(progress.days)}</strong> day streak
        </div>
      </div>

      {done.length > 0 && (
        <div className="panel">
          <p className="label">Scores</p>
          <ScoreChart items={done.map(({ l, d }) => ({ label: l.studySet.title, pct: d.total ? d.score / d.total : 0 }))} />
        </div>
      )}

      {lessons.length === 0 ? (
        <Empty />
      ) : (
        <table className="vocab-table">
          <thead>
            <tr>
              <th>Lesson</th>
              <th>Goal</th>
              <th>Score</th>
              <th>Time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => {
              const d = progress.done?.[l.id]
              return (
                <tr key={l.id}>
                  <td>
                    <strong>{l.studySet.title}</strong>
                  </td>
                  <td className="muted">{l.studySet.goal}</td>
                  <td>{d ? `${d.score}/${d.total}` : '–'}</td>
                  <td>{d ? fmt(d.seconds) : '–'}</td>
                  <td>
                    <Link to={`/student/lesson/${l.id}`} className="btn small primary">
                      {d ? 'Review' : 'Start'}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

function ScoreChart({ items }) {
  const w = 40
  const gap = 16
  const h = 120
  return (
    <svg className="chart" viewBox={`0 0 ${items.length * (w + gap)} ${h + 20}`} role="img" aria-label="Score per lesson">
      {items.map((it, i) => {
        const bh = Math.max(2, it.pct * h)
        return (
          <g key={i}>
            <title>{`${it.label}: ${Math.round(it.pct * 100)}%`}</title>
            <rect x={i * (w + gap)} y={h - bh} width={w} height={bh} rx="4" />
            <text x={i * (w + gap) + w / 2} y={h + 15} textAnchor="middle">
              {Math.round(it.pct * 100)}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}
