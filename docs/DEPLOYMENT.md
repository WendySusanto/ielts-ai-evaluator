# Deployment Checklist — When IELTS?

Prep reference for the first production deployment. Nothing here provisions anything.

## ⚠️ Before anything else: rotate exposed keys

The Gemini API key and Firebase service-account private key were committed to
history at one point and must be treated as compromised. Rotate both in their
consoles and use only the new values below. Never put real values in tracked files.

## Backend — Azure Functions App Settings

| Setting | Purpose | Notes |
|---|---|---|
| `DbConnectionString` | SQL database | production connection string |
| `GeminiApiKey` | Gemini evaluation calls | **rotated** key |
| `FIREBASE_PROJECT_ID` | Firebase Admin token verification | |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin credentials | **rotated** service-account JSON |
| `AzureSpeechKey` | Azure Speech (TTS/STT/pronunciation) | F0 tier works; app degrades to typed mode without it |
| `AzureSpeechRegion` | Azure Speech region | e.g. `southeastasia` |

**CORS:** enforced by the Functions host, not the worker. Locally it's
`Host.CORS` in `local.settings.json`; in production set the allowed origin to
the deployed frontend URL in the Function App's portal CORS settings
(with credentials enabled). An in-worker `AddCors` policy is never applied.

Never leave the production origin list as `*`. Verify and lock it:

```sh
az functionapp cors show -g <resource-group> -n <function-app-name>
# if it lists "*", replace it with the SWA origin only
az functionapp cors remove -g <resource-group> -n <function-app-name> --allowed-origins '*'
az functionapp cors add    -g <resource-group> -n <function-app-name> \
  --allowed-origins https://<your-swa>.azurestaticapps.net
```

A stolen ID token is still the prerequisite for calling the API, so this is
defence in depth rather than the primary control — but `*` also means any site
can probe your endpoints and read the responses, so keep it closed.

**Roles/plans** are authoritative in the `users.plan` column, not in the Firebase
custom claim. The claim exists so the frontend can hide admin-only nav, but the
backend re-reads the plan on every request (cached 60s per user in
`FirebaseAuthenticationMiddleware`). So changing a plan with plain SQL is enough
— it takes effect within a minute, with no token refresh or sign-out needed:

```sql
UPDATE users SET plan = 'Free' WHERE email = '...';   -- or 'Premium' / 'Admin'
```

**Rate limiting** is in-process (`RateLimitMiddleware`), keyed on the Firebase
uid: 60/h for `speaking/examiner-turn`, 30/h for `speech/token`, 300/h for
everything else. Windows are per-instance, so scaling out to N instances
loosens the effective cap N-fold — if the Function App runs on a plan that
scales aggressively, either pin `functionAppScaleLimit` or move the counters
to Redis.

## Frontend — Vite build-time env (`.env.production`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | deployed Functions base URL |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Firebase web app config |

Firebase web config values are public identifiers, not secrets — but the API
key above (`GeminiApiKey`) and the service-account JSON are secrets and belong
only in App Settings.

## Build & verify

```bash
# backend (from backend/)
dotnet test                      # expect all green
# frontend (from frontend/ielts-ai-evaluator-frontend/)
npm run build                    # tsc -b + vite build, expect clean
```

## Run locally

```bash
# backend (from backend/IELTS.AI.Evaluator.Functions/)
func start                       # :7071
# frontend (from frontend/ielts-ai-evaluator-frontend/)
npm run dev                      # :5173
```

## Post-deploy smoke test

1. Register/login → dashboard loads (band trend renders with data).
2. Submit a writing task → feedback page.
3. Run a speaking session (mic if Azure Speech configured, typed fallback otherwise) → feedback with pronunciation card.
4. Admin account → all three admin tabs load; prompt CRUD works.
5. Unauthenticated API call returns 401; 11th free-tier evaluation of the day returns 429.
