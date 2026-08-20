# Vend

Dispense unique credit codes at hackathons, conferences and meetups.

Admins paste an eligible email list and a pool of codes. Attendees open `/<slug>`, sign in with Clerk (Google or email code), and receive a code if that verified address is on the list. The same email always gets the same code back.

## Stack

- Next.js App Router, deployed on Vercel
- Convex for the database and claim transaction
- Clerk for sign-in
- Tailwind CSS

Admin UI is `/admin`. Claim URLs are `/<slug>`.

Do not commit `.env.local`. Never put API tokens in git.

## 1. Clerk and Convex (development)

### Clerk

1. Create or claim a Clerk application (not the temporary keyless app).
2. Enable **Google** and **Email code**. Leave passwords off.
3. Add the Convex integration, or a JWT template named `convex`. The template must include the `email` claim.
4. Copy the publishable key, secret key, and Issuer URL (`https://….clerk.accounts.dev`).

### Local env

Copy `.env.example` to `.env.local` and set:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### Convex

```
npx convex login
npx convex dev
```

That creates the project and writes `NEXT_PUBLIC_CONVEX_URL`.

On the Convex dashboard, Deployment Settings → Environment Variables:

- `CLERK_JWT_ISSUER_DOMAIN` = the Clerk Issuer URL
- `ADMIN_EMAILS` = the address you will sign in with (comma-separated if more than one)

Then:

```
npm run dev
```

[`convex/auth.config.ts`](convex/auth.config.ts) reads `CLERK_JWT_ISSUER_DOMAIN`. [`convex/lib/auth.ts`](convex/lib/auth.ts) gates admin on `ADMIN_EMAILS`.

## 2. Prove the claim path

Against that live backend, on localhost, one event:

1. Sign in as an `ADMIN_EMAILS` address. Open `/admin` → New event. Slug `smoke-1`.
2. Eligible emails: that address plus a second address you control.
3. Codes: `SMOKE-A` and `SMOKE-B`.
4. Open `/smoke-1`, sign in with the eligible address, confirm you get a code.
5. Refresh: same code. Admin claimed count stays 1.
6. Sign in with an address that is not on the list: ineligible, no extra claim.

If that fails, fix it before touching Vercel.

## 3. Vercel (production)

Clerk production does **not** accept `*.vercel.app`. Use a real hostname.

### Convex production

1. Create or open the production deployment.
2. Set `CLERK_JWT_ISSUER_DOMAIN` and `ADMIN_EMAILS` on **production** (the production Clerk issuer, not `.accounts.dev`).
3. Generate a production deploy key with `deployment:deploy`.

### Clerk production

1. Production instance: Google + email code, Convex JWT template with `email`.
2. Allowed origin: the custom domain.
3. Sign-in and sign-up paths: `/sign-in`, `/sign-up`.

### Vercel

1. Import this GitHub repo.
2. Build command: `npm run build:vercel` (runs `npx convex deploy --cmd 'npm run build'`).
3. Production environment variables:

   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (prod)
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
   - `CONVEX_DEPLOY_KEY` = production deploy key, **Production** environment only

   You do not need to set `NEXT_PUBLIC_CONVEX_URL` by hand. `npx convex deploy` injects it for the Next build.

4. Attach the custom domain. Add that host in Clerk. Redeploy once DNS is live.

5. On the live host: sign in, create one event, claim once, refresh, confirm the same code.

Skip Convex preview deployments until the production claim path is boring.

## How claiming works

The attendee never types an email into Vend. `claimForCurrentUser` reads the verified email from the Clerk JWT, normalises it (trim + lowercase), and:

1. Returns the existing code if that email already claimed on this event
2. Refuses if the email is not on the list
3. Assigns the next available code if one remains
4. Returns `exhausted` if the pool is empty

Assignment is a single Convex mutation, so two people cannot take the same code.

## Tests

```
npm test
```

Uses `convex-test`. No live Clerk or Convex project is required.
