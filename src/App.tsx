import { ClipboardList } from 'lucide-react'

import './App.css'

function App() {
  return (
    <main className="app-container">
      <ClipboardList className="app-icon" aria-hidden="true" />
      <h1>Evalu8 MVP</h1>
      <p>
        Sports evaluation tooling is on the way. We&apos;ll start wiring features
        once the design system is in place.
      </p>
    </main>
  )
}

export default App
