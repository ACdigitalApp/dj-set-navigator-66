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
  { key: "length", label: "Almeno 12 caratteri" },
  { key: "upper", label: "Almeno una lettera maiuscola" },
  { key: "lower", label: "Almeno una lettera minuscola" },
  { key: "number", label: "Almeno un numero" },
  { key: "symbol", label: "Almeno un simbolo" },
] as const;

export default function ResetPasswordPage() {
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
      toast.error("Link di recupero non valido o scaduto.");
      return;
    }

    if (!validation.valid) {
      toast.error("La password deve rispettare tutti i requisiti di sicurezza.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Le password non coincidono.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password aggiornata correttamente. Ora puoi accedere.");
      navigate("/auth", { replace: true });
    } catch (error) {
      toast.error(getFriendlyAuthErrorMessage(error, "Aggiornamento password non riuscito. Riprova."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">Reimposta password</CardTitle>
          <CardDescription>
            Inserisci una nuova password sicura per completare il recupero dell’account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Nuova password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Inserisci una password forte"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Conferma password</label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ripeti la nuova password"
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
                    <span className={passed ? 'text-foreground' : 'text-muted-foreground'}>{rule.label}</span>
                  </div>
                );
              })}
            </div>

            {!ready && (
              <p className="text-sm text-destructive">
                Apri questa pagina usando il link ricevuto via email, altrimenti il reset non può essere completato.
              </p>
            )}

            <Button type="submit" className="w-full rounded-xl" disabled={loading || !ready}>
              {loading ? "Aggiornamento in corso..." : "Aggiorna password"}
            </Button>

            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/auth">
                <ArrowLeft className="h-4 w-4" />
                Torna al login
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}