import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'marketing' | 'order-status' | 'cart-reminder';
}

export default function NotificationModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'marketing' 
}: NotificationModalProps) {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'marketing':
        return '🎉';
      case 'order-status':
        return '📦';
      case 'cart-reminder':
        return '🛒';
      default:
        return '🔔';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-sm mx-4 w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getTypeIcon(type)}</span>
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}