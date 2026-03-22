import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {} };
  return ctx;
}

const TYPE_STYLES = {
  success: "bg-[#1e293b] border-green-500/50 text-green-400",
  error:   "bg-[#1e293b] border-red-500/50   text-red-400",
  info:    "bg-[#1e293b] border-blue-500/50  text-blue-400",
  warning: "bg-[#1e293b] border-yellow-500/50 text-yellow-400",
};

const TYPE_DOT = {
  success: "bg-green-400",
  error:   "bg-red-400",
  info:    "bg-blue-400",
  warning: "bg-yellow-400",
};

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border shadow-2xl text-sm font-medium pointer-events-auto cursor-pointer select-none ${TYPE_STYLES[t.type] || TYPE_STYLES.info}`}
          style={{ animation: "toast-enter 0.22s cubic-bezier(0.16,1,0.3,1) both" }}
          onClick={() => onRemove(t.id)}
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TYPE_DOT[t.type] || TYPE_DOT.info}`} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
