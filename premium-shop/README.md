# Premium Dukan

## Development and checks

In `frontend`, run `npm install` then `npm start`. Development still uses the existing hosted API at `https://premiumshopee.onrender.com`. To use a local backend instead, set `apiBaseUrl` to an empty string in `src/environment/environment.development.ts`; `/api` then uses the configured localhost:3000 proxy.

- Frontend checks: `npm test`, `npm run typecheck`, `npm run build`.
- Production output: `frontend/dist/premium-shop`. Configure the static host to serve `index.html` for application routes and enable gzip/Brotli and immutable caching for hashed JS/CSS assets.
- Backend: `npm install`, set `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `JWT_SECRET`, then `npm start`. `npm test` uses mocked database operations and does not modify production data.

## Loading fixes

This copy had a serial image queue: wait 350ms, start one image, wait for its load/error event, wait another 100ms, then start the next. An image that never completed could block every subsequent image. Cards also started transparent and appeared with an increasing delay.

- Removed the serial queue, its timers/state and the delayed card reveal. The browser now schedules images independently; the first three load eagerly and the remainder use native lazy loading.
- Preserved dark/light theme behavior, 12-item pagination, search, categories and the Load More button. Visible products are calculated when data or filters change, rather than allocating a new array on every change-detection pass.
- Cloudinary originals get responsive widths and automatic compression/format selection. Broken transformations fall back to the original once and then a local placeholder, without an error loop.
- Replaced the blocking Tailwind CDN compiler with build-time CSS generation, including class-based dark mode.
- Lazy-loaded detail, login and admin pages. Removed the duplicate admin route, unused stylesheet files, stale configuration and unnecessary direct dependencies.
- Shared catalog requests and a 30-second in-memory cache reduce duplicate network work. Successful inventory mutations invalidate the cache. Detail reads remain fresh; catalog changes made in another session may take up to 30 seconds to appear on a subsequent visit.
- Bounded product reads to 90 seconds to accommodate host wake-up, with retryable errors. Public product reads avoid unnecessary authentication preflights.
- Backend reads skip Mongoose document hydration and have query time limits. Updated-time indexes support ordering; a linear grouping pass preserves available products first, sold-out products last, and most recently updated first within each group.
- Fixed `tsconfig.json`: explicit source root and import paths, bundler resolution, and removal of deprecated iteration settings. Production builds are optimized by default.

No ad-network scripts were found in this project's source. A hosting cold start can still delay the product response and therefore discovery of its image URLs. The earlier measurements of this same hosted API were 23.63 seconds on one request and 1.28 seconds on a subsequent request; these are individual observations, not a benchmark of this deployed change. Deploying the backend and creating its indexes are required for server changes to take effect.

Browser visual QA was unavailable in this session. Automated tests cover pagination/filtering, request sharing and invalidation, timeout/retry, route cancellation, image fallbacks, authentication headers and stock ordering.
