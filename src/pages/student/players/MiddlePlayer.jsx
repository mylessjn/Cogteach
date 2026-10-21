import { useMemo, useState } from 'react'
import { Picture, Speaker, VoiceNotice } from '../bits.jsx'
import { playMp3, shuffle, useVoice } from '../hooks.js'

// Ages 7–11: pattern matching and sorting. Tabs Learn / Build / Match, a
// progress bar, badges, and a sticker count.
export default function MiddlePlayer({ studySet, media, flag, onDone }) {
  const [tab, setTab] = useState('learn')
  const [learned, setLearned] = useState({})
  const [built, setBuilt] = useState({}) // sentence index -> first try right?
  const [matched, setMatched] = useState({}) // pair index -> true
  const [stickers, setStickers] = useState(0)
  const [badge, setBadge] = useState(null)

  const { words, sentences, pairs } = studySet
  const total = words.length + sentences.length + pairs.length
  const doneCount = Object.keys(learned).length + Object.keys(built).length + Object.keys(matched).length
  const tabsDone = {
    learn: Object.keys(learned).length === words.length,
    build: Object.keys(built).length === sentences.length,
    match: Object.keys(matched).length === pairs.length,
  }

  function award(n, label) {
    setStickers((s) => s + n)
    if (label) {
      setBadge(label)
      setTimeout(() => setBadge(null), 1600)
    }
  }

  function finish() {
    const score = Object.values(built).filter(Boolean).length + Object.keys(matched).length
    onDone({ score, total: sentences.length + pairs.length, points: stickers + 5 })
  }

  return (
    <div className="middle">
      <div className="middle-top">
        <div className="progress big" aria-label={`${doneCount} of ${total} done`}>
          <span style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
        <span className="stickers" title="Stickers">
          🌟 {stickers}
        </span>
      </div>
      {badge && <div className="badge-pop pop">🏅 {badge}</div>}
      <VoiceNotice />

      <div className="tabs-row" role="tablist">
        {[
          ['learn', 'Learn'],
          ['build', 'Build'],
          ['match', 'Match'],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'on' : ''}`}
            onClick={() => setTab(id)}
          >
            {label} {tabsDone[id] && '🏅'}
          </button>
        ))}
      </div>

      {tab === 'learn' && (
        <Learn
          words={words}
          media={media}
          learned={learned}
          flag={flag}
          onLearn={(i) => {
            if (learned[i]) return
            const next = { ...learned, [i]: true }
            setLearned(next)
            award(1, Object.keys(next).length === words.length ? 'All words learned!' : null)
          }}
        />
      )}
      {tab === 'build' && (
        <Build
          sentences={sentences}
          media={media}
          built={built}
          flag={flag}
          onBuilt={(i, firstTry) => {
            const next = { ...built, [i]: firstTry }
            setBuilt(next)
            award(firstTry ? 2 : 1, Object.keys(next).length === sentences.length ? 'Sentence builder!' : 'Nice sentence!')
          }}
        />
      )}
      {tab === 'match' && (
        <Match
          pairs={pairs}
          matched={matched}
          flag={flag}
          onMatch={(i) => {
            const next = { ...matched, [i]: true }
            setMatched(next)
            award(1, Object.keys(next).length === pairs.length ? 'Match master!' : null)
          }}
        />
      )}

      <div className="actions">
        <button className="btn primary big" onClick={finish} disabled={doneCount === 0}>
          {doneCount === total ? 'Finish 🏁' : `Finish (${doneCount}/${total})`}
        </button>
      </div>
    </div>
  )
}

function Learn({ words, media, learned, onLearn, flag }) {
  const voice = useVoice()
  return (
    <>
      <p className="muted">Tap a picture to hear the word.</p>
      <div className="word-grid">
        {words.map((w, i) => (
          <div key={i} className={`word-tile ${learned[i] ? 'learned' : ''}`}>
            <button
              type="button"
              onClick={() => {
                if (voice) playMp3(media[`card.${i}`]?.mp3)
                onLearn(i)
              }}
            >
              <Picture img={media[`card.${i}`]?.img} emoji={w.emoji} alt={w.word} />
              <strong>{w.word}</strong>
              <span className="muted small">{w.meaning}</span>
            </button>
            {flag(`card.${i}`)}
          </div>
        ))}
      </div>
    </>
  )
}

// Drag word blocks (or tap them) into the sentence, then check.
function Build({ sentences, media, built, onBuilt, flag }) {
  const [i, setI] = useState(() => {
    const first = sentences.findIndex((_, j) => !(j in built))
    return first === -1 ? 0 : first
  })
  const sentence = sentences[i]
  const blocks = useMemo(() => shuffle(sentence.words.map((w, j) => ({ w, j }))), [sentence])
  const [placed, setPlaced] = useState([])
  const [tries, setTries] = useState(0)
  const [state, setState] = useState(null) // null | 'right' | 'wrong'

  const left = blocks.filter((b) => !placed.includes(b))
  const place = (b) => {
    setState(null)
    setPlaced((p) => [...p, b])
  }
  const unplace = (b) => {
    setState(null)
    setPlaced((p) => p.filter((x) => x !== b))
  }

  function check() {
    const right = placed.map((b) => b.w).join(' ') === sentence.words.join(' ')
    setState(right ? 'right' : 'wrong')
    setTries((t) => t + 1)
    if (right && !(i in built)) onBuilt(i, tries === 0)
  }

  function go(n) {
    setI(n)
    setPlaced([])
    setTries(0)
    setState(null)
  }

  return (
    <div className="build">
      <p className="label">
        Sentence {i + 1} of {sentences.length} {i in built && '✓'}
      </p>
      <p className="muted">Build: “{sentence.meaning}”</p>
      <div
        className={`slots ${state ?? ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const b = blocks[Number(e.dataTransfer.getData('text/plain'))]
          if (b && !placed.includes(b)) place(b)
        }}
      >
        {placed.length === 0 && <span className="muted small">Drag or tap the blocks here</span>}
        {placed.map((b) => (
          <button key={b.j} type="button" className="block placed" onClick={() => unplace(b)}>
            {b.w}
          </button>
        ))}
      </div>
      <div className="blocks">
        {left.map((b) => (
          <button
            key={b.j}
            type="button"
            className="block"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(blocks.indexOf(b)))}
            onClick={() => place(b)}
          >
            {b.w}
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="btn primary" disabled={placed.length !== blocks.length} onClick={check}>
          Check
        </button>
        {state === 'right' && <span className="pop right-msg">✅ Yes!</span>}
        {state === 'wrong' && <span className="wrong-msg">Not quite. Tap a block to move it back.</span>}
        {state === 'right' && <Speaker mp3={media[`sentence.${i}`]?.mp3} label="Hear it" />}
      </div>
      <div className="actions">
        <button className="btn small" disabled={i === 0} onClick={() => go(i - 1)}>
          ← Back
        </button>
        <button className="btn small" disabled={i === sentences.length - 1} onClick={() => go(i + 1)}>
          Next sentence →
        </button>
        {flag(`sentence.${i}`)}
      </div>
    </div>
  )
}

// Tap a left card, then its partner on the right.
function Match({ pairs, matched, onMatch, flag }) {
  const rights = useMemo(() => shuffle(pairs.map((p, i) => ({ text: p.right, i }))), [pairs])
  const [pick, setPick] = useState(null)
  const [miss, setMiss] = useState(null)

  function choose(r) {
    if (pick == null || matched[r.i]) return
    if (r.i === pick) {
      onMatch(pick)
      setPick(null)
    } else {
      setMiss(r.i)
      setTimeout(() => setMiss(null), 600)
    }
  }

  return (
    <>
      <p className="muted">Tap a card on the left, then its match on the right.</p>
      <div className="match">
        <div className="match-col">
          {pairs.map((p, i) => (
            <button
              key={i}
              type="button"
              className={`match-card ${matched[i] ? 'done' : pick === i ? 'on' : ''}`}
              disabled={matched[i]}
              onClick={() => setPick(i)}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((r) => (
            <button
              key={r.i}
              type="button"
              className={`match-card ${matched[r.i] ? 'done' : miss === r.i ? 'miss' : ''}`}
              disabled={matched[r.i]}
              onClick={() => choose(r)}
            >
              {r.text}
            </button>
          ))}
        </div>
      </div>
      {pick != null && flag(`pair.${pick}`)}
    </>
  )
}
