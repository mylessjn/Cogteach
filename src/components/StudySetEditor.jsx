import { flagReasonLabel } from '../lib/flags.js'
import { groupById } from '../lib/groups.js'
import { partLabel } from '../lib/studyset.js'

// List field -> the part key prefix used for media and flags.
const LIST_KIND = {
  cards: 'card',
  words: 'card',
  sentences: 'sentence',
  pairs: 'pair',
  turns: 'turn',
  notes: 'note',
  vocab: 'vocab',
  questions: 'question',
  choices: 'choice',
}

const pretty = (name) => name.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

// One field of any type, recursively. Every field of the study set is editable.
function Field({ name, value, onChange, path, siblings }) {
  const id = path.join('-')
  if (typeof value === 'boolean') {
    return (
      <label className="field-check">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {pretty(name)}
      </label>
    )
  }
  if (typeof value === 'number') {
    // The only number is a question's answer: pick it from the choices.
    const choices = siblings?.choices ?? []
    return (
      <div className="field">
        <label htmlFor={id}>Correct answer</label>
        <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))}>
          {choices.map((c, i) => (
            <option key={i} value={i}>
              {i + 1}. {c}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (typeof value === 'string') {
    const long = value.length > 70 || name === 'text'
    return (
      <div className="field">
        <label htmlFor={id}>{pretty(name)}</label>
        {long ? (
          <textarea id={id} rows={name === 'text' ? 8 : 3} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    )
  }
  if (Array.isArray(value)) {
    return (
      <div className="field">
        <label>{pretty(name)}</label>
        <div className={value.every((v) => typeof v === 'string') ? 'chips-edit' : 'items'}>
          {value.map((item, i) =>
            typeof item === 'string' ? (
              <input
                key={i}
                value={item}
                aria-label={`${pretty(name)} ${i + 1}`}
                onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
              />
            ) : (
              <div key={i} className="item">
                <p className="label">{partLabel(`${LIST_KIND[name] ?? name}.${i}`)}</p>
                <Fields
                  value={item}
                  path={[...path, i]}
                  onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
                />
              </div>
            ),
          )}
        </div>
      </div>
    )
  }
  if (value && typeof value === 'object') {
    return (
      <fieldset className="field group-field">
        <legend>{pretty(name)}</legend>
        <Fields value={value} path={path} onChange={onChange} />
      </fieldset>
    )
  }
  return null
}

function Fields({ value, onChange, path }) {
  return Object.entries(value).map(([name, v]) => (
    <Field
      key={name}
      name={name}
      value={v}
      path={[...path, name]}
      siblings={value}
      onChange={(next) => onChange({ ...value, [name]: next })}
    />
  ))
}

// The pictures for this study set, each with "New picture".
function Pictures({ studySet, pictureKeys, pictures, onNewPicture }) {
  const items = studySet.cards ?? studySet.words ?? []
  return (
    <div className="picture-grid">
      {pictureKeys.map(({ key }, i) => {
        const p = pictures[key] ?? {}
        return (
          <figure key={key} className="picture-tile">
            <div className="picture-box">
              {p.img ? (
                <img src={p.img} alt={items[i]?.word ?? ''} />
              ) : (
                <span className="emoji" aria-hidden="true">
                  {items[i]?.emoji || '🖼️'}
                </span>
              )}
              {p.status === 'loading' && <span className="picture-status">Drawing…</span>}
            </div>
            <figcaption>
              <strong>{items[i]?.word}</strong>
              <button type="button" className="btn small ghost" disabled={p.status === 'loading'} onClick={() => onNewPicture(key)}>
                ↻ New picture
              </button>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

// One age group's study set as an editable review card: open flags at the top,
// pictures (3–6 and 7–11), every field, then the review box.
export function StudySetEditor({
  groupId,
  studySet,
  onChange,
  reviewed,
  onReviewed,
  pictureKeys = [],
  pictures = {},
  pictureError,
  onNewPicture,
  flags = [],
  onResolve,
}) {
  const group = groupById(groupId)
  const openFlags = flags.filter((f) => f.status === 'open')

  return (
    <article className="review-card">
      <p className="eyebrow">
        Ages {group.label} · {group.name} · {group.stage}
      </p>

      {openFlags.length > 0 && (
        <ul className="flags">
          {openFlags.map((f) => (
            <li key={f.id}>
              <span>
                ⚑ <strong>{partLabel(f.part)}</strong> · {flagReasonLabel(f.reason)}
                {f.studentName && ` · ${f.studentName}`}
                {f.note && <span className="muted"> · “{f.note}”</span>}
              </span>
              <button type="button" className="btn small" onClick={() => onResolve(f.id)}>
                Resolved
              </button>
            </li>
          ))}
        </ul>
      )}

      {pictureKeys.length > 0 && (
        <>
          <Pictures studySet={studySet} pictureKeys={pictureKeys} pictures={pictures} onNewPicture={onNewPicture} />
          {pictureError && <p className="muted small">Pictures: {pictureError} Students see the emoji instead.</p>}
        </>
      )}

      <div className="fields">
        <Fields value={studySet} path={[groupId]} onChange={onChange} />
      </div>

      <label className={`review-check ${group.reviewRequired ? 'required' : ''}`}>
        <input type="checkbox" checked={reviewed} onChange={(e) => onReviewed(e.target.checked)} />
        I reviewed the words, pictures and voice lines for ages {group.label}
        {group.reviewRequired ? ' (required)' : ' (optional)'}
      </label>
    </article>
  )
}
