import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
    id: number;
    type: ToastType;
    message: string;
}

interface ToastContextData {
    showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextData>({ showToast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

// ─── Single Toast Item ───────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    error:   <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
};

const BORDER: Record<ToastType, string> = {
    success: 'border-emerald-500/30',
    error:   'border-red-500/30',
    warning: 'border-amber-500/30',
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div
            className={`flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border ${BORDER[item.type]} rounded-xl px-4 py-3 shadow-2xl min-w-[280px] max-w-sm animate-in slide-in-from-right-5 fade-in duration-300`}
        >
            {ICONS[item.type]}
            <p className="text-sm text-slate-100 flex-1 font-medium leading-snug">{item.message}</p>
            <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-300 transition-colors ml-1 shrink-0"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Provider ───────────────────────────────────────────────────────────────────
let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = ++_id;
        setToasts(prev => [...prev, { id, type, message }]);
    }, []);

    const remove = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastCard item={t} onClose={() => remove(t.id)} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
