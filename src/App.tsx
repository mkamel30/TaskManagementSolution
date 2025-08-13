import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthManager";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer";
import { Sidebar } from "@/components/Sidebar"; // Import the new Sidebar component

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen bg-background">
          <Sidebar /> {/* Add the Sidebar component here */}
          <main className="flex-1 lg:mr-64 p-4"> {/* Adjust margin for sidebar */}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reports" element={<ReportsPage />} /> {/* Ensure ReportsPage is routed */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
        <Toaster richColors />
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;