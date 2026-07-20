import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteProgress from "@/components/RouteProgress";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotebookForm from "./pages/NotebookForm";
import Sections from "./pages/Sections";
import PrintView from "./pages/PrintView";
import NotebookLabel from "./pages/NotebookLabel";
import Materials from "./pages/Materials";
import MaterialForm from "./pages/MaterialForm";
import MovementHistory from "./pages/MovementHistory";
import MovementsReport from "./pages/MovementsReport";
import QuickLookup from "./pages/QuickLookup";
import GlobalSearch from "./pages/GlobalSearch";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import SectionMap from "./pages/SectionMap";
import Priorities from "./pages/Priorities";
import UserManagement from "./pages/UserManagement";
import Tickets from "./pages/Tickets";
import TicketForm from "./pages/TicketForm";
import TicketDetail from "./pages/TicketDetail";
import TicketLabel from "./pages/TicketLabel";
import TicketAdmin from "./pages/TicketAdmin";
import TicketsDashboard from "./pages/TicketsDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/consulta/:patrimonio" element={<QuickLookup />} />
        {/* Public ticket page (accessible via QR Code) */}
        <Route path="/chamado/publico/:token" element={<TicketDetail publicMode />} />
        <Route path="/chamados/:id/publico" element={<TicketDetail publicMode />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notebooks" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/itens/novo" element={<ProtectedRoute><NotebookForm /></ProtectedRoute>} />
        <Route path="/itens/:id/editar" element={<ProtectedRoute><NotebookForm /></ProtectedRoute>} />
        <Route path="/notebooks/:id/historico" element={<ProtectedRoute><MovementHistory /></ProtectedRoute>} />
        <Route path="/notebooks/:id/ficha" element={<ProtectedRoute><NotebookLabel /></ProtectedRoute>} />
        <Route path="/materiais" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
        <Route path="/materiais/novo" element={<ProtectedRoute><MaterialForm /></ProtectedRoute>} />
        <Route path="/materiais/:id/editar" element={<ProtectedRoute><MaterialForm /></ProtectedRoute>} />
        <Route path="/materiais/:id/historico" element={<ProtectedRoute><MovementHistory /></ProtectedRoute>} />
        <Route path="/movimentacoes" element={<ProtectedRoute><MovementsReport /></ProtectedRoute>} />
        <Route path="/pesquisa" element={<ProtectedRoute><GlobalSearch /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
        <Route path="/alertas" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/mapa-secoes" element={<ProtectedRoute><SectionMap /></ProtectedRoute>} />
        <Route path="/prioridades" element={<ProtectedRoute><Priorities /></ProtectedRoute>} />
        <Route path="/secoes" element={<ProtectedRoute><Sections /></ProtectedRoute>} />
        <Route path="/impressao" element={<ProtectedRoute><PrintView /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        {/* Tickets */}
        <Route path="/chamados" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/chamados/dashboard" element={<ProtectedRoute><TicketsDashboard /></ProtectedRoute>} />
        <Route path="/chamados/novo" element={<ProtectedRoute><TicketForm /></ProtectedRoute>} />
        <Route path="/chamados/config" element={<ProtectedRoute><TicketAdmin /></ProtectedRoute>} />
        <Route path="/chamados/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
        <Route path="/chamados/:id/editar" element={<ProtectedRoute><TicketForm /></ProtectedRoute>} />
        <Route path="/chamados/:id/etiqueta" element={<ProtectedRoute><TicketLabel /></ProtectedRoute>} />
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
          <RouteProgress />
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
