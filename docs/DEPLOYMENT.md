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
