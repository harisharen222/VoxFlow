import { Routes, Route } from "react-router-dom";
import { SessionProvider } from "./context/SessionContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import AskPage from "./pages/AskPage.jsx";
import IngestPage from "./pages/IngestPage.jsx";
import ConnectorsPage from "./pages/ConnectorsPage.jsx";
import MemoryPage from "./pages/MemoryPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <div className="flex h-full w-full bg-bg text-txt overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden flex flex-col pb-16 md:pb-0">
            <Routes>
              <Route path="/"           element={<AskPage />} />
              <Route path="/search"     element={<SearchPage />} />
              <Route path="/ingest"     element={<IngestPage />} />
              <Route path="/connectors" element={<ConnectorsPage />} />
              <Route path="/memory"     element={<MemoryPage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </SessionProvider>
    </ToastProvider>
  );
}
