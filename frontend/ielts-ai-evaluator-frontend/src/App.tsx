import { BrowserRouter, Route, Routes } from "react-router";
import { AppSidebar } from "./components/AppSidebar";
import MainLayout from "./components/MainLayout";
import { PrivateRoute } from "./components/PrivateRoute";
import { SidebarProvider } from "./components/ui/sidebar";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import DetailedFeedback from "./pages/DetailedFeedback";
import FeedbackHistory from "./pages/FeedbackHistory";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
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
      {/* Theme wraps every route so /login and /register honour it too. */}
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Main Application Routes */}
            <Route
              path="/*"
              element={
                <SidebarProvider>
                  <AppSidebar />
                  <main className="flex-1 min-w-0">
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
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  </main>
                </SidebarProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
