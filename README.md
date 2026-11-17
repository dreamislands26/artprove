# artprove.com

Site + client cabinet for Art Prove. **Push to `main` = deploy** to Cloudflare Worker `still-night-cfa6` (artprove.com) via Workers Builds.

- `site/` — everything that is served. Edit files here directly.
  - `index.html`, `play.html`, `brief.html`, `generate.html` — public flow (design: Maria)
  - `catalog/` — client cabinet + owner inbox; `studio/`, `engine/` — internal dashboards
  - `assets/runtime.js` — connects pages to the API (`api.artprove.com`, worker `artprove-api`)
  - `assets/match.js` — brief → AI match → unlock logic
  - `ap-data.js` — catalogue of works and artists
- `tools/` — the one-off script used on 17.11 to merge Maria's play frontend with the API build (reference only).

## Rules
- Don't upload folders by hand in the Cloudflare dashboard any more — it replaces the whole site and overwrites what's in git. Change files here and push.
- To try a design change without touching production: push to another branch — Workers Builds gives a preview URL.
- No secrets in this repo. API keys live only as Cloudflare secrets on `artprove-api`.
- Pages must keep the three script tags before `play.js`: `ap-data.js`, `assets/runtime.js`, `assets/match.js`.
