import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { GameData } from './Data/GameData'
import './Styles/Space.css'

GameData.install()

createRoot(document.getElementById('Root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
