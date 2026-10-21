import { useMemo, useState } from 'react'
import { useAuth } from '../../../auth/context.js'
import { addPoints, saveProgress } from '../../../lib/data.js'
import { Speaker, VoiceNotice } from '../bits.jsx'
import { cardId, isDue, nextCard, shuffle, useTimer } from '../hooks.js'

// Adults (andragogy): spaced repetition and immersion. Flashcards that come
// back on a schedule (Leitner boxes), the vocabulary list, and a real-world
// reading with questions. A timer shows time-to-complete.
export default function AdultPlayer({ classId, lessonId, studySet, media, progress, flag, onDone }) {
  const [tab, setTab] = useState('cards')
  const [answers, setAnswers] = useState({})
  const seconds = useTimer()
  const { goal, vocab, reading, questions } = studySet
  // Mix the choice order once per lesson so the answer isn't always in one spot.
  const [orders] = useState(() => questions.map((q) => shuffle(q.choices.map((_, j) => j))))
  const score = questions.filter((q, i) => answers[i] === q.answer).length
  const answeredAll = Object.keys(answers).length === questions.length

  return (
    <div className="adult">
      <div className="adult-top">
        <p className="muted">{goal}</p>
        <span className="timer">⏱ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      </div>
      <VoiceNotice />
      <div className="tabs-row" role="tablist">
        {[
          ['cards', 'Flashcards'],
          ['vocab', 'Vocabulary'],
          ['reading', 'Reading'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'cards' && (
        <Flashcards classId={classId} lessonId={lessonId} vocab={vocab} media={media} progress={progress} flag={flag} />
      )}

      {tab === 'vocab' && (
        <table className="vocab-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Meaning</th>
              <th>Example</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vocab.map((v, i) => (
              <tr key={i}>
                <td>
                  <strong>{v.term}</strong> <Speaker mp3={media[`vocab.${i}`]?.mp3} label="" className="link-btn" />
                </td>
                <td>{v.meaning}</td>
                <td className="muted">{v.example}</td>
                <td>{flag(`vocab.${i}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'reading' && (
        <div className="reading">
          <h2>{reading.title}</h2>
          {reading.text.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {flag('reading')}
          <h3>Questions</h3>
          {questions.map((q, i) => (
            <div key={i} className="question">
              <p>
                <strong>{i + 1}.</strong> {q.question}
              </p>
              <div className="choices">
                {orders[i].map((j) => (
                  <button
                    key={j}
                    type="button"
                    className={`choice ${answers[i] === j ? (j === q.answer ? 'right' : 'wrong') : ''}`}
                    disabled={i in answers}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                  >
                    {q.choices[j]}
                  </button>
                ))}
              </div>
              {i in answers && (
                <p className={answers[i] === q.answer ? 'right-msg' : 'wrong-msg'}>
                  {answers[i] === q.answer ? '✅ Correct. ' : `✗ The answer is “${q.choices[q.answer]}”. `}
                  {q.explain}
                </p>
              )}
              {flag(`question.${i}`)}
            </div>
          ))}
          <div className="actions">
            <button
              className="btn primary big"
              disabled={!answeredAll}
              onClick={() => onDone({ score, total: questions.length, points: score * 2 + 5 })}
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Rapid-fire flashcards. "Got it" moves a card up a box (it comes back later);
// "Again" sends it to box 1 (it comes back today).
function Flashcards({ classId, lessonId, vocab, media, progress, flag }) {
  const { account } = useAuth()
  const cards = useMemo(() => progress?.cards ?? {}, [progress])
  // Fix the deck when the tab opens, so answering doesn't reshuffle it.
  const [deck] = useState(() => vocab.map((_, i) => i).filter((i) => isDue(cards[cardId(lessonId, i)])))
  const [pos, setPos] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const boxes = useMemo(
    () => vocab.map((_, i) => cards[cardId(lessonId, i)]?.box ?? 0),
    [vocab, cards, lessonId],
  )

  if (deck.length === 0 || pos >= deck.length) {
    return (
      <div className="notice">
        <h3>No cards due</h3>
        <p className="muted">Every card is scheduled for later. Come back tomorrow to keep them fresh.</p>
        <BoxBar boxes={boxes} />
      </div>
    )
  }

  const i = deck[pos]
  const v = vocab[i]

  async function answer(knewIt) {
    const id = cardId(lessonId, i)
    await saveProgress(classId, account.id, { cards: { [id]: nextCard(cards[id], knewIt) } })
    if (knewIt) addPoints(classId, account, 1)
    setFlipped(false)
    setPos(pos + 1)
  }

  return (
    <div className="flash">
      <p className="label">
        Card {pos + 1} of {deck.length} due
      </p>
      <button type="button" className={`flashcard ${flipped ? 'back' : ''}`} onClick={() => setFlipped(!flipped)}>
        {flipped ? (
          <>
            <strong>{v.meaning}</strong>
            {v.example && <span className="muted">{v.example}</span>}
          </>
        ) : (
          <>
            <strong>{v.term}</strong>
            <span className="muted small">Tap to flip</span>
          </>
        )}
      </button>
      <div className="actions">
        <Speaker mp3={media[`vocab.${i}`]?.mp3} label="Hear it" />
        {flipped && (
          <>
            <button className="btn" onClick={() => answer(false)}>
              Again
            </button>
            <button className="btn primary" onClick={() => answer(true)}>
              Got it
            </button>
          </>
        )}
        {flag(`vocab.${i}`)}
      </div>
      <BoxBar boxes={boxes} />
    </div>
  )
}

function BoxBar({ boxes }) {
  const counts = [0, 1, 2, 3, 4, 5].map((b) => boxes.filter((x) => x === b).length)
  return (
    <p className="muted small">
      New {counts[0]} · Box 1 {counts[1]} · Box 2 {counts[2]} · Box 3 {counts[3]} · Box 4 {counts[4]} · Box 5{' '}
      {counts[5]}
    </p>
  )
}
