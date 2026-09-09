# Protected LIREN Guides

## Production

- Restaurant: https://liren-guides-12901877410.asia-east1.run.app/restaurant.html
- Baby guide: https://liren-guides-12901877410.asia-east1.run.app/index.html
- Google Cloud project: `project-c1ed3bc0-3493-464a-81f`
- Cloud Run service: `liren-guides`, region `asia-east1`
- Runtime service account: `liren-guide-runtime@project-c1ed3bc0-3493-464a-81f.iam.gserviceaccount.com`
- Secret Manager secret: `liren-guide-auth` (scrypt salt/hash and session signing secret, never plaintext password).

The Cloud Run endpoint permits network access; `protected/server.mjs` authenticates all guide pages, data, map config and assets before serving them. `/login` and `/healthz` are public. Authentication uses a signed, seven-day, Secure/HttpOnly/SameSite cookie. Logout removes the browser cookie. Rotating the signing secret invalidates existing sessions. Failed login attempts are rate limited in memory; this is not distributed abuse protection.

GitHub Pages serves only a three-file redirect artifact from the dedicated `pages-redirect` branch. The repository itself remains public; source data and the browser key are not confidential. Never commit secrets. Do not switch Pages back to publishing from `main`.

## Usage Controls

- Browser key `liren-restaurant-map-web`: restricted to Maps JavaScript API and the two Cloud Run service origins (numeric and hashed aliases).
- Maps JavaScript 2D billable map loads: project-wide daily quota **100**. The effective quota was verified on 2026-09-09. Places API quotas are unchanged.
- The browser loads Maps only after the visitor opens the map.
- Cloud Run min instances 0, service max 1 and revision max 1; request-based CPU billing. These are cost controls, not a currency spending cap.
- A password and referrer restrictions reduce casual misuse but are not a guarantee of zero charges or resistance to a determined attacker. Google Cloud budgets are alerts, not automatic spending limits.

## Deploy Updates

```sh
node scripts/test-auth.mjs
node scripts/test-restaurant-ui.cjs
node scripts/test-audit.mjs
gcloud run deploy liren-guides --source . --region asia-east1 --service-account liren-guide-runtime@project-c1ed3bc0-3493-464a-81f.iam.gserviceaccount.com --set-secrets AUTH_CONFIG=liren-guide-auth:1 --allow-unauthenticated --min 0 --max 1 --max-instances 1 --cpu 1 --memory 256Mi --concurrency 40 --timeout 30 --quiet
```

`git push origin main` updates source only, not the deployed guides. Use the deploy command to publish guide changes. To update the old-link redirect, run `node scripts/publish-pages-redirect.mjs`; it creates a three-file commit on the separate Pages branch without changing the working tree. The upload/container manifests include only public site assets and the server, excluding local credentials, logs, audit reports, dependencies and git history.

`scripts/test-restaurant-map.cjs` serves a local checkout under the allowed origin for live Google Maps tests; it does not test authentication. Validate production login separately. Each live map test uses API quota.
