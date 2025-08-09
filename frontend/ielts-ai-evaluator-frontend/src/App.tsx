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
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/profile-setup" element={<div>Profile</div>} />

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
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/speaking" element={<div>Speaking</div>} />
                      <Route path="/writing" element={<Writing />} />
                      <Route
                        path="/writing/:taskType/:taskId"
                        element={<WritingPractice />}
                      />
                      <Route
                        path="/feedback/:essayId"
                        element={<DetailedFeedback />}
                      />
                      <Route path="/feedback" element={<FeedbackHistory />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/premium" element={<div>premium</div>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </MainLayout>
                </main>
              </SidebarProvider>
            </ThemeProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
