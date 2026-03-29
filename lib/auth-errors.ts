/** Map Supabase Auth error messages to user-facing copy (no internal details). */
export function authErrorMessage(message: string | undefined): string {
  if (!message) return 'Something went wrong. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'Invalid email or password.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (m.includes('user already registered'))
    return 'An account with this email already exists. Try signing in.';
  if (m.includes('password') && m.includes('least'))
    return 'Password does not meet requirements.';
  if (m.includes('invalid email')) return 'Enter a valid email address.';
  if (m.includes('rate limit')) return 'Too many attempts. Wait a moment and try again.';
  if (m.includes('otp') || m.includes('token')) return 'This sign-in link is invalid or expired.';
  return message.length < 120 ? message : 'Something went wrong. Please try again.';
}
