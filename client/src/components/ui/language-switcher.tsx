import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage, useCommonTranslation } from "@/hooks/use-language";
import { Languages, Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "button" | "select" | "compact";
  showFlag?: boolean;
  showText?: boolean;
}

export function LanguageSwitcher({ 
  variant = "button", 
  showFlag = false, 
  showText = true 
}: LanguageSwitcherProps) {
  const { currentLanguage, currentLanguageInfo, languages, changeLanguage } = useLanguage();
  const { t } = useCommonTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show enabled languages
  const availableLanguages = languages;
  const languageCount = Object.keys(availableLanguages).length;
  
  // Hide language switcher if only one language is available
  if (languageCount <= 1) {
    return null;
  }

  if (variant === "select") {
    return (
      <div className="relative">
        <select
          value={currentLanguage}
          onChange={(e) => changeLanguage(e.target.value as "ru" | "en" | "he" | "ar")}
          className="w-auto min-w-[120px] h-10 bg-white border border-gray-200 rounded-md px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {Object.entries(availableLanguages).map(([code, info]) => (
            <option key={code} value={code}>
              {info.nativeName}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Globe className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align="end">
          <div className="flex flex-col gap-1">
            {Object.entries(availableLanguages).map(([code, info]) => (
              <button
                key={code}
                onClick={() => {
                  changeLanguage(code as any);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-start px-2 py-1.5 text-sm rounded-md transition-colors ${
                  code === currentLanguage 
                    ? "bg-primary-light text-primary" 
                    : "text-gray-700 hover:bg-primary-light hover:text-primary"
                }`}
              >
                <span className={`${info.flagClass} inline-block mr-2 rtl:mr-0 rtl:ml-2`}></span>
                <span className="text-xs">{info.nativeName}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default button variant
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          {showFlag && <span className="text-base">{currentLanguageInfo.flag}</span>}
          {showText && <span>{currentLanguageInfo.nativeName}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {t('chooseLanguage')}
          </div>
          {Object.entries(availableLanguages).map(([code, info]) => (
            <button
              key={code}
              onClick={() => {
                changeLanguage(code as any);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-start px-3 py-2 text-sm rounded-md transition-colors ${
                code === currentLanguage 
                  ? "bg-primary-light text-primary" 
                  : "text-gray-700 hover:bg-primary-light hover:text-primary"
              }`}
            >
              <span className={`${info.flagClass} inline-block mr-3 rtl:mr-0 rtl:ml-3`}></span>
              <div className="text-left">
                <div className="font-medium">{info.name}</div>
                <div className="text-xs text-gray-500">{info.nativeName}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}