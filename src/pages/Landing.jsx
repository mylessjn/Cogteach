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
              A teacher writes one lesson prompt. Every student gets it in the form their brain is
              ready for, based on Piaget's stages, and a verified adult checks anything that
              reaches young kids.
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
            <p>Ages 5–7, 7–11, 11–17 and adults each get their own version.</p>
          </div>
          <div className="card">
            <div className="icon">✅</div>
            <h3>Adult-checked</h3>
            <p>A verified adult approves anything for kids under 11.</p>
          </div>
        </section>
      </main>
    </Layout>
  )
}
