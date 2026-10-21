import { useEffect, useRef, useState } from 'react'
import { useKidPermission } from '@k-id/core'
import { Link, useParams } from 'react-router-dom'
import { PermissionNotice } from '../../kid/PermissionNotice.jsx'
import { addFlag, getAudio, getVersion } from '../../lib/data.js'
import { REASON_OPTIONS } from '../../lib/flags.js'
import { groupById } from '../../lib/groups.js'

// Same layout for every group; density changes. 5–7 and 7–11 get one section
// per screen with a Next button, 11+ get the whole lesson on one page.
export default function Lesson({ profile }) {
  const { lessonId } = useParams()
  const group = groupById(profile.ageGroup)
  const [version, setVersion] = useState(undefined)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    getVersion(profile.classId, lessonId, profile.ageGroup).then((v) =>
      setVersion(v?.status === 'published' ? v : null),
    )
  }, [profile.classId, profile.ageGroup, lessonId])

  const back = `/student/${profile.id}`
  if (version === undefined) return <p className="muted">Loading…</p>
  if (version === null) {
    return (
      <div className="notice">
        <h2>This lesson isn't ready yet</h2>
        <Link to={back}>Back to my lessons →</Link>
      </div>
    )
  }

  const sectionProps = { profile, lessonId, group }
  const n = version.sections.length
  const stepWord = group.id === 'concrete' ? 'Step' : 'Part'

  // Sidebar: one entry per section. One-per-screen groups jump to it; full-page
  // groups scroll to it.
  function goTo(i) {
    if (group.onePerScreen) setIndex(i)
    else document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="with-sidebar">
      <aside className="sidebar">
        <div className="sidebar-head">
          <img src="/icon.png" alt="" />
          <div>
            <strong>{version.title}</strong>
            <span className="muted small">Ages {group.label}</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {version.sections.map((s, i) => {
            const state = !group.onePerScreen ? '' : i < index ? 'done' : i === index ? 'current' : ''
            return (
              <button
                key={i}
                className={`side-item ${group.onePerScreen && i === index ? 'active' : ''}`}
                onClick={() => goTo(i)}
              >
                <span className={`dot ${state}`}>{state === 'done' ? '✓' : i + 1}</span>
                <span className="side-text">
                  <span className="label">
                    {stepWord} {i + 1}
                  </span>
                  {s.heading}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <article className={`lesson-${group.id}`}>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to={back}>My lessons</Link>
          <span aria-hidden="true">·</span>
          <span>{version.title}</span>
        </nav>

        {group.onePerScreen && (
          <div className="progress" aria-label={`${stepWord} ${index + 1} of ${n}`}>
            <span style={{ width: `${((index + 1) / n) * 100}%` }} />
          </div>
        )}

        <div className="lesson-card">
          {group.id === 'preoperational' && (
            <ReadAloud classId={profile.classId} lessonId={lessonId} index={index} profileId={profile.id} />
          )}

          {group.onePerScreen ? (
            <>
              <p className="label">
                {stepWord} {index + 1} of {n}
              </p>
              <Section key={index} index={index} section={version.sections[index]} {...sectionProps} />
              <div className="actions">
                <button className="btn big" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  ← Back
                </button>
                {index < n - 1 ? (
                  <button className="btn primary big" onClick={() => setIndex(index + 1)}>
                    Next →
                  </button>
                ) : (
                  <Link to={back} className="btn primary big">
                    Done ✓
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h1>{version.title}</h1>
              {version.sections.map((s, i) => (
                <Section key={i} index={i} section={s} {...sectionProps} />
              ))}
            </>
          )}
        </div>
      </article>
    </div>
  )
}

function Section({ index, section, profile, lessonId, group }) {
  return (
    <section className="lesson-section" id={`section-${index}`}>
      <h2>
        {group.id === 'concrete' && `${index + 1}. `}
        {section.heading}
      </h2>
      <p>{section.body}</p>
      {section.activity && (
        <p className="activity">
          <strong>Try it:</strong> {section.activity}
        </p>
      )}
      <FlagButton profile={profile} lessonId={lessonId} sectionIndex={index} />
    </section>
  )
}

// The lesson read aloud (Inworld voice, made when the teacher published).
// Plays on open and on each new screen; only if ai-voice-mode is on.
function ReadAloud({ classId, lessonId, index, profileId }) {
  const can = useKidPermission().can('ai-voice-mode')
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!can) return
    let cancelled = false
    getAudio(classId, lessonId, index).then((mp3) => {
      if (cancelled || !mp3) return
      audioRef.current?.pause()
      const audio = new Audio(`data:audio/mpeg;base64,${mp3}`)
      audio.onplay = () => setPlaying(true)
      audio.onpause = audio.onended = () => setPlaying(false)
      audioRef.current = audio
      // Browsers may block autoplay before a click; the button still works.
      audio.play().catch(() => setPlaying(false))
    })
    return () => {
      cancelled = true
      audioRef.current?.pause()
    }
  }, [can, classId, lessonId, index])

  if (!can) {
    return (
      <PermissionNotice
        name="ai-voice-mode"
        feature="Read aloud"
        settingsPath={`/student/${profileId}/settings`}
      />
    )
  }
  return (
    <button
      className="btn audio"
      onClick={() => {
        const a = audioRef.current
        if (!a) return
        if (playing) a.pause()
        else {
          a.currentTime = 0
          a.play().catch(() => {})
        }
      }}
    >
      {playing ? '■ Stop' : '▶ Read it to me'}
    </button>
  )
}

// Flag a section for the teacher. The optional note needs text-chat-private.
function FlagButton({ profile, lessonId, sectionIndex }) {
  const canNote = useKidPermission().can('text-chat-private')
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  async function send(reason) {
    await addFlag(profile.classId, {
      lessonId,
      ageGroup: profile.ageGroup,
      sectionIndex,
      reason,
      note: canNote && note.trim() ? note.trim().slice(0, 300) : null,
      studentId: profile.id,
    })
    setSent(true)
    setOpen(false)
  }

  if (sent) return <p className="muted small">⚑ Sent to your teacher.</p>
  if (!open) {
    return (
      <button className="flag-btn" onClick={() => setOpen(true)} aria-label="Flag this part">
        ⚑ Flag
      </button>
    )
  }
  return (
    <div className="flag-picker">
      {canNote && (
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for your teacher (optional)"
          maxLength={300}
        />
      )}
      <div className="actions">
        {REASON_OPTIONS.map(([id, label]) => (
          <button key={id} className="btn small" onClick={() => send(id)}>
            {label}
          </button>
        ))}
        <button className="btn small ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
