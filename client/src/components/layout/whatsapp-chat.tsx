import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export function WhatsAppChat() {
  const { storeSettings } = useStoreSettings();
  const { user } = useAuth();
  const [location] = useLocation();

  // Don't show if not enabled/configured or if on admin dashboard
  if (!storeSettings?.showWhatsAppChat || 
      !storeSettings?.whatsappPhoneNumber ||
      location.startsWith('/admin')) {
    return null;
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = storeSettings.whatsappPhoneNumber?.replace(/[^\d+]/g, ''); // Clean phone number
    const defaultMessage = storeSettings.whatsappDefaultMessage || "Здравствуйте! Я хотел бы узнать больше о ваших товарах.";
    const message = encodeURIComponent(defaultMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
      aria-label="Написать в WhatsApp"
      title="Написать в WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}