import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotebookForm from "./pages/NotebookForm";
import Sections from "./pages/Sections";
import PrintView from "./pages/PrintView";
import Materials from "./pages/Materials";
import MaterialForm from "./pages/MaterialForm";
import MovementHistory from "./pages/MovementHistory";
import MovementsReport from "./pages/MovementsReport";
import QuickLookup from "./pages/QuickLookup";
import GlobalSearch from "./pages/GlobalSearch";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import SectionMap from "./pages/SectionMap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/consulta/:patrimonio" element={<QuickLookup />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notebooks" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/itens/novo" element={<ProtectedRoute><NotebookForm /></ProtectedRoute>} />
        <Route path="/itens/:id/editar" element={<ProtectedRoute><NotebookForm /></ProtectedRoute>} />
        <Route path="/notebooks/:id/historico" element={<ProtectedRoute><MovementHistory /></ProtectedRoute>} />
        <Route path="/materiais" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
        <Route path="/materiais/novo" element={<ProtectedRoute><MaterialForm /></ProtectedRoute>} />
        <Route path="/materiais/:id/editar" element={<ProtectedRoute><MaterialForm /></ProtectedRoute>} />
        <Route path="/materiais/:id/historico" element={<ProtectedRoute><MovementHistory /></ProtectedRoute>} />
        <Route path="/movimentacoes" element={<ProtectedRoute><MovementsReport /></ProtectedRoute>} />
        <Route path="/pesquisa" element={<ProtectedRoute><GlobalSearch /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/alertas" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/mapa-secoes" element={<ProtectedRoute><SectionMap /></ProtectedRoute>} />
        <Route path="/secoes" element={<ProtectedRoute><Sections /></ProtectedRoute>} />
        <Route path="/impressao" element={<ProtectedRoute><PrintView /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
