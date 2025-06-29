import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Check } from "lucide-react";
import { Link } from "wouter";
import { useCommonTranslation } from "@/hooks/use-language";

export default function ForgotPasswordPage() {
  const { t } = useCommonTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (error: any) => {
      setError(error.message || t('auth.passwordResetError'));
      toast({
        title: t('status.error'),
        description: error.message || t('auth.passwordResetError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError(t('validation.emailRequired'));
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('validation.emailInvalid'));
      return;
    }
    
    setError("");
    forgotPasswordMutation.mutate(email);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>{t('auth.passwordResetSent')}</CardTitle>
            <CardDescription>
              {t('auth.passwordResetInstructions')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {t('auth.checkSpamFolder')}
            </p>
            <div className="flex gap-2">
              <Link href="/auth" className="flex-1">
                <Button variant="outline" className="w-full">
                  {t('auth.backToLogin')}
                </Button>
              </Link>
              <Button 
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                }}
                variant="outline"
                className="flex-1"
              >
                Отправить еще раз
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle>Забыли пароль?</CardTitle>
          <CardDescription>
            Введите ваш email адрес и мы отправим инструкции по восстановлению пароля
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email адрес</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={error ? "border-red-500" : ""}
                placeholder="example@email.com"
                required
              />
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={forgotPasswordMutation.isPending}
              className="w-full"
            >
              {forgotPasswordMutation.isPending ? (
                "Отправка..."
              ) : (
                "Отправить инструкции"
              )}
            </Button>

            <div className="text-center">
              <Link href="/auth">
                <Button variant="ghost" className="text-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к входу
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}