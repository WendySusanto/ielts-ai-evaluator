# 🎯 IELTS AI Evaluator

> An intelligent AI-powered platform for IELTS writing and speaking evaluation, providing instant feedback to help test-takers improve their English proficiency.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![.NET](https://img.shields.io/badge/.NET-8.0-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)](https://www.typescriptlang.org/)

---

## 📖 About

**IELTS AI Evaluator** is a comprehensive web application designed to assist IELTS test-takers in improving their writing and speaking skills through AI-powered evaluations. Leveraging Google's Gemini API, the platform provides detailed, criterion-based feedback on essays and speaking responses, helping users understand their strengths and areas for improvement.

### ✨ Key Features

- **📝 Writing Evaluation**: Submit your IELTS Task 1 and Task 2 essays for instant, detailed feedback
  - Task Achievement / Response
  - Coherence and Cohesion
  - Lexical Resource
  - Grammatical Range and Accuracy
- **💬 Speaking Assessment**: Hold a spoken Part 1 / Part 2 / Part 3 conversation with an AI examiner that asks follow-up questions in real time, then get scored on:
  - Fluency and Coherence
  - Lexical Resource
  - Grammatical Range and Accuracy
  - Pronunciation — measured by Azure Speech pronunciation assessment, not guessed by the LLM
- **🎙️ Speech In and Out**: Azure Speech handles speech-to-text and the examiner's voice; typed input is a full fallback when Speech isn't configured
- **📈 Progress Dashboard**: Track your band trend and recent activity over time
- **📜 Feedback History**: Review all your previous submissions and evaluations
- **🎫 Plans and Quotas**: Free accounts get a configurable daily evaluation quota; Premium and Admin are unlimited
- **🛠️ Admin Panel**: Manage writing and speaking prompts, browse users, and inspect recent evaluations
- **🔐 Secure Authentication**: Firebase authentication, with roles resolved server-side from the database
- **👤 User Profiles**: Target band score, target test date, and per-user history
- **🎨 Modern UI**: Clean, responsive interface built with React and Tailwind CSS, with light and dark themes

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.0
- **Styling**: Tailwind CSS 4.1
- **UI Components**: Radix UI (Dialog, Select, Tabs, etc.) via shadcn/ui
- **Routing**: React Router 7.6
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Speech**: `microsoft-cognitiveservices-speech-sdk` (STT, TTS, pronunciation assessment)
- **Authentication**: Firebase Authentication
- **Notifications**: Sonner
- **Icons**: Lucide React

### Backend
- **Framework**: .NET 8.0
- **Platform**: Azure Functions (isolated worker, ASP.NET Core integration)
- **AI Provider**: Google Gemini API (structured JSON output via response schemas)
- **Speech**: Azure Cognitive Services Speech
- **Database**: PostgreSQL with Entity Framework Core 9 (Npgsql)
- **Authentication**: Firebase Admin SDK
- **Testing**: xUnit
- **Architecture**: Thin functions over injectable services, with DTOs, domain exceptions, and middleware

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **.NET SDK 8.0** or higher
- **Azure Functions Core Tools** (for local backend development)
- **PostgreSQL** (local instance or hosted)
- **Firebase Project** (for authentication)
- **Google Gemini API Key** (for AI evaluations)
- **Azure Speech resource** *(optional — without it the app falls back to typed speaking practice)*

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/WendySusanto/ielts-ai-evaluator.git
cd ielts-ai-evaluator
```

### 2️⃣ Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend/ielts-ai-evaluator-frontend
```

Install dependencies:

```bash
npm install
```

Create environment configuration:

```bash
cp .env.sample .env
```

Edit `.env` and add your configuration:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_APP_MEASUREMENT_ID=your_measurement_id
VITE_API_BASE_URL=http://localhost:7103
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3️⃣ Backend Setup

Navigate to the backend directory:

```bash
cd backend/IELTS.AI.Evaluator.Functions
```

Restore dependencies:

```bash
dotnet restore
```

Create `local.settings.json` for local development (it is git-ignored — never commit it):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",

    "DbConnectionString": "Host=localhost;Port=5432;Database=IELTSEvaluator;Username=postgres;Password=your_password",

    "GeminiApiKey": "your_gemini_api_key",
    "GeminiApiEndpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

    "FIREBASE_PROJECT_ID": "your_firebase_project_id",
    "FIREBASE_SERVICE_ACCOUNT_JSON": "{\"type\":\"service_account\", ...}",

    "AzureSpeechKey": "your_azure_speech_key",
    "AzureSpeechRegion": "southeastasia",
    "ExaminerVoice": "en-GB-RyanNeural",

    "DailyWritingQuota": "10",
    "DailySpeakingQuota": "10"
  },
  "Host": {
    "CORS": "http://localhost:5173",
    "CORSCredentials": true
  }
}
```

Apply the database schema:

```bash
cd ../..
dotnet ef database update --project backend/IELTS.AI.Evaluator.Data
```

Build and run the backend:

```bash
cd backend/IELTS.AI.Evaluator.Functions
dotnet build
func start
```

The backend API will be available at `http://localhost:7103`

### 4️⃣ First Run

The database ships with **no seed prompts**, so a fresh install has nothing to practise on. To get going:

1. Register through the app — this creates your user row with the `Free` plan.
2. Promote yourself to admin (there is deliberately no endpoint for this):
   ```sql
   UPDATE users SET plan = 'Admin' WHERE email = 'you@example.com';
   ```
3. Sign out and back in, then open **Admin** in the sidebar and add writing and speaking prompts.

---

## 📁 Project Structure

```
ielts-ai-evaluator/
│
├── frontend/
│   └── ielts-ai-evaluator-frontend/
│       ├── src/
│       │   ├── components/       # UI components (ui/, admin/, dashboard/, feedback/, skeleton/)
│       │   ├── pages/            # Route-level pages
│       │   ├── contexts/         # Auth and theme providers
│       │   ├── hooks/            # useApi, useSpeech, useSpeechRecognition, ...
│       │   ├── lib/              # api client, axios instance, firebase, helpers
│       │   └── types/            # TypeScript type definitions
│       ├── public/
│       │   └── staticwebapp.config.json   # SPA fallback + security headers
│       ├── package.json
│       └── vite.config.ts
│
├── backend/
│   ├── IELTS.AI.Evaluator.Functions/
│   │   ├── Functions/          # HTTP endpoints (thin: deserialize → service → return)
│   │   ├── Services/           # Business logic
│   │   ├── DTOs/               # Feedback contracts + Gemini response schemas
│   │   ├── Middleware/         # Exception handling, Firebase auth, rate limiting
│   │   ├── Exceptions/         # Domain exceptions mapped to HTTP status codes
│   │   └── Extensions/         # FunctionContext helpers (GetUserId, IsAdmin, ...)
│   │
│   ├── IELTS.AI.Evaluator.Data/
│   │   ├── Models/             # EF Core entities and DbContext
│   │   └── Migrations/         # EF Core migrations
│   │
│   └── IELTS.AI.Evaluator.Tests/   # xUnit test suite
│
├── .github/workflows/          # Azure Functions + Static Web Apps deployment
├── docs/DEPLOYMENT.md          # Production settings, CORS, roles, rate limits
├── PRODUCT.md
└── README.md
```

---

## 🎯 Usage

**Writing**

1. **Register/Login**: Create an account or sign in using Firebase authentication
2. **Select Writing Task**: Choose between Task 1 or Task 2
3. **Pick a Prompt**: Select from available writing prompts
4. **Write Your Essay**: Compose your response in the text editor
5. **Submit for Evaluation**: Get instant AI-powered feedback
6. **Review Feedback**: Analyze detailed scores and suggestions

**Speaking**

1. **Pick a Part and Topic**: Part 1, Part 2 (cue card), or Part 3
2. **Talk to the Examiner**: Answer aloud; the AI examiner asks follow-ups as the conversation goes
3. **Finish the Session**: Get band scores per criterion, plus word-level pronunciation detail
4. **Track Progress**: Monitor your improvement over time in the dashboard

---

## 🧪 Tests

xUnit, in `backend/IELTS.AI.Evaluator.Tests`.

```sh
cd backend
dotnet test IELTS.AI.Evaluator.sln                                  # everything
dotnet test IELTS.AI.Evaluator.sln --filter "FullyQualifiedName~RateLimit"
```

They also gate deployment — the workflow runs `dotnet test` before publishing.

These are unit tests, and nothing starts the Functions host: no `func start`, no
Azurite, no HTTP. That works because the `[Function]` classes are thin
(deserialize → call service → return) and the logic lives in `Services/`, which
are plain DI classes a test can construct directly. Middleware is the exception
— it takes host-owned types — so the part worth testing is pulled out into an
`internal static` method (`ExceptionHandlingMiddleware.Map`,
`RateLimitMiddleware.TryConsume`, `FirebaseAuthenticationMiddleware.ResolveAccountStateAsync`)
and tested there.

Doubles are hand-written, not mocked: `FakeStructuredClient` stands in for
Gemini, a `CapturingHandler : HttpMessageHandler` for outbound HTTP, and EF
Core's in-memory provider for the database (a fresh one per test). Don't add a
mocking library for this.

Two things the suite can't catch, because they only exist at runtime: broken
HTTP routes, and middleware registered in the wrong order in `Program.cs`. The
in-memory provider is also not relational — it won't reject a constraint
violation that Postgres would.

---

## 🔒 Security Notes

- **Authentication is fail-closed.** `FirebaseAuthenticationMiddleware` runs before every
  function, so a new endpoint is protected by default rather than by remembering to add a check.
- **Roles come from the database, not the token.** Firebase custom claims are cached in the ID
  token for up to an hour, so the backend re-reads `users.plan` (memoised 60s per user) instead
  of trusting the claim. A demotion takes effect within a minute, with no sign-out required.
- **Rate limiting** is per-user and in-process: 60/h for the examiner-turn endpoint, 30/h for
  Azure Speech tokens, 300/h for everything else. This bounds the paid Gemini and Speech calls
  the daily evaluation quotas don't reach.
- **Security headers** (CSP, HSTS, `nosniff`, `frame-ancestors`) are set in
  `public/staticwebapp.config.json`.
- **CSRF protection is not used, deliberately.** Auth is a bearer token in the `Authorization`
  header with no cookies, and browsers do not attach that header cross-site.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production checklist, including locking
down the Function App's CORS origins.

---

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Obtain your Firebase web configuration from Project Settings → add it to the frontend `.env`
4. Generate a service account key (Project Settings → Service Accounts) → add the JSON to the backend as `FIREBASE_SERVICE_ACCOUNT_JSON`

### Gemini API Setup

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add `GeminiApiKey` and `GeminiApiEndpoint` to your backend `local.settings.json`

### Azure Speech Setup (Optional)

1. Create a Speech resource in the Azure portal
2. Add `AzureSpeechKey` and `AzureSpeechRegion` to the backend
3. Optionally set `ExaminerVoice` (defaults to `en-GB-RyanNeural`)

Without these, speaking practice still works — the app falls back to typed input and omits the
pronunciation criterion.

### Database

PostgreSQL. Set `DbConnectionString` on the backend and apply migrations with
`dotnet ef database update --project backend/IELTS.AI.Evaluator.Data`. Schema changes go through
EF Core migrations; the deploy workflow runs `database update` before publishing.

### Azure Deployment

Both halves deploy from GitHub Actions on push to `main`:
- Backend → Azure Functions (`.github/workflows/azure-functions.yml`)
- Frontend → Azure Static Web Apps (`.github/workflows/azure-staticwebapp.yml`)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the required app settings and secrets.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👥 Authors

- **Wendy Susanto** - [GitHub Profile](https://github.com/WendySusanto)

---

## 🙏 Acknowledgments

- Google Gemini API for AI-powered evaluations
- Azure Cognitive Services Speech for speech recognition and pronunciation assessment
- Firebase for authentication services
- The React and .NET communities for excellent tools and documentation
- All IELTS test-takers who inspired this project

---

## 📧 Contact & Support

For questions, suggestions, or issues:
- Open an issue on [GitHub Issues](https://github.com/WendySusanto/ielts-ai-evaluator/issues)
- Contact the maintainer via GitHub

---

## 🌟 Show Your Support

If you find this project helpful, please consider giving it a ⭐️ on GitHub!

---

<div align="center">
  Made with ❤️ for IELTS test-takers worldwide
</div>
