import { useI18n } from '@/lib/i18n';
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFriendlyAuthErrorMessage } from "@/lib/auth-utils";

export default function ForgotPasswordPage() {
  const { lang } = useI18n();
  const L = (en: string, it: string) => (lang === 'it' ? it : en);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(L("If the email exists, you will receive a link to reset your password.", "Se l'email esiste, riceverai un link per reimpostare la password."));
    } catch (error) {
      toast.error(getFriendlyAuthErrorMessage(error, L("Could not send the link. Please try again.", "Invio link non riuscito. Riprova.")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">{L("Recover password", "Recupera password")}</CardTitle>
          <CardDescription>
            {L("Enter your email and you will receive a link to reset your password.", "Inserisci la tua email e riceverai un link per reimpostare la password.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10"
                  placeholder="nome@dominio.it"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? L("Sending...", "Invio in corso...") : L("Send recovery link", "Invia link di recupero")}
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