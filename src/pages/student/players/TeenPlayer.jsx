import { useState } from 'react'
import { Speaker, VoiceNotice } from '../bits.jsx'
import { shuffle } from '../hooks.js'

// Ages 12–18: contextual and conversational. A text roleplay in a real place
// with reply choices and feedback, then idioms, slang and culture notes.
export default function TeenPlayer({ studySet, media, flag, onDone }) {
  const { scene, turns, notes } = studySet
  // The model tends to list the right reply first; mix them once per lesson.
  const [orders] = useState(() => turns.map((t) => shuffle(t.choices.map((_, j) => j))))
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({}) // turn -> { choice, firstTry }
  const [shown, setShown] = useState({})
  const [phase, setPhase] = useState('chat') // chat | notes

  const turn = turns[i]
  const answer = answers[i]
  const score = Object.values(answers).filter((a) => a.firstTry).length

  function pickChoice(c, j) {
    if (answer?.correct) return
    setAnswers((a) => ({
      ...a,
      [i]: { choice: j, correct: c.correct, firstTry: a[i] ? a[i].firstTry : c.correct },
    }))
  }

  if (phase === 'notes') {
    return (
      <div className="teen">
        <p className="label">Idioms, slang & culture</p>
        <div className="note-list">
          {notes.map((n, j) => (
            <div key={j} className="note-card">
              <h3>{n.phrase}</h3>
              <p>{n.meaning}</p>
              {n.note && <p className="muted">{n.note}</p>}
              {flag(`note.${j}`)}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn primary big" onClick={() => onDone({ score, total: turns.length, points: score * 2 + 5 })}>
            Finish
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="teen">
      <p className="label">Scene</p>
      <p className="scene">{scene}</p>
      <VoiceNotice />

      <div className="chat">
        {turns.slice(0, i + 1).map((t, j) => (
          <div key={j}>
            <div className="bubble them">
              <span className="who-label">{t.speaker}</span>
              <p>{t.line}</p>
              {shown[j] && <p className="translation">{t.translation}</p>}
              <div className="bubble-tools">
                <Speaker mp3={media[`turn.${j}`]?.mp3} label="Play" className="link-btn" />
                <button type="button" className="link-btn" onClick={() => setShown((s) => ({ ...s, [j]: !s[j] }))}>
                  {shown[j] ? 'Hide translation' : 'Translate'}
                </button>
              </div>
            </div>
            {answers[j]?.correct && <div className="bubble me">{t.choices[answers[j].choice].text}</div>}
          </div>
        ))}
      </div>

      <div className="choices">
        {orders[i].map((j) => {
          const c = turn.choices[j]
          return (
            <button
              key={j}
              type="button"
              className={`choice ${answer?.choice === j ? (c.correct ? 'right' : 'wrong') : ''}`}
              disabled={answer?.correct}
              onClick={() => pickChoice(c, j)}
            >
              {c.text}
            </button>
          )
        })}
      </div>
      {answer && (
        <p className={answer.correct ? 'right-msg' : 'wrong-msg'}>
          {answer.correct ? '✅ ' : '↺ '}
          {turn.choices[answer.choice].feedback || (answer.correct ? 'Nice.' : 'Try another reply.')}
        </p>
      )}
      <div className="actions">
        {flag(`turn.${i}`)}
        {answer?.correct &&
          (i < turns.length - 1 ? (
            <button className="btn primary" onClick={() => setI(i + 1)}>
              Next →
            </button>
          ) : (
            <button className="btn primary" onClick={() => setPhase('notes')}>
              See the notes →
            </button>
          ))}
      </div>
    </div>
  )
}
