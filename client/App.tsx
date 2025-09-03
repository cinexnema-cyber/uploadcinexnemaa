import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import Creator from "./pages/Creator";
import Content from "./pages/Content";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import UploadFilme from "./pages/criadores/UploadFilme";

const queryClient = new QueryClient();

function Layout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400" />
            <span className="text-white font-extrabold tracking-wide text-lg">
              CINEXNEMA
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            >
              Upload
            </Link>
            <Link
              to="/creator"
              className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            >
              Criador
            </Link>
            <Link
              to="/content"
              className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            >
              Conteúdos
            </Link>
            <Link
              to="/admin"
              className="px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-white/10 bg-black/30">
        <div className="container mx-auto px-4 h-14 text-xs text-white/60 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Cinexnema</span>
          <span>Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/creator" element={<Creator />} />
            <Route path="/content" element={<Content />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/criadores/upload" element={<UploadFilme />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
