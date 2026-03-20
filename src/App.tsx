// App entry point
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { setNavDirection } from "@/lib/navigationDirection";
import Index from "./pages/Index";

// Lazy load all non-critical routes
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Checkin = lazy(() => import("./pages/Checkin"));
const Reserva = lazy(() => import("./pages/Reserva"));
const ClientAuth = lazy(() => import("./pages/ClientAuth"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ReservaSuccess = lazy(() => import("./pages/ReservaSuccess"));
const ReservaFailed = lazy(() => import("./pages/ReservaFailed"));
const ReservaPending = lazy(() => import("./pages/ReservaPending"));
const PagamentoSucesso = lazy(() => import("./pages/PagamentoSucesso"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TicketView = lazy(() => import("./pages/TicketView"));
const CheckinScanner = lazy(() => import("./pages/CheckinScanner"));
const CheckinValidation = lazy(() => import("./pages/CheckinValidation"));
const Embarques = lazy(() => import("./pages/Embarques"));
const ChapadaDiamantina = lazy(() => import("./pages/ChapadaDiamantina"));
const ExportTours = lazy(() => import("./pages/ExportTours"));
const Passeio = lazy(() => import("./pages/Passeio"));
const Guia = lazy(() => import("./pages/Guia"));
const Sobre = lazy(() => import("./pages/Sobre"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Politicas = lazy(() => import("./pages/Politicas"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function AppRoutes() {
  const location = useLocation();

  // Detect browser back/forward button and set direction accordingly
  useEffect(() => {
    const handlePopState = () => setNavDirection('back');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh' }}>
      <AnimatePresence initial={false} mode="sync">
        <Suspense key={location.pathname} fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/checkin" element={<Checkin />} />
            <Route path="/reserva/:tourId" element={<Reserva />} />
            <Route path="/reserva/sucesso" element={<ReservaSuccess />} />
            <Route path="/reserva/falha" element={<ReservaFailed />} />
            <Route path="/reserva/pendente" element={<ReservaPending />} />
            <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
            <Route path="/pagamento/sucesso/*" element={<PagamentoSucesso />} />
            <Route path="/cliente" element={<ClientAuth />} />
            <Route path="/minha-conta" element={<ClientPortal />} />
            <Route path="/ticket/:qrToken" element={<TicketView />} />
            <Route path="/checkin/:qrToken" element={<CheckinValidation />} />
            <Route path="/checkin-scanner" element={<CheckinScanner />} />
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/chapada-diamantina" element={<ChapadaDiamantina />} />
            <Route path="/export-tours" element={<ExportTours />} />
            <Route path="/passeio/:tourId" element={<Passeio />} />
            <Route path="/guia" element={<Guia />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/politicas" element={<Politicas />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsProvider>
          <AppRoutes />
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
