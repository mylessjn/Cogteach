import { useState } from 'react'
import { VersionEditor } from '../../components/VersionEditor.jsx'
import { api } from '../../kid/claim.js'
import { createLesson, saveDraftVersion } from '../../lib/data.js'
import { GROUPS, groupById } from '../../lib/groups.js'
import { publishWithAudio } from './publish.js'

const DEFAULT_GROUPS = ['preoperational', 'concrete', 'formal']

export default function CreateTab({ classId, teacherId }) {
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState(DEFAULT_GROUPS)
  const [phase, setPhase] = useState('idle') // idle | building | review | publishing | done
  const [error, setError] = useState(null)
  const [lesson, setLesson] = useState(null) // { id, base }
  // groupId -> { status: 'loading' | 'ready' | 'error', version?, error? }
  const [versions, setVersions] = useState({})
  const [reviewed, setReviewed] = useState({})

  const toggleGroup = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((g) => g !== id) : [...s, id]))

  const setVersion = (groupId, value) => setVersions((v) => ({ ...v, [groupId]: value }))

  // Curate runs once per group and is saved as a draft right away.
  async function curateOne(lessonId, base, groupId) {
    setVersion(groupId, { status: 'loading' })
    try {
      const { version } = await api(teacherId, 'POST', '/api/curate', { lesson: base, ageGroup: groupId })
      await saveDraftVersion(classId, lessonId, groupId, version)
      setVersion(groupId, { status: 'ready', version })
    } catch (err) {
      setVersion(groupId, { status: 'error', error: err.message })
    }
  }

  async function onGenerate(e) {
    e.preventDefault()
    setError(null)
    setPhase('building')
    setVersions({})
    setReviewed({})
    try {
      const { lesson: base } = await api(teacherId, 'POST', '/api/build', { prompt })
      const lessonId = await createLesson(classId, prompt, base.title)
      setLesson({ id: lessonId, base })
      setPhase('review')
      const groups = GROUPS.map((g) => g.id).filter((id) => selected.includes(id))
      await Promise.all(groups.map((g) => curateOne(lessonId, base, g)))
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }

  const groupIds = Object.keys(versions)
  const allReady = groupIds.length > 0 && groupIds.every((g) => versions[g].status === 'ready')
  const reviewDone = groupIds.every((g) => !groupById(g).reviewRequired || reviewed[g])
  const canPublish = phase === 'review' && allReady && reviewDone

  async function onPublish() {
    setError(null)
    setPhase('publishing')
    try {
      for (const g of groupIds) {
        await publishWithAudio(teacherId, classId, lesson.id, g, versions[g].version)
      }
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('review')
    }
  }

  function startOver() {
    setPrompt('')
    setLesson(null)
    setVersions({})
    setReviewed({})
    setPhase('idle')
  }

  if (phase === 'done') {
    return (
      <div className="notice">
        <h2>Published</h2>
        <p>
          “{lesson.base.title}” is live for{' '}
          {groupIds.map((g) => groupById(g).label).join(', ')}.
        </p>
        <button className="btn primary" onClick={startOver}>
          New lesson →
        </button>
      </div>
    )
  }

  return (
    <>
      {(phase === 'idle' || phase === 'building') && (
        <form className="stack" onSubmit={onGenerate}>
          <label htmlFor="prompt">Lesson prompt</label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Photosynthesis: how plants make food."
          />
          <fieldset className="checks">
            <legend>Age groups</legend>
            {GROUPS.map((g) => (
              <label key={g.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                />
                {g.label} · {g.name}
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button
              className="btn primary"
              disabled={phase === 'building' || !prompt.trim() || selected.length === 0}
            >
              {phase === 'building' ? 'Building the lesson…' : 'Generate →'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}

      {(phase === 'review' || phase === 'publishing') && (
        <>
          <p className="muted">
            Prompt: <em>{prompt}</em>
          </p>
          <div className="review-list">
            {groupIds.map((g) => {
              const v = versions[g]
              if (v.status === 'loading') {
                return (
                  <article key={g} className="review-card">
                    <p className="eyebrow">{groupById(g).label}</p>
                    <p className="muted">Writing the {groupById(g).label} version…</p>
                  </article>
                )
              }
              if (v.status === 'error') {
                return (
                  <article key={g} className="review-card">
                    <p className="eyebrow">{groupById(g).label}</p>
                    <p className="error">{v.error}</p>
                    <button className="btn" onClick={() => curateOne(lesson.id, lesson.base, g)}>
                      Regenerate
                    </button>
                  </article>
                )
              }
              return (
                <VersionEditor
                  key={g}
                  groupId={g}
                  version={v.version}
                  onChange={(version) => setVersion(g, { status: 'ready', version })}
                  reviewed={Boolean(reviewed[g])}
                  onReviewed={(checked) => setReviewed((r) => ({ ...r, [g]: checked }))}
                />
              )
            })}
          </div>
          <div className="actions sticky">
            <button className="btn primary" disabled={!canPublish} onClick={onPublish}>
              {phase === 'publishing' ? 'Publishing…' : 'Publish →'}
            </button>
            <button className="btn" onClick={startOver} disabled={phase === 'publishing'}>
              Start over
            </button>
            {allReady && !reviewDone && (
              <span className="muted small">Check the review box on each 5–7 and 7–11 version first.</span>
            )}
          </div>
        </>
      )}
    </>
  )
}
