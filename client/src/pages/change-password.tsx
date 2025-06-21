import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { useCommonTranslation } from "@/hooks/use-language";

export default function ChangePasswordPage() {
  const { t } = useCommonTranslation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/auth/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('auth.passwordChanged'),
        description: t('auth.passwordChangeSuccess'),
      });
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
    },
    onError: (error: any) => {
      toast({
        title: t('status.error'),
        description: error.message || t('auth.passwordChangeError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    // Validation
    if (!formData.currentPassword && user?.password) {
      newErrors.currentPassword = t('auth.currentPasswordRequired');
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = t('validation.passwordRequired');
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = t('validation.passwordMinLength');
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('auth.confirmNewPassword');
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordMismatch');
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>{t('messages.accessDenied')}</CardTitle>
            <CardDescription>
              {t('auth.loginRequiredForPasswordChange')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth">
              <Button className="w-full">{t('actions.login')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              ← {t('navigation.backToHome')}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>{t('auth.changePassword')}</CardTitle>
                <CardDescription>
                  {user?.password 
                    ? t('auth.updatePasswordSecurity') 
                    : t('auth.setPasswordAccount')
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {!user?.password && (
              <Alert className="mb-6 border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {t('auth.noPasswordSet')}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {user?.password && (
                <div>
                  <Label htmlFor="currentPassword">{t('auth.currentPassword')} *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                    className={errors.currentPassword ? "border-red-500" : ""}
                    placeholder={t('auth.enterCurrentPassword')}
                  />
                  {errors.currentPassword && (
                    <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="newPassword">
                  {user?.password ? t('auth.newPassword') : t('auth.password')} *
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  className={errors.newPassword ? "border-red-500" : ""}
                  placeholder={t('auth.passwordMinChars')}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">
                  {user?.password ? t('auth.confirmNewPassword') : t('auth.confirmPassword')} *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                  placeholder={t('auth.repeatPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex-1"
                >
                  {changePasswordMutation.isPending ? (
                    t('status.saving')
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {user?.password ? t('auth.changePassword') : t('auth.setPassword')}
                    </>
                  )}
                </Button>
                
                <Link href="/">
                  <Button type="button" variant="outline">
                    Отмена
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}