import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCommonTranslation, useLanguage } from "@/hooks/use-language";
import { useSEO, generateKeywords } from "@/hooks/useSEO";
import { getLocalizedField } from "@shared/localization";
import { getReturnTo, clearReturnTo } from "@/lib/auth-redirect";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { storeSettings } = useStoreSettings();
  const { t } = useCommonTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("login");


  // SEO for auth page
  const storeName = getLocalizedField(storeSettings, 'storeName', currentLanguage);
  const title = `Вход в аккаунт - ${storeName || 'eDAHouse'}`;
  const description = `Войдите в свой аккаунт в ${storeName || 'eDAHouse'} для оформления заказов`;
  
  useSEO({
    title,
    description,
    keywords: generateKeywords(title, description),
    ogTitle: title,
    ogDescription: description,
    canonical: currentLanguage === 'ru' ? '/auth' : `/${currentLanguage}/auth`
  });

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
      },
      ar: {
        usernameRequired: "أدخل اسم المستخدم",
        passwordRequired: "أدخل كلمة المرور",
        usernameMinLength: "اسم المستخدم يجب أن يحتوي على 3 أحرف على الأقل",
        usernameMaxLength: "اسم المستخدم يجب ألا يتجاوز 50 حرفًا",
        usernameFormat: "اسم المستخدم يمكن أن يحتوي على أحرف وأرقام و _ فقط",
        passwordMinLength: "كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل",
        emailInvalid: "أدخل بريد إلكتروني صحيح",
        firstNameRequired: "أدخل الاسم الأول",
        lastNameRequired: "أدخل اسم العائلة",
        phoneRequired: "أدخل رقم الهاتف",
        confirmPasswordRequired: "أكد كلمة المرور",
        passwordMismatch: "كلمتا المرور غير متطابقتين"
      }
    };
    return messages[currentLanguage]?.[key as MessageKey] || messages.ru[key as MessageKey];
  };

  // Dynamic UI text based on current language
  const getAuthText = (key: string) => {
    const authTexts: Record<string, Record<string, string>> = {
      ru: {
        title: "Вход в систему",
        description: "Войдите в свой аккаунт или создайте новый",
        login: "Вход",
        register: "Регистрация",
        username: "Имя пользователя",
        usernamePlaceholder: "Введите имя пользователя",
        usernameRegPlaceholder: "Выберите имя пользователя",
        password: "Пароль",
        passwordPlaceholder: "Введите пароль",
        createPasswordPlaceholder: "Создайте пароль",
        confirmPassword: "Подтвердите пароль",
        confirmPasswordPlaceholder: "Повторите пароль",
        email: "Email",
        emailPlaceholder: "Введите email (необязательно)",
        firstName: "Имя",
        firstNamePlaceholder: "Ваше имя",
        lastName: "Фамилия",
        lastNamePlaceholder: "Ваша фамилия",
        phone: "Телефон",
        phonePlaceholder: "Номер телефона",
        loginButton: "Войти",
        registerButton: "Зарегистрироваться",
        loggingIn: "Вход...",
        registering: "Регистрация...",
        backToHome: "Вернуться на главную"
      },
      en: {
        title: "Sign In",
        description: "Sign in to your account or create a new one",
        login: "Login",
        register: "Register",
        username: "Username",
        usernamePlaceholder: "Enter username",
        usernameRegPlaceholder: "Choose username",
        password: "Password",
        passwordPlaceholder: "Enter password",
        createPasswordPlaceholder: "Create password",
        confirmPassword: "Confirm Password",
        confirmPasswordPlaceholder: "Repeat password",
        email: "Email",
        emailPlaceholder: "Enter email (optional)",
        firstName: "First Name",
        firstNamePlaceholder: "Your first name",
        lastName: "Last Name",
        lastNamePlaceholder: "Your last name",
        phone: "Phone",
        phonePlaceholder: "Phone number",
        loginButton: "Sign In",
        registerButton: "Register",
        loggingIn: "Signing in...",
        registering: "Registering...",
        backToHome: "Back to Home"
      },
      he: {
        title: "כניסה למערכת",
        description: "התחבר לחשבון שלך או צור חשבון חדש",
        login: "כניסה",
        register: "הרשמה",
        username: "שם משתמש",
        usernamePlaceholder: "הכנס שם משתמש",
        usernameRegPlaceholder: "בחר שם משתמש",
        password: "סיסמה",
        passwordPlaceholder: "הכנס סיסמה",
        createPasswordPlaceholder: "צור סיסמה",
        confirmPassword: "אשר סיסמה",
        confirmPasswordPlaceholder: "חזור על הסיסמה",
        email: "אימייל",
        emailPlaceholder: "הכנס אימייל (אופציונלי)",
        firstName: "שם פרטי",
        firstNamePlaceholder: "השם הפרטי שלך",
        lastName: "שם משפחה",
        lastNamePlaceholder: "שם המשפחה שלך",
        phone: "טלפון",
        phonePlaceholder: "מספר טלפון",
        loginButton: "כניסה",
        registerButton: "הירשם",
        loggingIn: "מתחבר...",
        registering: "נרשם...",
        backToHome: "חזרה לבית"
      },
      ar: {
        title: "تسجيل الدخول للنظام",
        description: "سجل الدخول لحسابك أو أنشئ حساب جديد",
        login: "تسجيل الدخول",
        register: "التسجيل",
        username: "اسم المستخدم",
        usernamePlaceholder: "أدخل اسم المستخدم",
        usernameRegPlaceholder: "اختر اسم المستخدم",
        password: "كلمة المرور",
        passwordPlaceholder: "أدخل كلمة المرور",
        createPasswordPlaceholder: "أنشئ كلمة المرور",
        confirmPassword: "تأكيد كلمة المرور",
        confirmPasswordPlaceholder: "كرر كلمة المرور",
        email: "البريد الإلكتروني",
        emailPlaceholder: "أدخل البريد الإلكتروني (اختياري)",
        firstName: "الاسم الأول",
        firstNamePlaceholder: "اسمك الأول",
        lastName: "اسم العائلة",
        lastNamePlaceholder: "اسم عائلتك",
        phone: "الهاتف",
        phonePlaceholder: "رقم الهاتف",
        loginButton: "تسجيل الدخول",
        registerButton: "إنشاء حساب",
        loggingIn: "جاري تسجيل الدخول...",
        registering: "جاري التسجيل...",
        backToHome: "العودة للصفحة الرئيسية"
      }
    };
    return authTexts[currentLanguage]?.[key] || authTexts.ru[key] || key;
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

  // Redirect to return URL if already logged in
  useEffect(() => {
    if (user) {
      const returnUrl = getReturnTo();
      clearReturnTo(); // Clean up
      setLocation(returnUrl);
    }
  }, [user, setLocation]);

  // Preserve language selection when navigating to auth page
  useEffect(() => {
    // Optimize language restoration to prevent loading delays
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== currentLanguage) {
      // Use requestIdleCallback for non-blocking language change
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          changeLanguage(savedLanguage as any);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          changeLanguage(savedLanguage as any);
        }, 0);
      }
    }
  }, []); // Remove dependencies to run only once

  const onLogin = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      // Redirect will be handled by useEffect after user state updates
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
      // Redirect will be handled by useEffect after user state updates
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
          {getAuthText('backToHome')}
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Auth Forms */}
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{getAuthText('title')}</CardTitle>
            <CardDescription>
              {getAuthText('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{getAuthText('login')}</TabsTrigger>
                <TabsTrigger value="register">{getAuthText('register')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{getAuthText('username')}</Label>
                    <Input
                      id="username"
                      {...loginForm.register("username")}
                      placeholder={getAuthText('usernamePlaceholder')}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">{getAuthText('password')}</Label>
                    <PasswordInput
                      id="password"
                      {...loginForm.register("password")}
                      placeholder={getAuthText('passwordPlaceholder')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {getAuthText('loggingIn')}
                      </>
                    ) : (
                      getAuthText('loginButton')
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">{getAuthText('username')}</Label>
                    <Input
                      id="reg-username"
                      {...registerForm.register("username")}
                      placeholder={getAuthText('usernameRegPlaceholder')}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">{getAuthText('email')}</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      {...registerForm.register("email")}
                      placeholder={getAuthText('emailPlaceholder')}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{getAuthText('firstName')}</Label>
                      <Input
                        id="firstName"
                        {...registerForm.register("firstName")}
                        placeholder={getAuthText('firstNamePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{getAuthText('lastName')}</Label>
                      <Input
                        id="lastName"
                        {...registerForm.register("lastName")}
                        placeholder={getAuthText('lastNamePlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{getAuthText('phone')}</Label>
                    <Input
                      id="phone"
                      {...registerForm.register("phone")}
                      placeholder={getAuthText('phonePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">{getAuthText('password')}</Label>
                    <PasswordInput
                      id="reg-password"
                      {...registerForm.register("password")}
                      placeholder={getAuthText('createPasswordPlaceholder')}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{getAuthText('confirmPassword')}</Label>
                    <PasswordInput
                      id="confirmPassword"
                      {...registerForm.register("confirmPassword")}
                      placeholder={getAuthText('confirmPasswordPlaceholder')}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-600">
                        {registerForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {getAuthText('registering')}
                      </>
                    ) : (
                      getAuthText('registerButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}