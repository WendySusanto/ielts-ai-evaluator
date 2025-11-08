# IELTS AI Evaluator - Frontend

This is the frontend application for the IELTS AI Evaluator platform, built with React, TypeScript, and Vite.

## 🛠️ Tech Stack

- **React 19.1** with TypeScript
- **Vite 7.0** for fast development and optimized builds
- **Tailwind CSS 4.1** for styling
- **Radix UI** for accessible component primitives
- **React Router 7.6** for navigation
- **Firebase** for authentication
- **Axios** for API communication

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Environment Setup

Copy the sample environment file and configure it:

```bash
cp .env.sample .env
```

Fill in your Firebase and API configuration in `.env`:

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

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building

Create an optimized production build:

```bash
npm run build
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (buttons, cards, etc.)
│   └── ...
├── pages/             # Page components (routes)
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Writing.tsx
│   └── ...
├── types/             # TypeScript type definitions
├── services/          # API service layers
├── lib/              # Utility functions and helpers
└── App.tsx           # Main application component
```

## 🔧 Configuration Files

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration

## 📝 Notes

- This project uses **Vite** for blazing fast HMR and optimized builds
- **React 19.1** with the latest features and improvements
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** with custom configuration for rapid UI development

For more information about the overall project, see the [main README](../../README.md).
