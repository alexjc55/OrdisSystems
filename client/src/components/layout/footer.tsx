import ordisLogo from "@assets/logo-white_1750456267684.png";
import { useCommonTranslation } from "@/hooks/use-language";

export function Footer() {
  const { t } = useCommonTranslation();
  
  const handleClick = () => {
    window.open("https://ordis.co.il", "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="w-screen bg-[#333333] py-4" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }} dir="ltr">
      <div className="max-w-[1023px] mx-auto px-4 flex items-center justify-center gap-3">
        <img 
          src={ordisLogo} 
          alt="Ordis" 
          className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleClick}
        />
        <span className="text-white text-sm font-medium">
          {t('footer.poweredBy')} 
          <span 
            className="cursor-pointer hover:underline ml-1 text-orange-500"
            onClick={handleClick}
          >
            {t('footer.tryBusiness')}
          </span>
        </span>
      </div>
    </footer>
  );
}