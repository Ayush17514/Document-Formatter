# Pull Request: feat: add Tailwind build pipeline & small auth/fallback fixes

This PR adds a build-time Tailwind CSS pipeline and a few small, non-intrusive fixes to make the frontend resilient and restore the expected UX when CDNs are unavailable.

## Summary of changes
- Add Tailwind build infrastructure
  - tailwind.config.cjs
  - postcss.config.cjs
  - src/styles/tailwind.css (Tailwind input)
  - package.json scripts: `build:css`, `dev:css`, and updated `build` to run `build:css`.

- Update HTML entry points (app/static/index.html and static/index.html)
  - Load `/static/tailwind.css` (compiled by the build step) before `/static/style.css`.
  - Add `<link rel="icon" href="/static/favicon.svg">` to remove favicon 404.
  - Keep Quill CDN links (we can vendor them later if desired).

- Add small runtime compatibility helpers
  - app/static/compat-auth.js — wraps injected auth markup in a `<form>` to eliminate the "password field is not contained in a form" console warning.
  - app/static/favicon.svg — simple favicon file.

## Testing instructions
1. Install dependencies: `npm install`
2. Build Tailwind CSS: `npm run build:css` (writes `app/static/tailwind.css`)
3. Start the app: `npm run dev` (or `npm run build` then `npm start`)
4. Verify in the browser:
   - `/static/tailwind.css` is served and applied
   - Header/nav behave correctly for desktop and mobile (responsive utilities work)
   - Console warning about password-in-form is gone
   - Favicon loads without 404
   - Quill editor loads (from CDN)

## Deployment notes
- Ensure your host runs `npm run build` before starting the server so the compiled Tailwind CSS file is present.

## Rollback
- Revert the merge or close the PR — no changes are made to the backend other than adding build tooling and static assets.

---

Merge this PR into `main` when you're ready. The built CSS is intentionally not committed — the build step should generate it in CI during deployment.
