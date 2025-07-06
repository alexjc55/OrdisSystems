import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCommonTranslation } from "@/hooks/use-language";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { t } = useCommonTranslation();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.loginWelcome'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.loginError'),
        description: t('auth.loginInvalidCredentials'),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      return await apiRequest("POST", "/api/register", credentials);
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      toast({
        title: t('auth.registerSuccess'),
        description: t('auth.loginWelcome'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.registerError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: t('auth.logoutSuccess'),
        description: t('auth.logoutMessage'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.logoutError'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isAuthenticated: !!user,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}