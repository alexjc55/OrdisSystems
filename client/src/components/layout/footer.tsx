import ordisLogo from "@assets/logo-white_1750456267684.png";
import { useCommonTranslation } from "@/hooks/use-language";

export function Footer() {
  const { t } = useCommonTranslation();
  
  const handleClick = () => {
    window.open("https://ordis.co.il", "_blank", "noopener,noreferrer");
  };

  return (
    <footer 
      className="bg-[#333333] py-4 w-full" 
      dir="ltr"
    >
      <div className="max-w-[1023px] mx-auto px-4 flex flex-row items-center justify-center gap-2 sm:gap-3">
        <img 
          src={ordisLogo} 
          alt="Ordis" 
          className="h-5 sm:h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          onClick={handleClick}
        />
        <span className="text-white text-xs sm:text-sm font-medium text-center sm:text-left whitespace-nowrap">
          {t('footer.poweredBy')} 
          <span 
            className="cursor-pointer hover:underline ml-1 text-orange-400"
            onClick={handleClick}
          >
            {t('footer.tryBusiness')}
          </span>
        </span>
      </div>
    </footer>
  );
}