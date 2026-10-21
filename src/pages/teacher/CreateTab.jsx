import { useState } from 'react'
import { useAuth } from '../../auth/context.js'
import { StudySetEditor } from '../../components/StudySetEditor.jsx'
import { api } from '../../kid/claim.js'
import { createLesson, saveDraftVersion } from '../../lib/data.js'
import { GROUPS, groupById } from '../../lib/groups.js'
import { pictureParts } from '../../lib/studyset.js'
import { makePicture, publishStudySet } from './publish.js'

const ALL_GROUPS = GROUPS.map((g) => g.id)

export default function CreateTab({ classId, teacherId }) {
  const { token } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState(ALL_GROUPS)
  const [phase, setPhase] = useState('idle') // idle | building | review | publishing | done
  const [error, setError] = useState(null)
  const [lesson, setLesson] = useState(null) // { id, base }
  // groupId -> { status: 'loading' | 'ready' | 'error', studySet?, error? }
  const [sets, setSets] = useState({})
  // groupId -> { [key]: { status: 'loading' | 'ready' | 'error', img? } }
  const [pictures, setPictures] = useState({})
  const [pictureErrors, setPictureErrors] = useState({})
  const [reviewed, setReviewed] = useState({})

  const toggleGroup = (id) => setSelected((s) => (s.includes(id) ? s.filter((g) => g !== id) : [...s, id]))
  const setSet = (g, value) => setSets((s) => ({ ...s, [g]: value }))
  const setPicture = (g, key, value) =>
    setPictures((p) => ({ ...p, [g]: { ...p[g], [key]: value } }))

  async function drawPicture(g, key, description) {
    setPicture(g, key, { status: 'loading' })
    try {
      setPicture(g, key, { status: 'ready', img: await makePicture(token, description) })
    } catch (err) {
      setPicture(g, key, { status: 'error' })
      setPictureErrors((e) => ({ ...e, [g]: err.message }))
    }
  }

  async function drawAll(g, studySet) {
    const parts = pictureParts(g, studySet)
    // Two at a time keeps the image model from rate limiting us.
    for (let i = 0; i < parts.length; i += 2) {
      await Promise.all(parts.slice(i, i + 2).map((p) => drawPicture(g, p.key, p.prompt)))
    }
  }

  // Curate runs once per group and is saved as a draft right away.
  async function curateOne(lessonId, base, g) {
    setSet(g, { status: 'loading' })
    setPictures((p) => ({ ...p, [g]: {} }))
    setPictureErrors((e) => ({ ...e, [g]: null }))
    try {
      const { studySet } = await api(token, 'POST', '/api/curate', { lesson: base, ageGroup: g })
      await saveDraftVersion(classId, lessonId, g, studySet)
      setSet(g, { status: 'ready', studySet })
      if (groupById(g).pictures) drawAll(g, studySet)
    } catch (err) {
      setSet(g, { status: 'error', error: err.message })
    }
  }

  async function onGenerate(e) {
    e.preventDefault()
    setError(null)
    setPhase('building')
    setSets({})
    setPictures({})
    setReviewed({})
    try {
      const { lesson: base } = await api(token, 'POST', '/api/build', { prompt })
      const lessonId = await createLesson(classId, prompt, base.title)
      setLesson({ id: lessonId, base })
      setPhase('review')
      await Promise.all(ALL_GROUPS.filter((g) => selected.includes(g)).map((g) => curateOne(lessonId, base, g)))
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }

  const groupIds = ALL_GROUPS.filter((g) => sets[g])
  const allReady = groupIds.length > 0 && groupIds.every((g) => sets[g].status === 'ready')
  const drawing = groupIds.some((g) => Object.values(pictures[g] ?? {}).some((p) => p.status === 'loading'))
  const reviewDone = groupIds.every((g) => !groupById(g).reviewRequired || reviewed[g])
  const canPublish = phase === 'review' && allReady && !drawing && reviewDone

  async function onPublish() {
    setError(null)
    setPhase('publishing')
    try {
      for (const g of groupIds) {
        const imgs = Object.fromEntries(
          Object.entries(pictures[g] ?? {}).filter(([, p]) => p.img).map(([k, p]) => [k, p.img]),
        )
        await publishStudySet({
          token,
          teacherId,
          classId,
          lessonId: lesson.id,
          groupId: g,
          studySet: sets[g].studySet,
          pictures: imgs,
        })
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
    setSets({})
    setPictures({})
    setReviewed({})
    setPhase('idle')
  }

  if (phase === 'done') {
    return (
      <div className="notice">
        <h2>Published</h2>
        <p>
          “{lesson.base.title}” is live for ages {groupIds.map((g) => groupById(g).label).join(', ')}, with
          every voice line recorded.
        </p>
        <button className="btn primary" onClick={startOver}>
          New lesson
        </button>
      </div>
    )
  }

  const hint = !allReady
    ? null
    : drawing
      ? 'Pictures are still drawing.'
      : !reviewDone
        ? 'Check the review box on the 3–6 and 7–11 study sets first.'
        : null

  return (
    <>
      {(phase === 'idle' || phase === 'building') && (
        <form className="panel stack" onSubmit={onGenerate}>
          <label htmlFor="prompt">Lesson prompt</label>
          <textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Animals in Spanish: dog, cat, bird, fish. Simple sentences like “the dog eats”."
          />
          <fieldset className="checks">
            <legend>Age groups</legend>
            {GROUPS.map((g) => (
              <label key={g.id}>
                <input type="checkbox" checked={selected.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                {g.label} · {g.name}
              </label>
            ))}
          </fieldset>
          <div className="actions">
            <button className="btn primary" disabled={phase === 'building' || !prompt.trim() || selected.length === 0}>
              {phase === 'building' ? 'Building the lesson…' : 'Generate'}
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
              const v = sets[g]
              if (v.status !== 'ready') {
                return (
                  <article key={g} className="review-card">
                    <p className="eyebrow">Ages {groupById(g).label}</p>
                    {v.status === 'loading' ? (
                      <p className="muted">Building the ages {groupById(g).label} study set…</p>
                    ) : (
                      <>
                        <p className="error">{v.error}</p>
                        <button className="btn" onClick={() => curateOne(lesson.id, lesson.base, g)}>
                          Regenerate
                        </button>
                      </>
                    )}
                  </article>
                )
              }
              const keys = pictureParts(g, v.studySet)
              return (
                <StudySetEditor
                  key={g}
                  groupId={g}
                  studySet={v.studySet}
                  onChange={(studySet) => setSet(g, { status: 'ready', studySet })}
                  reviewed={Boolean(reviewed[g])}
                  onReviewed={(checked) => setReviewed((r) => ({ ...r, [g]: checked }))}
                  pictureKeys={keys}
                  pictures={pictures[g] ?? {}}
                  pictureError={pictureErrors[g]}
                  onNewPicture={(key) => drawPicture(g, key, keys.find((k) => k.key === key).prompt)}
                />
              )
            })}
          </div>
          <div className="actions sticky">
            <button className="btn primary" disabled={!canPublish} onClick={onPublish}>
              {phase === 'publishing' ? 'Recording voice and publishing…' : 'Publish'}
            </button>
            <button className="btn" onClick={startOver} disabled={phase === 'publishing'}>
              Start over
            </button>
            {hint && <span className="muted small">{hint}</span>}
          </div>
        </>
      )}
    </>
  )
}
