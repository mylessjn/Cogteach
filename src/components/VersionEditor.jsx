import { flagReasonLabel } from '../lib/flags.js'
import { groupById } from '../lib/groups.js'

// One age version as an editable review card, with the review checkbox at the
// bottom. Flags (Modify tab) show next to the section they're on.
export function VersionEditor({ groupId, version, onChange, reviewed, onReviewed, flags = [], onResolve }) {
  const group = groupById(groupId)

  const setSection = (i, field, value) =>
    onChange({
      ...version,
      sections: version.sections.map((s, j) => (j === i ? { ...s, [field]: value } : s)),
    })

  return (
    <article className="review-card">
      <p className="eyebrow">
        {group.label} · {group.name}
      </p>
      <input
        className="edit-title"
        value={version.title}
        onChange={(e) => onChange({ ...version, title: e.target.value })}
        aria-label="Title"
      />
      {version.sections.map((section, i) => {
        const sectionFlags = flags.filter((f) => f.sectionIndex === i && f.status === 'open')
        return (
          <section key={i} className="edit-section">
            <div className="edit-section-head">
              <span className="dot current">{i + 1}</span>
              <input
                value={section.heading}
                onChange={(e) => setSection(i, 'heading', e.target.value)}
                aria-label={`Section ${i + 1} heading`}
              />
            </div>
            <textarea
              rows={4}
              value={section.body}
              onChange={(e) => setSection(i, 'body', e.target.value)}
              aria-label={`Section ${i + 1} text`}
            />
            <label className="small muted">Activity</label>
            <textarea
              rows={2}
              value={section.activity}
              onChange={(e) => setSection(i, 'activity', e.target.value)}
              aria-label={`Section ${i + 1} activity`}
            />
            {sectionFlags.length > 0 && (
              <ul className="flags">
                {sectionFlags.map((f) => (
                  <li key={f.id}>
                    <span>
                      ⚑ <strong>{flagReasonLabel(f.reason)}</strong>
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
          </section>
        )
      })}
      <label className={`review-check ${group.reviewRequired ? 'required' : ''}`}>
        <input type="checkbox" checked={reviewed} onChange={(e) => onReviewed(e.target.checked)} />
        I reviewed this for {group.label}
        {group.reviewRequired ? ' (required)' : ' (optional)'}
      </label>
    </article>
  )
}
