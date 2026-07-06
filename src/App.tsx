import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthManager";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { Sidebar } from "./components/Sidebar";
import ReportsPage from "./pages/Reports";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-background" dir="rtl">
                  <Sidebar />
                  <main className="flex-1 p-4">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster richColors />
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;