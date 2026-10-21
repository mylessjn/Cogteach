import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KidCoreProvider } from '@k-id/core'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import {
  KID_APPEARANCE,
  KID_BASE_URL,
  KID_DECLARE,
  KID_PUBLISHABLE_KEY,
} from './kid/config.js'

// Wrapped once in KidCoreProvider. Each k-ID session (the teacher, each
// student profile) gets its own KidSessionProvider inside, via KidGate.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KidCoreProvider
      publishableKey={KID_PUBLISHABLE_KEY}
      baseUrl={KID_BASE_URL}
      declare={KID_DECLARE}
      appearance={KID_APPEARANCE}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </KidCoreProvider>
  </StrictMode>,
)
