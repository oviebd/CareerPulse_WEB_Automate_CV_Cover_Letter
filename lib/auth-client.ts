/** Auth.js is the only auth provider. */
export const USE_AUTH_JS = true;

/** Google OAuth is available when client id is set at build time. */
export const AUTH_GOOGLE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
);

/** Magic link via Auth.js requires a DB adapter — disabled until wired. */
export const AUTH_MAGIC_LINK_ENABLED = false;
