import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  
  // Get current language from localStorage directly
  const currentLanguage = localStorage.getItem('language') || 'ru';

  // Simple text functions
  const getAuthText = (key: string): string => {
    const texts: Record<string, Record<string, string>> = {
      ru: {
        welcome: "Добро пожаловать в",
        login: "Вход",
        register: "Регистрация",
        username: "Имя пользователя",
        password: "Пароль",
        confirmPassword: "Подтвердите пароль",
        loginButton: "Войти",
        registerButton: "Зарегистрироваться",
        backToHome: "Вернуться на главную",
        loginDescription: "Войдите в свой аккаунт для оформления заказов",
        registerDescription: "Создайте аккаунт для удобного оформления заказов"
      },
      en: {
        welcome: "Welcome to",
        login: "Login",
        register: "Register",
        username: "Username",
        password: "Password",
        confirmPassword: "Confirm Password",
        loginButton: "Login",
        registerButton: "Register",
        backToHome: "Back to Home",
        loginDescription: "Sign in to your account to place orders",
        registerDescription: "Create an account for easy order placement"
      },
      he: {
        welcome: "ברוכים הבאים ל",
        login: "התחברות",
        register: "הרשמה",
        username: "שם משתמש",
        password: "סיסמה",
        confirmPassword: "אישור סיסמה",
        loginButton: "התחבר",
        registerButton: "הירשם",
        backToHome: "חזרה לעמוד הבית",
        loginDescription: "התחבר לחשבון שלך כדי לבצע הזמנות",
        registerDescription: "צור חשבון להזמנה נוחה"
      }
    };
    
    return texts[currentLanguage]?.[key] || texts.ru[key] || key;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  // Simple validation schemas
  const loginSchema = z.object({
    username: z.string().min(1, "Username required"),
    password: z.string().min(1, "Password required"),
  });

  const registerSchema = z.object({
    username: z.string().min(3, "Min 3 characters").max(50, "Max 50 characters"),
    password: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password"),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  type LoginFormData = z.infer<typeof loginSchema>;
  type RegisterFormData = z.infer<typeof registerSchema>;

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
  });

  const onLogin = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync(registerData);
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  const isRTL = currentLanguage === 'he';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Form Section */}
        <div className={`${isRTL ? 'lg:order-2' : ''}`}>
          <Card className="w-full max-w-md mx-auto shadow-xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                {getAuthText('welcome')} eDAHouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{getAuthText('login')}</TabsTrigger>
                  <TabsTrigger value="register">{getAuthText('register')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                  <CardDescription className="text-center">
                    {getAuthText('loginDescription')}
                  </CardDescription>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loginUsername">{getAuthText('username')}</Label>
                      <Input
                        id="loginUsername"
                        {...loginForm.register("username")}
                        className="w-full"
                      />
                      {loginForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loginPassword">{getAuthText('password')}</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        {...loginForm.register("password")}
                        className="w-full"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "..." : getAuthText('loginButton')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <CardDescription className="text-center">
                    {getAuthText('registerDescription')}
                  </CardDescription>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="registerUsername">{getAuthText('username')}</Label>
                      <Input
                        id="registerUsername"
                        {...registerForm.register("username")}
                        className="w-full"
                      />
                      {registerForm.formState.errors.username && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">{getAuthText('password')}</Label>
                      <Input
                        id="registerPassword"
                        type="password"
                        {...registerForm.register("password")}
                        className="w-full"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{getAuthText('confirmPassword')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                        className="w-full"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-500">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "..." : getAuthText('registerButton')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Hero Section */}
        <div className={`text-center lg:text-left ${isRTL ? 'lg:order-1 lg:text-right' : ''}`}>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            eDAHouse
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {currentLanguage === 'he' 
              ? 'אוכל מוכן, טעים ואיכותי'
              : currentLanguage === 'en' 
              ? 'Ready-made, delicious and quality food'
              : 'Готовая, вкусная и качественная еда'
            }
          </p>
          <div className="space-y-4 text-gray-500">
            <p className="flex items-center justify-center lg:justify-start">
              {currentLanguage === 'he' 
                ? '✓ משלוח מהיר ואמין'
                : currentLanguage === 'en' 
                ? '✓ Fast and reliable delivery'
                : '✓ Быстрая и надежная доставка'
              }
            </p>
            <p className="flex items-center justify-center lg:justify-start">
              {currentLanguage === 'he' 
                ? '✓ מוצרים טריים יומיים'
                : currentLanguage === 'en' 
                ? '✓ Fresh daily products'
                : '✓ Свежие продукты ежедневно'
              }
            </p>
            <p className="flex items-center justify-center lg:justify-start">
              {currentLanguage === 'he' 
                ? '✓ תמיכה 24/7'
                : currentLanguage === 'en' 
                ? '✓ 24/7 support'
                : '✓ Поддержка 24/7'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}