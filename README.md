# Vend

Dispense unique credit codes at hackathons, conferences and meetups.

Admins paste an eligible email list and a pool of codes. Attendees open `/<slug>`, sign in with Clerk (Google or email code), and receive a code if that verified address is on the list. The same email always gets the same code back.

## Stack

- Next.js App Router, deployed on Vercel
- Convex for the database and claim transaction
- Clerk for sign-in
- Tailwind CSS

## Local setup

1. Copy `.env.example` to `.env.local` and fill Clerk keys.
2. Create a Clerk application with **Google** and **Email code** enabled. Turn passwords off unless you have a reason to keep them.
3. In Clerk, add the Convex integration (or a JWT template named `convex`). The template must include the `email` claim. Copy the Issuer URL.
4. Run `npx convex dev`. Create a Convex project when asked. This writes `NEXT_PUBLIC_CONVEX_URL`.
5. On the Convex dashboard, set:
   - `CLERK_JWT_ISSUER_DOMAIN` to the Clerk Issuer URL (for example `https://your-app.clerk.accounts.dev`)
   - `ADMIN_EMAILS` to a comma-separated list of admin addresses
6. `npm run dev`

Admin UI is at `/admin`. Event claim URLs are `/<slug>`.

## Production

Vercel env:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_CONVEX_URL` from the Convex production deployment

Convex production env:

- `CLERK_JWT_ISSUER_DOMAIN` for the production Clerk instance
- `ADMIN_EMAILS`

Point Clerk production at the Vercel domain. Deploy Convex with `npx convex deploy` (the Vercel Convex integration can do this on each build).

## Fraud controls

**Cross-event duplicate flagging.** When emails are uploaded (pasted, one per line or comma-separated), any address that already appears on another event's eligible list is not added directly — it goes to a "Flagged for review" section on the manage-event page, where an organiser approves or rejects each one individually. Both decisions are recorded in the audit log. Upload results report how many addresses were flagged.

**App-wide email blacklist.** Admins manage a blacklist at `/admin/blacklist`. A blacklisted address is rejected on every path that would add it to an event's eligible list after being blacklisted — uploads skip it (reported as `N rejected (blacklisted)`), and approving a flagged email for a blacklisted address fails with an error. Each rejected upload attempt is recorded and shown to event admins in a read-only "Blacklisted" card on the manage-event page. Addresses already on an event's list before being blacklisted are left untouched; un-blacklisting an address clears its recorded hits.

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
