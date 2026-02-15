import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import HomePage from "@/pages/HomePage";
import JoinQueuePage from "@/pages/JoinQueuePage";
import LiveCounterPage from "@/pages/LiveCounterPage";
import TokenStatusPage from "@/pages/TokenStatusPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop/:shopId/join" element={<JoinQueuePage />} />
          <Route path="/shop/:shopId/counter" element={<LiveCounterPage />} />
          <Route path="/shop/:shopId/token/:tokenId" element={<TokenStatusPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
