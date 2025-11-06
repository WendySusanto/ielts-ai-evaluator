import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import { SidebarProvider } from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import Dashboard from "./pages/Dashboard";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/MainLayout";
import Writing from "./pages/Writing";
import WritingPractice from "./pages/WritingPractice";
import FeedbackHistory from "./pages/FeedbackHistory";
import DetailedFeedback from "./pages/DetailedFeedback";
import Admin from "./pages/Admin";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { PrivateRoute } from "./components/PrivateRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ComingSoon from "./pages/ComingSoon";
import Premium from "./pages/Premium";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          <Route path="/register" element={<Register />} />
          {/* Main Application Routes */}
          <Route
            path="/*"
            element={
              <ThemeProvider>
                <Toaster />
                <SidebarProvider>
                  <AppSidebar />
                  <main className="flex-1">
                    <MainLayout>
                      <Routes>
                        <Route
                          path="/"
                          element={
                            <PrivateRoute>
                              <Dashboard />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/profile"
                          element={
                            <PrivateRoute>
                              <Profile />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/speaking"
                          element={
                            <PrivateRoute>
                              <ComingSoon
                                title="Speaking Practice"
                                feature="AI-Powered Speaking Analysis"
                                description="Our advanced AI will analyze your pronunciation, fluency, and speaking patterns to provide detailed feedback for IELTS preparation."
                                estimatedDate="Q1 2025"
                              />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/writing"
                          element={
                            <PrivateRoute>
                              <Writing />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/writing/:taskType/:taskId"
                          element={
                            <PrivateRoute>
                              <WritingPractice />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/feedback/:essayId"
                          element={
                            <PrivateRoute>
                              <DetailedFeedback />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/feedback"
                          element={
                            <PrivateRoute>
                              <FeedbackHistory />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <PrivateRoute>
                              <Admin />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/premium"
                          element={
                            <PrivateRoute>
                              <Premium />
                            </PrivateRoute>
                          }
                        />
                      </Routes>
                    </MainLayout>
                  </main>
                </SidebarProvider>
              </ThemeProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
