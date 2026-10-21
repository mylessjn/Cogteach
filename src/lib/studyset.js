// Study set shapes, one per stage. Shared by the server (Curate prompt and
// checking the model's JSON) and the app (review editor and players).
//
// Media keys ("card.0", "sentence.1", "turn.2", "vocab.3", "intro") name the
// audio and pictures stored per lesson and age group, and flags use the same
// keys to say which part a student is on.

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const list = (v) => (Array.isArray(v) ? v : [])

export class StudySetError extends Error {}

function need(cond, message) {
  if (!cond) throw new StudySetError(message)
}

// ---- shapes ----
const SHAPES = {
  preoperational: {
    focus:
      'audio-visual association for ages 3 to 6 (Piaget preoperational): 4 to 6 picture cards, one word each, no grammar, no reading needed',
    json: `{
  "title": string,                 // short and fun
  "language": string,              // BCP-47 code of the words being learned, e.g. "es"
  "intro": string,                 // one short spoken sentence to start, in English
  "cards": [{                      // 4 to 6
    "word": string,                // the word, e.g. "perro"
    "say": string,                 // what the voice says, e.g. "¡Perro!"
    "meaning": string,             // English meaning, for the teacher
    "picture": string,             // simple description of a cartoon picture of it
    "emoji": string                // one emoji for it
  }]
}`,
    normalize(raw) {
      const cards = list(raw.cards)
        .slice(0, 6)
        .map((c) => ({
          word: str(c.word, 60),
          say: str(c.say, 80) || str(c.word, 60),
          meaning: str(c.meaning, 120),
          picture: str(c.picture, 300),
          emoji: str(c.emoji, 8),
        }))
        .filter((c) => c.word)
      need(cards.length >= 4, 'Expected 4 to 6 picture cards.')
      return { intro: str(raw.intro, 300), cards }
    },
    spoken: (s) => [
      ...(s.intro ? [{ key: 'intro', text: s.intro, english: true }] : []),
      ...s.cards.map((c, i) => ({ key: `card.${i}`, text: c.say })),
    ],
    pictures: (s) => s.cards.map((c, i) => ({ key: `card.${i}`, prompt: c.picture || c.meaning })),
  },

  concrete: {
    focus:
      'pattern matching and sorting for ages 7 to 11 (Piaget concrete operational): a picture word grid, short sentences built from word blocks, and match pairs',
    json: `{
  "title": string,
  "language": string,              // BCP-47 code of the words being learned, e.g. "es"
  "intro": string,                 // one short sentence, in English
  "words": [{                      // 6 to 8
    "word": string, "meaning": string,
    "picture": string,             // simple description of a cartoon picture of it
    "emoji": string
  }],
  "sentences": [{                  // 3 or 4, each 3 to 6 words, using the words above
    "words": [string],             // the sentence split into word blocks, in order
    "meaning": string              // English meaning
  }],
  "pairs": [{                      // 4 to 6 match pairs, e.g. word -> meaning or verb -> noun
    "left": string, "right": string
  }]
}`,
    normalize(raw) {
      const words = list(raw.words)
        .slice(0, 8)
        .map((w) => ({
          word: str(w.word, 60),
          meaning: str(w.meaning, 120),
          picture: str(w.picture, 300),
          emoji: str(w.emoji, 8),
        }))
        .filter((w) => w.word)
      const sentences = list(raw.sentences)
        .slice(0, 4)
        .map((s) => ({ words: list(s.words).map((w) => str(w, 40)).filter(Boolean).slice(0, 8), meaning: str(s.meaning, 200) }))
        .filter((s) => s.words.length >= 2)
      const pairs = list(raw.pairs)
        .slice(0, 6)
        .map((p) => ({ left: str(p.left, 60), right: str(p.right, 60) }))
        .filter((p) => p.left && p.right)
      need(words.length >= 4, 'Expected 6 to 8 words.')
      need(sentences.length >= 2, 'Expected 3 or 4 sentences.')
      need(pairs.length >= 3, 'Expected 4 to 6 match pairs.')
      return { intro: str(raw.intro, 300), words, sentences, pairs }
    },
    spoken: (s) => [
      ...s.words.map((w, i) => ({ key: `card.${i}`, text: w.word })),
      ...s.sentences.map((x, i) => ({ key: `sentence.${i}`, text: x.words.join(' ') })),
    ],
    pictures: (s) => s.words.map((w, i) => ({ key: `card.${i}`, prompt: w.picture || w.meaning })),
  },

  formal: {
    focus:
      'contextual, conversational learning for ages 12 to 18 (Piaget formal operational): a text roleplay in a real place with reply choices and feedback, then idioms, slang and culture notes',
    json: `{
  "title": string,
  "language": string,              // BCP-47 code of the language used, e.g. "es"
  "scene": string,                 // the real place and situation, in English, e.g. "Ordering ramen in Tokyo"
  "turns": [{                      // 4 to 6
    "speaker": string,             // who is talking to the learner
    "line": string,                // what they say
    "translation": string,         // English
    "choices": [{                  // 3 replies the learner can pick
      "text": string, "correct": boolean, "feedback": string
    }]
  }],
  "notes": [{                      // 3 to 5 idioms, slang or culture notes
    "phrase": string, "meaning": string, "note": string
  }]
}`,
    normalize(raw) {
      const turns = list(raw.turns)
        .slice(0, 6)
        .map((t) => ({
          speaker: str(t.speaker, 40) || 'Them',
          line: str(t.line, 300),
          translation: str(t.translation, 300),
          choices: list(t.choices)
            .slice(0, 4)
            .map((c) => ({ text: str(c.text, 200), correct: c.correct === true, feedback: str(c.feedback, 300) }))
            .filter((c) => c.text),
        }))
        .filter((t) => t.line && t.choices.length >= 2 && t.choices.some((c) => c.correct))
      const notes = list(raw.notes)
        .slice(0, 5)
        .map((n) => ({ phrase: str(n.phrase, 80), meaning: str(n.meaning, 200), note: str(n.note, 300) }))
        .filter((n) => n.phrase)
      need(turns.length >= 3, 'Expected 4 to 6 roleplay turns, each with a correct reply.')
      need(notes.length >= 2, 'Expected 3 to 5 notes.')
      return { scene: str(raw.scene, 200), turns, notes }
    },
    spoken: (s) => s.turns.map((t, i) => ({ key: `turn.${i}`, text: t.line })),
    pictures: () => [],
  },

  adult: {
    focus:
      'spaced repetition and immersion for adult learners (andragogy): goal-oriented and practical, a vocabulary deck for flashcards, a real-world reading (news, business email) and questions on it',
    json: `{
  "title": string,
  "language": string,              // BCP-47 code of the language used, e.g. "es"
  "goal": string,                  // the practical goal, in English, one sentence
  "vocab": [{                      // 8 to 12
    "term": string, "meaning": string, "example": string
  }],
  "reading": { "title": string, "text": string },   // 120 to 220 words, real-world
  "questions": [{                  // 3 or 4, about the reading
    "question": string, "choices": [string], "answer": number,   // index into choices
    "explain": string
  }]
}`,
    normalize(raw) {
      const vocab = list(raw.vocab)
        .slice(0, 12)
        .map((v) => ({ term: str(v.term, 80), meaning: str(v.meaning, 200), example: str(v.example, 300) }))
        .filter((v) => v.term && v.meaning)
      const questions = list(raw.questions)
        .slice(0, 4)
        .map((q) => {
          const choices = list(q.choices).map((c) => str(c, 200)).filter(Boolean).slice(0, 4)
          return {
            question: str(q.question, 300),
            choices,
            answer: Number.isInteger(q.answer) && q.answer >= 0 && q.answer < choices.length ? q.answer : -1,
            explain: str(q.explain, 300),
          }
        })
        .filter((q) => q.question && q.choices.length >= 2 && q.answer >= 0)
      const reading = { title: str(raw.reading?.title, 120), text: str(raw.reading?.text, 2000) }
      need(vocab.length >= 6, 'Expected 8 to 12 vocabulary items.')
      need(reading.text.length > 0, 'Expected a reading.')
      need(questions.length >= 2, 'Expected 3 or 4 questions.')
      return { goal: str(raw.goal, 300), vocab, reading, questions }
    },
    spoken: (s) => s.vocab.map((v, i) => ({ key: `vocab.${i}`, text: v.term })),
    pictures: () => [],
  },
}

export const studySetJsonShape = (groupId) => SHAPES[groupId].json
export const studySetFocus = (groupId) => SHAPES[groupId].focus

// Checks the model's JSON for a group. Extra items are trimmed; a broken
// answer throws StudySetError (the teacher sees Regenerate).
export function normalizeStudySet(groupId, raw) {
  const shape = SHAPES[groupId]
  need(shape, `Unknown age group ${groupId}.`)
  need(raw && typeof raw === 'object', 'The model did not return an object.')
  const title = str(raw.title, 120)
  need(title, 'Missing title.')
  const language = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(raw.language ?? '') ? raw.language : 'en'
  return { title, language, ...shape.normalize(raw) }
}

// Every part the voice reads, made once at publish.
export const spokenParts = (groupId, set) => SHAPES[groupId].spoken(set)

// Every part that gets a picture (3–6 and 7–11 only).
export const pictureParts = (groupId, set) => SHAPES[groupId].pictures(set)

// A human label for a part key, for flags.
export function partLabel(key) {
  const [kind, i] = String(key).split('.')
  const n = i == null ? '' : ` ${Number(i) + 1}`
  const names = {
    card: 'Card',
    sentence: 'Sentence',
    pair: 'Match pair',
    turn: 'Turn',
    note: 'Note',
    vocab: 'Word',
    reading: 'Reading',
    question: 'Question',
    intro: 'Intro',
  }
  return `${names[kind] ?? kind}${n}`
}
