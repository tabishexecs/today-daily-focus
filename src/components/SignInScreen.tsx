import { SignIn } from '@clerk/react';

/**
 * Signed-out landing: Clerk's prebuilt <SignIn /> card. No `appearance` prop and no styling
 * reaching the card — the wrapper only centres it. (See index.css, which fences the app's
 * global element rules out of `.cl-rootBox` so they can't repaint it either.)
 *
 * `withSignUp` runs the combined sign-in-or-up flow inside this one instance. Without it the
 * "Sign up" link follows `signUpUrl`, which defaults to the instance's hosted Account Portal
 * on accounts.dev — a different origin, so the user leaves the app and lands on a page with
 * its own dashboard-configured theme and no way back into the SPA.
 *
 * No `path` prop, so routing stays hash-based and in-app; this app has no router.
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
