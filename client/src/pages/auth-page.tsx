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
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { storeSettings } = useStoreSettings();
  const { t } = useCommonTranslation();
  const { currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("login");

  // Dynamic validation messages based on current language
  const getValidationMessage = (key: string) => {
    type MessageKey = 'usernameRequired' | 'passwordRequired' | 'usernameMinLength' | 'passwordMinLength' | 'emailInvalid' | 'firstNameRequired' | 'lastNameRequired' | 'phoneRequired' | 'confirmPasswordRequired' | 'passwordMismatch' | 'usernameMaxLength' | 'usernameFormat';
    
    const messages: Record<string, Record<MessageKey, string>> = {
      ru: {
        usernameRequired: "Введите имя пользователя",
        passwordRequired: "Введите пароль",
        usernameMinLength: "Имя пользователя должно содержать минимум 3 символа",
        usernameMaxLength: "Имя пользователя не должно превышать 50 символов",
        usernameFormat: "Имя пользователя может содержать только буквы, цифры и _",
        passwordMinLength: "Пароль должен содержать минимум 6 символов",
        emailInvalid: "Введите корректный email",
        firstNameRequired: "Введите имя",
        lastNameRequired: "Введите фамилию",
        phoneRequired: "Введите номер телефона",
        confirmPasswordRequired: "Подтвердите пароль",
        passwordMismatch: "Пароли не совпадают"
      },
      en: {
        usernameRequired: "Enter username",
        passwordRequired: "Enter password",
        usernameMinLength: "Username must be at least 3 characters",
        usernameMaxLength: "Username must not exceed 50 characters",
        usernameFormat: "Username can only contain letters, numbers and _",
        passwordMinLength: "Password must be at least 6 characters",
        emailInvalid: "Enter a valid email",
        firstNameRequired: "Enter first name",
        lastNameRequired: "Enter last name",
        phoneRequired: "Enter phone number",
        confirmPasswordRequired: "Confirm password",
        passwordMismatch: "Passwords do not match"
      },
      he: {
        usernameRequired: "הכנס שם משתמש",
        passwordRequired: "הכנס סיסמה",
        usernameMinLength: "שם המשתמש חייב להכיל לפחות 3 תווים",
        usernameMaxLength: "שם המשתמש לא יכול לעלות על 50 תווים",
        usernameFormat: "שם המשתמש יכול להכיל רק אותיות, מספרים ו_",
        passwordMinLength: "הסיסמה חייבת להכיל לפחות 6 תווים",
        emailInvalid: "הכנס אימייל תקין",
        firstNameRequired: "הכנס שם פרטי",
        lastNameRequired: "הכנס שם משפחה",
        phoneRequired: "הכנס מספר טלפון",
        confirmPasswordRequired: "אשר סיסמה",
        passwordMismatch: "הסיסמאות לא תואמות"
      }
    };
    return messages[currentLanguage]?.[key as MessageKey] || messages.ru[key as MessageKey];
  };

  const loginSchema = z.object({
    username: z.string().min(1, getValidationMessage('usernameRequired')),
    password: z.string().min(1, getValidationMessage('passwordRequired')),
  });

  const registerSchema = z.object({
    username: z.string()
      .min(3, getValidationMessage('usernameMinLength'))
      .max(50, getValidationMessage('usernameMaxLength'))
      .regex(/^[a-zA-Z0-9_]+$/, getValidationMessage('usernameFormat')),
    email: z.string().email(getValidationMessage('emailInvalid')).optional().or(z.literal("")),
    password: z.string().min(6, getValidationMessage('passwordMinLength')),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: getValidationMessage('passwordMismatch'),
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

  // Preserve language selection when navigating to auth page
  useEffect(() => {
    // This effect helps maintain language state on auth page load
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage && savedLanguage !== currentLanguage) {
      // Language persistence is handled by the language hook
    }
  }, [currentLanguage]);

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
            <CardTitle>{t('auth.title')}</CardTitle>
            <CardDescription>
              {t('auth.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t('auth.username')}</Label>
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                      placeholder={t('auth.usernamePlaceholder')}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      {...loginForm.register("password")}
                      placeholder={t('auth.passwordPlaceholder')}
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
                        {t('auth.loggingIn')}
                      </>
                    ) : (
                      t('auth.loginButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">{t('auth.username')} *</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                      placeholder={t('auth.usernameRegPlaceholder')}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      {...registerForm.register("email")}
                      placeholder={t('auth.emailPlaceholder')}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                      <Input
                        id="firstName"
                        {...registerForm.register("firstName")}
                        placeholder={t('auth.firstNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                      <Input
                        id="lastName"
                        {...registerForm.register("lastName")}
                        placeholder={t('auth.lastNamePlaceholder')}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('auth.phone')}</Label>
                    <Input
                      id="phone"
                      {...registerForm.register("phone")}
                      placeholder={t('auth.phonePlaceholder')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">{t('auth.password')} *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      {...registerForm.register("password")}
                      placeholder={t('auth.createPasswordPlaceholder')}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...registerForm.register("confirmPassword")}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
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
                        {t('auth.registering')}
                      </>
                    ) : (
                      t('auth.registerButton')
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