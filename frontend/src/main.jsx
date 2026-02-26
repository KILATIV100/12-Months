/**
 * main.jsx — React entry point for 12 Months TWA.
 *
 * Imports:
 *   1. Global CSS reset + design tokens (variables.css)
 *   2. Tailwind base styles (index.css)
 *   3. Google Fonts (Cormorant Garamond, Jost, DM Mono)
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/variables.css'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
