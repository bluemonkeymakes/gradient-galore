import { useState, useEffect, useCallback } from "react";
import { atom, useAtom } from "jotai";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export const toastsAtom = atom<Toast[]>([]);

let toastId = 0;

export function useToast() {
  const [, setToasts] = useAtom(toastsAtom);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, [setToasts]);

  return toast;
}

export function ToastContainer() {
  const [toasts] = useAtom(toastsAtom);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-in slide-in-from-right fade-in duration-200 ${
            t.type === "success"
              ? "bg-green-900/90 text-green-200 border border-green-700/50"
              : t.type === "error"
                ? "bg-red-900/90 text-red-200 border border-red-700/50"
                : "bg-surface-3 text-text border border-border"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
