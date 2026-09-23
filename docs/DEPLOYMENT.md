# Deployment Checklist — When IELTS?

Prep reference for the first production deployment. Nothing here provisions anything.

## Backend — Azure Functions App Settings

| Setting | Purpose | Notes |
|---|---|---|
| `DbConnectionString` | PostgreSQL database | production connection string |
| `GeminiApiKey` | Gemini evaluation calls | secret — App Settings only |
| `GeminiApiEndpoint` | Model used for scoring (Writing + Speaking) | full `generateContent` URL; the model name lives in it. Also the fallback for the examiner. Receives `GeminiApiKey`, so only point it at Google |
| `GeminiExaminerApiEndpoint` | Model used for live examiner turns | optional — blank or unset falls back to `GeminiApiEndpoint`. Point it at a cheaper, lower-latency model |
| `GeminiExaminerThinkingBudget` | Thinking budget for examiner turns | optional. For `gemini-3.5-flash-lite` use `128` — it rejects `0` with a 400. Leave unset and `thinkingConfig` is omitted, which every model accepts; unset with no custom endpoint means `0` |
| `FIREBASE_PROJECT_ID` | Firebase Admin token verification | |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin credentials | secret — App Settings only |
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

## Database migrations — and what running them from CI costs

`azure-functions.yml` runs `dotnet ef database update` on the GitHub-hosted
runner, after `dotnet test` and after the publish, but **before** the deploy —
so a failed migration blocks the release instead of shipping code against an
older schema. It is a no-op when the database is already current.

The price of doing it there: the runner has to reach Postgres, and
GitHub-hosted runners come from a large, rotating public IP range. There is no
useful IP allowlist for them, so in practice this means the Postgres server
accepts public connections (TLS + credentials as the only gate) rather than
sitting behind a private endpoint. That is the widest part of this deployment's
attack surface, and it exists to save a self-hosted runner.

Keep it only while the database holds throwaway data. Non-negotiable while it
stays this way:

- `sslmode=require` (or stricter) in `DbConnectionString` — a public server
  reached over plaintext is a different problem entirely.
- A dedicated migration login with DDL rights on this database only, not the
  server admin account, and not the login the Function App runs as.
- `az postgres flexible-server firewall-rule list` reviewed after any change;
  `0.0.0.0–255.255.255.255` is not an allowlist.

When the data starts mattering, pick one — in rough order of effort:

| Option | What changes | Trade-off |
|---|---|---|
| Self-hosted runner (or an Azure Container Apps job) inside the VNet | Migration step moves to a runner with a private route to Postgres; public access can be switched off | One more thing to patch and keep alive |
| Migrate on worker startup, guarded by `pg_advisory_lock` | No external network path needed at all; the lock serialises concurrent cold starts | Failures surface as cold-start errors rather than a red pipeline, and every instance pays the check |
| Apply migrations by hand from a jump box | Nothing automated to secure | Someone has to remember; the pipeline stops being the source of truth |

**Rollback is not automated, deliberately.** CI only ever rolls *forward*:
`dotnet ef database update` with no target. Undoing a bad migration means
deploying the previous code and then applying a *new* migration that reverses
it — `database update <PreviousMigration>` is a manual, destructive step and
should be treated as one. Keep migrations additive (add a nullable column,
backfill, then tighten) so that code one version behind the schema still runs;
that property is what makes the migrate-then-deploy order safe.

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
func start                       # :7103
# frontend (from frontend/ielts-ai-evaluator-frontend/)
npm run dev                      # :5173
```

## Post-deploy smoke test

1. Register/login → dashboard loads (band trend renders with data).
2. Submit a writing task → feedback page.
3. Run a speaking session (mic if Azure Speech configured, typed fallback otherwise) → feedback with pronunciation card.
4. Admin account → all three admin tabs load; prompt CRUD works.
5. Unauthenticated API call returns 401; 11th free-tier evaluation of the day returns 429.
