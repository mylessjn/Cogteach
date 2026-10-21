import { useState } from 'react'
import {
  KidPermission,
  KidSettings,
  KidSettingsProvider,
  useKidSession,
} from '@k-id/core'
import {
  SETTINGS_CHALLENGE_ID_KEY,
  loadId,
  saveId,
} from './kid/storage.js'
import './App.css'

const STAGES = [
  {
    name: 'Sensorimotor',
    ages: 'Birth to 2',
    summary:
      'Learning through senses and movement. Object permanence develops: things still exist when out of sight.',
  },
  {
    name: 'Preoperational',
    ages: '2 to 7',
    summary:
      'Language and symbolic play grow fast. Thinking is egocentric and conservation is not yet understood.',
  },
  {
    name: 'Concrete operational',
    ages: '7 to 11',
    summary:
      'Logical thinking about concrete events. Conservation, classification and reversibility emerge.',
  },
  {
    name: 'Formal operational',
    ages: '12 and up',
    summary:
      'Abstract and hypothetical reasoning. Learners test ideas systematically and think about thinking.',
  },
]

const TABS = ['Stages', 'Library', 'Voice tutor', 'Settings']

function NeedsApproval({ feature, onOpenSettings }) {
  return (
    <div className="locked">
      <p>{feature} is turned off for your account.</p>
      <button type="button" onClick={onOpenSettings}>
        Ask to turn it on in Settings
      </button>
    </div>
  )
}

function Stages() {
  return (
    <section>
      <h2>Piaget's stages of cognitive development</h2>
      <ul className="stages">
        {STAGES.map((stage) => (
          <li key={stage.name}>
            <h3>{stage.name}</h3>
            <span className="ages">{stage.ages}</span>
            <p>{stage.summary}</p>
          </li>
        ))}
      </ul>
      <KidPermission name="personalized-recommendations">
        <div className="panel">
          <h3>Recommended for you</h3>
          <p>Lessons matched to how you learn will appear here.</p>
        </div>
      </KidPermission>
    </section>
  )
}

function Library({ onOpenSettings }) {
  return (
    <section>
      <h2>Research library</h2>
      <KidPermission
        name="mods"
        fallback={
          <NeedsApproval
            feature="The research library"
            onOpenSettings={onOpenSettings}
          />
        }
      >
        <div className="panel">
          <p>Upload your own research topics and browse what others shared.</p>
          {/* TODO: upload form and topic list. */}
        </div>
      </KidPermission>
    </section>
  )
}

function VoiceTutor({ onOpenSettings }) {
  return (
    <section>
      <h2>Voice tutor</h2>
      <KidPermission
        name="ai-voice-mode"
        fallback={
          <NeedsApproval
            feature="The voice tutor"
            onOpenSettings={onOpenSettings}
          />
        }
      >
        <div className="panel">
          <p>Talk through a lesson with an AI tutor.</p>
          {/* TODO: Inworld voice integration. */}
        </div>
      </KidPermission>
    </section>
  )
}

function Settings() {
  const { sessionId } = useKidSession()
  const [challengeId] = useState(() => loadId(SETTINGS_CHALLENGE_ID_KEY))

  if (!sessionId) return <p>Loading settings…</p>

  return (
    <section>
      <h2>Settings</h2>
      <div className="settings">
        <KidSettingsProvider
          sessionId={sessionId}
          challengeId={challengeId}
          onChallenge={(id) => saveId(SETTINGS_CHALLENGE_ID_KEY, id)}
        >
          <KidSettings />
        </KidSettingsProvider>
      </div>
    </section>
  )
}

function App() {
  const [tab, setTab] = useState('Stages')
  const openSettings = () => setTab('Settings')

  return (
    <div className="app">
      <header>
        <h1>Cogteach</h1>
        <nav>
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              className={name === tab ? 'active' : undefined}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'Stages' && <Stages />}
      {tab === 'Library' && <Library onOpenSettings={openSettings} />}
      {tab === 'Voice tutor' && <VoiceTutor onOpenSettings={openSettings} />}
      {tab === 'Settings' && <Settings />}
    </div>
  )
}

export default App
