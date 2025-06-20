import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Theme, ThemeColors } from "@shared/schema";

type ThemeContextType = {
  themes: Theme[];
  activeTheme: Theme | null;
  isLoading: boolean;
  error: Error | null;
  activateThemeMutation: UseMutationResult<any, Error, string>;
  createThemeMutation: UseMutationResult<Theme, Error, CreateThemeData>;
  updateThemeMutation: UseMutationResult<Theme, Error, UpdateThemeData>;
  deleteThemeMutation: UseMutationResult<void, Error, number>;
};

type CreateThemeData = {
  name: string;
  displayName: string;
  description?: string;
  colors: ThemeColors;
};

type UpdateThemeData = {
  id: number;
  name?: string;
  displayName?: string;
  description?: string;
  colors?: ThemeColors;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: themes = [],
    error,
    isLoading,
  } = useQuery<Theme[]>({
    queryKey: ["/api/themes"],
  });

  const {
    data: storeSettings,
  } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const activeTheme = themes.find(theme => theme.name === storeSettings?.activeTheme) || null;

  const activateThemeMutation = useMutation({
    mutationFn: async (themeName: string) => {
      const res = await apiRequest("POST", "/api/themes/activate", { themeName });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      toast({
        title: "Тема активирована",
        description: "Новая тема успешно применена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка активации темы",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createThemeMutation = useMutation({
    mutationFn: async (themeData: CreateThemeData) => {
      const res = await apiRequest("POST", "/api/themes", themeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      toast({
        title: "Тема создана",
        description: "Новая тема успешно создана",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка создания темы",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, ...themeData }: UpdateThemeData) => {
      const res = await apiRequest("PUT", `/api/themes/${id}`, themeData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      toast({
        title: "Тема обновлена",
        description: "Тема успешно обновлена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка обновления темы",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/themes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
      toast({
        title: "Тема удалена",
        description: "Тема успешно удалена",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка удаления темы",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  return (
    <ThemeContext.Provider
      value={{
        themes,
        activeTheme,
        isLoading,
        error,
        activateThemeMutation,
        createThemeMutation,
        updateThemeMutation,
        deleteThemeMutation,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemes() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemes must be used within a ThemeProvider");
  }
  return context;
}