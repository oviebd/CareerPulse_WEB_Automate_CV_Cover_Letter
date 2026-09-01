# Manual smoke checklist

Run after every migration phase (local or Docker).

## Auth
- [ ] Register with email + password
- [ ] Login with email + password
- [ ] Login with Google OAuth (when configured)
- [ ] Magic link email (when configured)
- [ ] Sign out
- [ ] Protected routes redirect to `/login` when signed out

## Dashboard & onboarding
- [ ] Dashboard loads after login
- [ ] Onboarding gate completes and sets `is_onboarded`

## CV
- [ ] CV list / versions load
- [ ] CV profile loads (latest or by id)
- [ ] CV edit and save
- [ ] CV upload (PDF/DOCX) and extract
- [ ] CV photo upload
- [ ] CV templates page loads
- [ ] Set preferred template
- [ ] Export PDF

## Jobs / tracker
- [ ] Job tracker board loads
- [ ] Create / update job status
- [ ] Job-specific CV flow

## Cover letters
- [ ] Cover letter list loads
- [ ] Open cover letter by id
- [ ] Edit and save cover letter
- [ ] Delete cover letter
- [ ] Toggle favourite
- [ ] Generate new cover letter

## Billing & account
- [ ] Billing page loads (subscription + payment history)
- [ ] Account settings: update display name
- [ ] Account settings: GDPR JSON export

## Health
- [ ] `GET /api/health` returns 200 with expected checks
