import { useState } from 'react'
import { Picture, SayIt, VoiceNotice } from '../bits.jsx'
import { playMp3, useVoice } from '../hooks.js'

// Ages 3–6: audio-visual association. One giant picture at a time. Tap it to
// hear the word, then say it into the mic for a star. Minimal text.
export default function EarlyPlayer({ studySet, media, flag, onDone }) {
  const voice = useVoice()
  const [started, setStarted] = useState(false)
  const [i, setI] = useState(0)
  const [stars, setStars] = useState({})
  const cards = studySet.cards
  const card = cards[i]
  const img = media[`card.${i}`]?.img
  const mp3 = media[`card.${i}`]?.mp3

  if (!started) {
    // The first tap also lets the browser play audio.
    return (
      <div className="early-start">
        <Picture img={media['card.0']?.img} emoji={cards[0].emoji} className="giant-pic" />
        <button
          className="btn giant"
          onClick={() => {
            setStarted(true)
            if (voice) playMp3(media.intro?.mp3 ?? mp3)
          }}
        >
          ▶ Let's go!
        </button>
        <VoiceNotice />
      </div>
    )
  }

  const next = () => {
    if (i < cards.length - 1) {
      setI(i + 1)
      if (voice) playMp3(media[`card.${i + 1}`]?.mp3)
    } else {
      const score = Object.values(stars).filter(Boolean).length
      onDone({ score, total: cards.length, points: score + 5 })
    }
  }

  return (
    <div className="early">
      <div className="dots" aria-label={`Card ${i + 1} of ${cards.length}`}>
        {cards.map((_, j) => (
          <span key={j} className={`dot ${j < i ? 'done' : j === i ? 'current' : ''}`}>
            {stars[j] ? '⭐' : ''}
          </span>
        ))}
      </div>
      <button
        className="giant-card"
        onClick={() => voice && playMp3(mp3)}
        aria-label={voice ? `Hear ${card.word}` : card.word}
      >
        <Picture img={img} emoji={card.emoji} alt={card.word} className="giant-pic" />
        <span className="giant-word">{card.word}</span>
      </button>
      <SayIt
        big
        target={card.word}
        language={studySet.language}
        onResult={(ok) => ok && setStars((s) => ({ ...s, [i]: true }))}
      />
      <button className="btn giant next" onClick={next} aria-label="Next">
        {i < cards.length - 1 ? '➜' : '🏁'}
      </button>
      {flag(`card.${i}`)}
      {!voice && <VoiceNotice />}
    </div>
  )
}
