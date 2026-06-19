import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={16} className="text-emerald-400" />,
  error:   <AlertCircle size={16} className="text-red-400" />,
  info:    <Info size={16} className="text-blue-400" />,
};

export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="flex items-center gap-3 bg-[#1E222B] border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-64 animate-slide-up">
      {icons[type]}
      <span className="text-sm text-white/80 font-body flex-1">{message}</span>
      <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// Toast Container
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
