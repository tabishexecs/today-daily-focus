import { SignIn } from '@clerk/react';

/**
 * Clerk's prebuilt card, left stock — `index.css` fences the app's global element rules out
 * of `.cl-rootBox` so they can't repaint it.
 *
 * `withSignUp` runs the combined sign-in-or-up flow in this instance. Without it the "Sign up"
 * link follows `signUpUrl` to Clerk's hosted portal on another origin, leaving the SPA. No
 * `path` prop, so routing stays hash-based and in-app; this app has no router.
 */
export function SignInScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <SignIn withSignUp />
    </div>
  );
}
