import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './Styles/Space.css'

createRoot(document.getElementById('Root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
