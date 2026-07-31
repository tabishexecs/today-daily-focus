/**
 * Tells Convex which JWTs to trust. `CLERK_JWT_ISSUER_DOMAIN` is set on the Convex
 * deployment (not in `.env.local` — the server reads it, not the browser); it is the Clerk
 * instance's Frontend API URL, e.g. `https://<slug>.clerk.accounts.dev`.
 *
 * `applicationID` must match the name of the JWT template configured in Clerk, which
 * `ConvexProviderWithClerk` requests by passing `template: 'convex'`.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
};
