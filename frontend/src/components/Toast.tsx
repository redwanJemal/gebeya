import { useState, createContext, useContext, useCallback } from 'react';
import { X, MessageCircle, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'message';
  title: string;
  message?: string;
  duration?: number;
  onClick?: () => void;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    // Auto-dismiss
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ 
  toasts, 
  onDismiss 
}: { 
  toasts: Toast[]; 
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ 
  toast, 
  onDismiss 
}: { 
  toast: Toast; 
  onDismiss: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick();
      handleDismiss();
    }
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    message: <MessageCircle className="w-5 h-5 text-tg-button" />,
  };

  const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
    message: 'bg-tg-button/10 border-tg-button/20',
  };

  return (
    <div
      onClick={handleClick}
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
        ${bgColors[toast.type]}
        ${toast.onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        transition-transform
      `}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-tg-text">{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-tg-hint mt-0.5 truncate">{toast.message}</p>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="p-1 text-tg-hint hover:text-tg-text"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
