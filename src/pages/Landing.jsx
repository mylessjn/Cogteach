import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout.jsx'

export default function Landing() {
  return (
    <Layout
      bare
      links={[
        { to: '/teacher', label: 'Teachers' },
        { to: '/student', label: 'Students' },
      ]}
    >
      <main className="landing">
        <section className="hero-band">
          <div className="hero-inner">
            <p className="eyebrow">Build for Everyone · Education</p>
            <h1>One lesson, every age.</h1>
            <p className="lede">
              A teacher writes one lesson prompt. Every student gets a study set built for how their
              brain learns at their stage, and a verified adult checks every word, picture and voice
              line that reaches young kids.
            </p>
            <div className="actions">
              <Link to="/teacher" className="btn primary big">
                I'm a teacher →
              </Link>
              <Link to="/student" className="btn big">
                I'm a student
              </Link>
            </div>
          </div>
        </section>
        <section className="blurbs">
          <div className="card">
            <div className="icon">✏️</div>
            <h3>One prompt</h3>
            <p>The teacher writes the lesson once.</p>
          </div>
          <div className="card">
            <div className="icon">🧩</div>
            <h3>Every age</h3>
            <p>
              Ages 3–6 tap pictures and say words, 7–11 build and match, 12–18 roleplay, adults
              drill flashcards.
            </p>
          </div>
          <div className="card">
            <div className="icon">✅</div>
            <h3>Adult-checked</h3>
            <p>A verified adult approves every word, picture and voice line for kids under 12.</p>
          </div>
        </section>
      </main>
    </Layout>
  )
}
