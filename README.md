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
- **💬 Speaking Assessment**: Practice speaking topics with AI-powered evaluation (Coming Soon)
- **📊 Comprehensive Feedback**: Get scores based on official IELTS criteria:
  - Task Achievement / Response
  - Coherence and Cohesion
  - Lexical Resource
  - Grammatical Range and Accuracy
- **📈 Progress Dashboard**: Track your performance over time with detailed analytics
- **📜 Feedback History**: Review all your previous submissions and evaluations
- **🔐 Secure Authentication**: Firebase-based user authentication and management
- **👤 User Profiles**: Personalized experience with user-specific data
- **🎨 Modern UI**: Clean, responsive interface built with React and Tailwind CSS

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19.1 with TypeScript
- **Build Tool**: Vite 7.0
- **Styling**: Tailwind CSS 4.1
- **UI Components**: Radix UI (Dialog, Select, Tabs, etc.)
- **Routing**: React Router 7.6
- **State Management**: React Hook Form
- **HTTP Client**: Axios
- **Authentication**: Firebase Authentication
- **Icons**: Lucide React

### Backend
- **Framework**: .NET 8.0
- **Platform**: Azure Functions (Serverless)
- **AI Provider**: Google Gemini API
- **Database**: Azure Cosmos DB (or similar)
- **Authentication**: Firebase Admin SDK
- **Architecture**: Clean Architecture with Services, DTOs, and Middleware

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **.NET SDK 8.0** or higher
- **Azure Functions Core Tools** (for local backend development)
- **Firebase Project** (for authentication)
- **Google Gemini API Key** (for AI evaluations)

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

Create `local.settings.json` for local development:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "GEMINI_API_KEY": "your_gemini_api_key",
    "FirebaseProjectId": "your_firebase_project_id"
  }
}
```

Build and run the backend:

```bash
dotnet build
func start
```

The backend API will be available at `http://localhost:7103`

---

## 📁 Project Structure

```
ielts-ai-evaluator/
│
├── frontend/
│   └── ielts-ai-evaluator-frontend/
│       ├── src/
│       │   ├── components/      # Reusable UI components
│       │   ├── pages/          # Page components
│       │   ├── types/          # TypeScript type definitions
│       │   ├── services/       # API service layers
│       │   └── ...
│       ├── public/             # Static assets
│       ├── package.json
│       └── vite.config.ts
│
├── backend/
│   ├── IELTS.AI.Evaluator.Functions/
│   │   ├── Functions/          # Azure Functions endpoints
│   │   ├── Services/           # Business logic services
│   │   ├── DTOs/              # Data transfer objects
│   │   ├── Middleware/        # Authentication middleware
│   │   └── Extensions/        # Helper extensions
│   │
│   └── IELTS.AI.Evaluator.Data/
│       └── ...                # Data models and repositories
│
└── README.md
```

---

## 🎯 Usage

1. **Register/Login**: Create an account or sign in using Firebase authentication
2. **Select Writing Task**: Choose between Task 1 or Task 2
3. **Pick a Prompt**: Select from available writing prompts
4. **Write Your Essay**: Compose your response in the text editor
5. **Submit for Evaluation**: Get instant AI-powered feedback
6. **Review Feedback**: Analyze detailed scores and suggestions
7. **Track Progress**: Monitor your improvement over time in the dashboard

---

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Obtain your Firebase configuration from Project Settings
4. Add the configuration to your frontend `.env` file

### Gemini API Setup

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add the key to your backend `local.settings.json` file

### Azure Deployment (Optional)

For production deployment:
- Backend: Deploy to Azure Functions
- Frontend: Deploy to Azure Static Web Apps or any static hosting service

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

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Wendy Susanto** - [GitHub Profile](https://github.com/WendySusanto)

---

## 🙏 Acknowledgments

- Google Gemini API for AI-powered evaluations
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
