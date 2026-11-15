import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './Styles/Space.css'
import './Styles/Scene.css'
import './Styles/Hints.css'
import './Styles/Sources.css'
import './Styles/Logbook.css'

createRoot(document.getElementById('Root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
