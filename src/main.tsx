import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.tsx'

// The SDK falls back to VITE_CLERK_PUBLISHABLE_KEY on its own, but @clerk/react 6.12's
// types still mark publishableKey required, so `tsc -b` fails without it. Passing the same
// env var explicitly keeps the build green and changes nothing at runtime.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
