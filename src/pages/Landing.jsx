import { Link } from 'react-router-dom'
import { Hero, Layout } from '../components/Layout.jsx'

export default function Landing() {
  return (
    <Layout
      links={[
        { to: '/teacher', label: 'Teacher' },
        { to: '/student', label: 'Student' },
      ]}
    >
      <Hero eyebrow="Build for Everyone · Education">
        One lesson,
        <br />
        <span className="accent">
          <em>every</em> age.
        </span>
      </Hero>
      <p className="lede">
        A teacher writes one lesson prompt. Every student gets it in the form their brain is
        ready for, based on Piaget's stages, and a verified adult checks anything that reaches
        young kids.
      </p>
      <div className="actions">
        <Link to="/teacher" className="btn primary">
          I'm a teacher →
        </Link>
        <Link to="/student" className="btn">
          I'm a student
        </Link>
      </div>
      <div className="blurbs">
        <div className="blurb fill-blue">
          <h3>One prompt</h3>
          <p>The teacher writes the lesson once.</p>
        </div>
        <div className="blurb fill-orange">
          <h3>Every age</h3>
          <p>Ages 5–7, 7–11, 11–17 and adults each get their own version.</p>
        </div>
        <div className="blurb fill-green">
          <h3>Adult-checked</h3>
          <p>A verified adult approves anything for kids under 11.</p>
        </div>
      </div>
    </Layout>
  )
}
