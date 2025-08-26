import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguageRouting, type LanguageCode } from "@/hooks/use-language-routing";
import { ChevronDown, Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useLanguageRouting();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Globe className="h-4 w-4" />
          <span>{LANGUAGES[currentLanguage].flag}</span>
          <span className="hidden sm:inline">{LANGUAGES[currentLanguage].nativeName}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LANGUAGES).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeLanguage(code as LanguageCode)}
            className={`flex items-center gap-2 ${currentLanguage === code ? 'bg-accent' : ''}`}
          >
            <span className="font-medium">{lang.flag}</span>
            <span>{lang.nativeName}</span>
            {currentLanguage === code && (
              <span className="text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}