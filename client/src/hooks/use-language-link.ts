import { useLanguageRouting, buildLanguageUrl, type LanguageCode } from "@/hooks/use-language-routing";
import { Link as WouterLink } from "wouter";
import { ComponentProps } from "react";

export function useLanguageLink() {
  const { currentLanguage, primaryLanguage } = useLanguageRouting();
  
  // Helper function to build language-aware URLs
  const buildUrl = (path: string, language?: LanguageCode) => {
    return buildLanguageUrl(path, language || currentLanguage, primaryLanguage);
  };
  
  return { buildUrl, currentLanguage, primaryLanguage };
}

// Language-aware Link component
interface LanguageLinkProps extends ComponentProps<typeof WouterLink> {
  href: string;
}

export function LanguageLink({ href, ...props }: LanguageLinkProps) {
  const { buildUrl } = useLanguageLink();
  
  return WouterLink({ ...props, href: buildUrl(href) });
}