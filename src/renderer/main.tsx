import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App'
import './styles/index.css'

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Prevent default browser error handling
  event.preventDefault()
})

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error)
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

try {
  root.render(
    <React.StrictMode>
      <App />
      <Toaster />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Failed to render app:', error)
  root.render(
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Application Error</h1>
      <p>The application failed to start. Please check the console for details.</p>
    </div>
  )
}
