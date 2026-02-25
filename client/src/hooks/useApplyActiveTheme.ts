import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { applyThemeVars } from "@/lib/apply-theme-vars";

export function useApplyActiveTheme() {
  const { data: activeTheme } = useQuery<any>({
    queryKey: ['/api/themes/active'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (activeTheme) {
      applyThemeVars(activeTheme);
    }
  }, [activeTheme]);
}
