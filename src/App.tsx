import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthManager";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/Footer"; // Import the new Footer component

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toaster richColors />
        <Footer /> {/* Add the Footer component here */}
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;