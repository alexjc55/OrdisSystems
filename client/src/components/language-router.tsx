import { Switch, Route } from "wouter";
import { useLanguageRouting } from "@/hooks/use-language-routing";
import { LANGUAGES } from "@/lib/i18n";
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

interface LanguageRouterProps {
  notificationModal: {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'marketing' | 'order-status' | 'cart-reminder';
  };
  setNotificationModal: (modal: any) => void;
}

export function LanguageRouter({ notificationModal, setNotificationModal }: LanguageRouterProps) {
  // Define route configurations
  const routes = [
    {
      path: "/",
      component: () => <Landing />,
      protected: false
    },
    {
      path: "/shop",
      component: () => <Home />,
      protected: false
    },
    {
      path: "/auth",
      component: AuthPage,
      protected: false
    },
    {
      path: "/checkout",
      component: Checkout,
      protected: true
    },
    {
      path: "/profile",
      component: Profile,
      protected: true
    },
    {
      path: "/change-password",
      component: ChangePasswordPage,
      protected: true
    },
    {
      path: "/forgot-password",
      component: ForgotPasswordPage,
      protected: false
    },
    {
      path: "/reset-password",
      component: ResetPasswordPage,
      protected: false
    },
    {
      path: "/admin",
      component: AdminDashboard,
      protected: true,
      adminOnly: true
    }
  ];

  const generateRoutes = (): JSX.Element[] => {
    const allRoutes: JSX.Element[] = [];
    
    routes.forEach(route => {
      // Add route for default language (no prefix)
      if (route.protected) {
        allRoutes.push(
          <Route key={route.path} path={route.path}>
            {() => (
              <ProtectedRoute path={route.path} component={route.component} adminOnly={route.adminOnly} />
            )}
          </Route>
        );
      } else {
        allRoutes.push(
          <Route key={route.path} path={route.path} component={route.component} />
        );
      }
      
      // Add routes for each language (except Russian which is default)
      Object.keys(LANGUAGES).forEach(lang => {
        if (lang !== 'ru') {
          const langPath = `/${lang}${route.path === '/' ? '' : route.path}`;
          
          if (route.protected) {
            allRoutes.push(
              <Route key={langPath} path={langPath}>
                {() => (
                  <ProtectedRoute path={langPath} component={route.component} adminOnly={route.adminOnly} />
                )}
              </Route>
            );
          } else {
            allRoutes.push(
              <Route key={langPath} path={langPath} component={route.component} />
            );
          }
        }
      });
    });
    
    return allRoutes;
  };
  
  return (
    <Switch>
      {generateRoutes()}
      <Route component={NotFound} />
    </Switch>
  );
}