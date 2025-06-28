import { useEffect } from "react";
import { X } from "lucide-react";

export default function NotificationToast({ message, onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-1/2 md:right-auto md:transform md:-translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in flex items-center justify-between">
      <span className="text-sm md:text-base">{message}</span>
      <button 
        onClick={onClose}
        className="ml-3 p-1 hover:bg-blue-700 rounded transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
} 