import { createContext, useCallback, useContext, useState } from "react";
import Toast from "../components/Toast.jsx";

const ToastContext = createContext(null);
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((message, type = "info") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, type }]);
  }, []);

  const value = {
    success: (m) => show(m, "success"),
    error:   (m) => show(m, "error"),
    info:    (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom right */}
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
