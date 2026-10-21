import { useState } from 'react'
import { useKidPermission } from '@k-id/core'
import { useAuth } from '../../auth/context.js'
import { api } from '../../kid/claim.js'
import { PermissionNotice } from '../../kid/PermissionNotice.jsx'
import { addFlag } from '../../lib/data.js'
import { REASON_OPTIONS } from '../../lib/flags.js'
import { playMp3, saidWord, useRecorder, useVoice } from './hooks.js'

// A picture card's image, or its emoji until a picture exists.
export function Picture({ img, emoji, alt = '', className = '' }) {
  return (
    <span className={`pic ${className}`}>
      {img ? <img src={img} alt={alt} /> : <span className="emoji" aria-hidden="true">{emoji || '🖼️'}</span>}
    </span>
  )
}

// Plays a recorded voice line. Hidden when ai-voice-mode is off.
export function Speaker({ mp3, label = 'Listen', className = 'btn small' }) {
  const voice = useVoice()
  if (!voice || !mp3) return null
  return (
    <button type="button" className={className} onClick={() => playMp3(mp3)} aria-label={label}>
      🔊 {label}
    </button>
  )
}

export function VoiceNotice() {
  return <PermissionNotice name="ai-voice-mode" feature="Voice" settingsPath="/student/settings" />
}

// "Say it!": records 2.5 s, sends it to speech-to-text (the only student ->
// AI call; it can't generate content), and checks the word.
export function SayIt({ target, language, onResult, big = false }) {
  const { token } = useAuth()
  const voice = useVoice()
  const { state, record } = useRecorder()
  const [result, setResult] = useState(null) // null | 'yes' | 'no' | message
  const [checking, setChecking] = useState(false)

  if (!voice || !navigator.mediaDevices?.getUserMedia) return null

  async function go() {
    setResult(null)
    try {
      const audio = await record(2500)
      setChecking(true)
      const { transcript } = await api(token, 'POST', '/api/listen', { audio, language })
      const ok = saidWord(transcript, target)
      setResult(ok ? 'yes' : 'no')
      onResult?.(ok, transcript)
    } catch (err) {
      setResult(err.name === 'NotAllowedError' ? 'Allow the microphone to play.' : err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="sayit">
      <button
        type="button"
        className={`btn ${big ? 'giant mic' : 'primary'}`}
        disabled={state === 'recording' || checking}
        onClick={go}
      >
        {state === 'recording' ? '🎙️ Listening…' : checking ? '…' : '🎤 Say it!'}
      </button>
      {result === 'yes' && <span className="pop star">⭐</span>}
      {result === 'no' && <span className="try">Try again!</span>}
      {result && result !== 'yes' && result !== 'no' && <span className="muted small">{result}</span>}
    </div>
  )
}

// Flag a part for the teacher. The optional note needs text-chat-private.
export function FlagButton({ classId, lessonId, ageGroup, part, studentId }) {
  const canNote = useKidPermission().can('text-chat-private')
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  async function send(reason) {
    await addFlag(classId, {
      lessonId,
      ageGroup,
      part,
      reason,
      note: canNote && note.trim() ? note.trim().slice(0, 300) : null,
      studentId,
    })
    setSent(true)
    setOpen(false)
  }

  if (sent) return <p className="muted small flag-sent">⚑ Sent to your teacher.</p>
  if (!open) {
    return (
      <button type="button" className="flag-btn" onClick={() => setOpen(true)} aria-label="Flag this part">
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
          <button key={id} type="button" className="btn small" onClick={() => send(id)}>
            {label}
          </button>
        ))}
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export function Finished({ title, score, total, points, onBack }) {
  return (
    <div className="finished">
      <div className="pop big-emoji">🎉</div>
      <h2>{title}</h2>
      {total > 0 && (
        <p>
          You got <strong>{score}</strong> of <strong>{total}</strong>.
        </p>
      )}
      <p className="muted">+{points} points</p>
      <button className="btn primary big" onClick={onBack}>
        Back home
      </button>
    </div>
  )
}
