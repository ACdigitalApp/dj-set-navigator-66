import { useI18n } from '@/lib/i18n';
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFriendlyAuthErrorMessage, validateStrongPassword } from "@/lib/auth-utils";

const PASSWORD_RULES = [
  { key: "length", label: "Almeno 12 caratteri", en: "At least 12 characters" },
  { key: "upper", label: "Almeno una lettera maiuscola", en: "At least one uppercase letter" },
  { key: "lower", label: "Almeno una lettera minuscola", en: "At least one lowercase letter" },
  { key: "number", label: "Almeno un numero", en: "At least one number" },
  { key: "symbol", label: "Almeno un simbolo", en: "At least one symbol" },
] as const;

export default function ResetPasswordPage() {
  const { lang } = useI18n();
  const L = (en: string, it: string) => (lang === 'it' ? it : en);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = hashParams.get("type");
    setReady(type === "recovery");
  }, []);

  const validation = useMemo(() => validateStrongPassword(password), [password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ready) {
      toast.error(L("Invalid or expired recovery link.", "Link di recupero non valido o scaduto."));
      return;
    }

    if (!validation.valid) {
      toast.error(L("The password must meet all security requirements.", "La password deve rispettare tutti i requisiti di sicurezza."));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(L("Passwords do not match.", "Le password non coincidono."));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(L("Password updated. You can now sign in.", "Password aggiornata correttamente. Ora puoi accedere."));
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error(getFriendlyAuthErrorMessage(error, L("Password update failed. Please try again.", "Aggiornamento password non riuscito. Riprova.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">{L("Reset password", "Reimposta password")}</CardTitle>
          <CardDescription>
            {L("Enter a new secure password to complete account recovery.", "Inserisci una nuova password sicura per completare il recupero dell’account.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">{L("New password", "Nuova password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 pr-10"
                  placeholder=L("Enter a strong password", "Inserisci una password forte")
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? L("Hide password", "Nascondi password") : L("Show password", "Mostra password")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">{L("Confirm password", "Conferma password")}</label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder=L("Repeat the new password", "Ripeti la nuova password")
                required
              />
            </div>

            <div className="rounded-xl bg-secondary p-4 space-y-2">
              {PASSWORD_RULES.map((rule) => {
                const passed = validation.checks[rule.key];
                return (
                  <div key={rule.key} className="flex items-center gap-2 text-sm">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${passed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>{L(rule.en, rule.label)}</span>
                  </div>
                );
              })}
            </div>

            {!ready && (
              <p className="text-sm text-destructive">
                {L("Open this page using the link received by email, otherwise the reset cannot be completed.", "Apri questa pagina usando il link ricevuto via email, altrimenti il reset non può essere completato.")}
              </p>
            )}

            <Button type="submit" className="w-full rounded-xl" disabled={loading || !ready}>
              {loading ? L("Updating...", "Aggiornamento in corso...") : L("Update password", "Aggiorna password")}
            </Button>

            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4" />
                {L('Back to login', 'Torna al login')}
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}