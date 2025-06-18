import { MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export function WhatsAppChat() {
  const { storeSettings } = useStoreSettings();

  if (!storeSettings?.showWhatsAppChat || !storeSettings?.whatsappPhoneNumber) {
    return null;
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = storeSettings.whatsappPhoneNumber?.replace(/[^\d+]/g, ''); // Clean phone number
    const message = encodeURIComponent("Здравствуйте! Я хотел бы узнать больше о ваших товарах.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 animate-pulse"
      aria-label="Написать в WhatsApp"
      title="Написать в WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}