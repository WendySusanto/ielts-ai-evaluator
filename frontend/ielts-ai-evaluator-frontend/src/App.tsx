import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import "./App.css";
import { AppSidebar } from "./components/AppSidebar";
import MainLayout from "./components/MainLayout";
import { PrivateRoute } from "./components/PrivateRoute";
import { SidebarProvider } from "./components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import DetailedFeedback from "./pages/DetailedFeedback";
import FeedbackHistory from "./pages/FeedbackHistory";
import Login from "./pages/Login";
import Premium from "./pages/Premium";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import Speaking from "./pages/Speaking";
import SpeakingFeedback from "./pages/SpeakingFeedback";
import SpeakingPractice from "./pages/SpeakingPractice";
import Writing from "./pages/Writing";
import WritingPractice from "./pages/WritingPractice";

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
                              <Speaking />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/speaking/:part/:taskId"
                          element={
                            <PrivateRoute>
                              <SpeakingPractice />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/speaking-feedback/:speakingId"
                          element={
                            <PrivateRoute>
                              <SpeakingFeedback />
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
                            <PrivateRoute requireAdmin>
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
