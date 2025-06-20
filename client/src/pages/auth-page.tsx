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
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation } from "@/hooks/use-language";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { storeSettings } = useStoreSettings();
  const { t } = useCommonTranslation();
  const [activeTab, setActiveTab] = useState("login");

  const loginSchema = z.object({
    username: z.string().min(1, t('validation.usernameRequired')),
    password: z.string().min(1, t('validation.passwordRequired')),
  });

  const registerSchema = z.object({
    username: z.string()
      .min(3, t('validation.usernameMinLength'))
      .max(50, t('validation.usernameMaxLength'))
      .regex(/^[a-zA-Z0-9_]+$/, t('validation.usernameFormat')),
    email: z.string().email(t('validation.emailInvalid')).optional().or(z.literal("")),
    password: z.string().min(6, t('validation.passwordMinLength')),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordMismatch'),
    path: ["confirmPassword"],
  });

  type LoginFormData = z.infer<typeof loginSchema>;
  type RegisterFormData = z.infer<typeof registerSchema>;

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLogin = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...registerData } = data;
      await registerMutation.mutateAsync({
        ...registerData,
        email: registerData.email || undefined,
      });
      setLocation("/");
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex flex-col">
      {/* Header with back button */}
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToHome')}
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Hero Section */}
          <div className="hidden lg:block space-y-6">
            <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              {storeSettings?.authPageTitle || "Добро пожаловать в eDAHouse"}
            </h1>
            <p className="text-xl text-gray-600">
              {storeSettings?.authPageSubtitle || "Готовые блюда высокого качества с доставкой на дом"}
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-gray-700">{storeSettings?.authPageFeature1 || "Свежие готовые блюда каждый день"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-gray-700">{storeSettings?.authPageFeature2 || "Быстрая доставка в удобное время"}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <span className="text-gray-700">{storeSettings?.authPageFeature3 || "Широкий выбор блюд на любой вкус"}</span>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Вход в систему</CardTitle>
            <CardDescription>
              Войдите в свой аккаунт или создайте новый
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Имя пользователя</Label>
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                      placeholder="Введите имя пользователя"
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register("password")}
                      placeholder="Введите пароль"
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Вход...
                      </>
                    ) : (
                      "Войти"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Имя пользователя *</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                      placeholder="Выберите имя пользователя"
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...registerForm.register("email")}
                      placeholder="Введите email (необязательно)"
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Имя</Label>
                      <Input
                        id="firstName"
                        {...registerForm.register("firstName")}
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Фамилия</Label>
                      <Input
                        id="lastName"
                        {...registerForm.register("lastName")}
                        placeholder="Ваша фамилия"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      {...registerForm.register("phone")}
                      placeholder="Номер телефона"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Пароль *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register("password")}
                      placeholder="Создайте пароль"
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Подтвердите пароль *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...registerForm.register("confirmPassword")}
                      placeholder="Повторите пароль"
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Регистрация...
                      </>
                    ) : (
                      "Зарегистрироваться"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}