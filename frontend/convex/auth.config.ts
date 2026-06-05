export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN, // e.g. "https://your-issuer-domain.clerk.accounts.dev"
      applicationID: "convex",
    },
  ],
};
