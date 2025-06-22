import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  showFlag = true, 
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
      <Select value={currentLanguage} onValueChange={changeLanguage}>
        <SelectTrigger className="w-auto min-w-[120px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {showFlag && <span className="text-base">{currentLanguageInfo.flag}</span>}
              {showText && <span>{currentLanguageInfo.nativeName}</span>}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(availableLanguages).map(([code, info]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center gap-2">
                {showFlag && <span className="text-base">{info.flag}</span>}
                <span>{info.nativeName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
              <Button
                key={code}
                variant={code === currentLanguage ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  changeLanguage(code as any);
                  setIsOpen(false);
                }}
                className="justify-start"
              >
                <span className="text-base mr-2 rtl:mr-0 rtl:ml-2">{info.flag}</span>
                <span className="text-xs">{info.nativeName}</span>
              </Button>
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
            <Button
              key={code}
              variant={code === currentLanguage ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                changeLanguage(code as any);
                setIsOpen(false);
              }}
              className="w-full justify-start"
            >
              <span className="text-base mr-3 rtl:mr-0 rtl:ml-3">{info.flag}</span>
              <div className="text-left">
                <div className="font-medium">{info.name}</div>
                <div className="text-xs text-gray-500">{info.nativeName}</div>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}