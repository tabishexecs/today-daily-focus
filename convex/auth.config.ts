/**
 * `CLERK_JWT_ISSUER_DOMAIN` is set on the Convex deployment, not in `.env.local` — the server
 * reads it. It is the Clerk instance's Frontend API URL, e.g. `https://<slug>.clerk.accounts.dev`.
 *
 * `applicationID` must match the Clerk JWT template name that `ConvexProviderWithClerk`
 * requests via `template: 'convex'`.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
};
