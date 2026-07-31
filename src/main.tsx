import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import './index.css'
import App from './App.tsx'

// Both keys are inlined at build time, so they must exist in the deploy environment and not
// just in a local `.env.local` — otherwise Vite substitutes `undefined` and the app throws
// on mount with a blank page.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

// The SDK falls back to VITE_CLERK_PUBLISHABLE_KEY on its own, but @clerk/react 6.12's
// types still mark publishableKey required, so `tsc -b` fails without it. Passing the same
// env var explicitly keeps the build green and changes nothing at runtime.
//
// ConvexProviderWithClerk sits inside ClerkProvider and hands Convex a token fetcher, so
// every query and mutation carries the signed-in user's JWT. Convex verifies it server-side
// against `convex/auth.config.ts`.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </StrictMode>,
)
