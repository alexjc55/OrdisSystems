import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { AuthProvider } from "@/hooks/use-auth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { CustomHtml } from "@/components/custom-html";
import { WhatsAppChat } from "@/components/layout/whatsapp-chat";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import AdminDashboard from "@/pages/admin-dashboard";
import Profile from "@/pages/profile";
import ChangePasswordPage from "@/pages/change-password";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import Checkout from "@/pages/checkout";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  const { storeSettings } = useStoreSettings();

  return (
    <ErrorBoundary>
      {/* Render custom header HTML/JS */}
      {storeSettings?.headerHtml && (
        <CustomHtml html={storeSettings.headerHtml} type="head" />
      )}
      
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/category/:categoryId" component={Home} />
        <Route path="/all-products" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/admin" component={() => <AdminDashboard />} />
        <ProtectedRoute path="/profile" component={() => <Profile />} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/change-password" component={ChangePasswordPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/landing" component={Landing} />
        <Route component={NotFound} />
      </Switch>
      
      {/* WhatsApp Chat Widget */}
      <WhatsAppChat />
      
      {/* Render custom footer HTML/JS */}
      {storeSettings?.footerHtml && (
        <CustomHtml html={storeSettings.footerHtml} type="footer" />
      )}
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
