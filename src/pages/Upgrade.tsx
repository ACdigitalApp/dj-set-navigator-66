import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Check, X, Loader2, CreditCard, Shield, Zap, Music, Headphones } from 'lucide-react';
import { toast } from 'sonner';

export default function UpgradePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');

  const sumupPlan = searchParams.get('sumup_plan');
  const stripeSessionId = sumupPlan ? localStorage.getItem('djs_sumup_checkout_id') : null;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (data && 'plan' in data && (data as any).plan) setUserPlan((data as any).plan);
      }
    });
  }, []);

  const pollStatus = useCallback(async (sessionId: string, attempts: number) => {
    if (attempts >= 8) {
      setPaymentStatus('timeout');
      setPolling(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('sumup-checkout', {
        body: { action: 'status', checkout_id: sessionId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.data?.status === 'paid') {
        localStorage.removeItem('djs_sumup_checkout_id');
        setPaymentStatus('paid');
        setPolling(false);
        toast.success('Pagamento completato! Sei Pro!');
      } else if (res.data?.status === 'failed') {
        setPaymentStatus('expired');
        setPolling(false);
      } else {
        setTimeout(() => pollStatus(sessionId, attempts + 1), 2500);
      }
    } catch {
      setPaymentStatus('error');
      setPolling(false);
    }
  }, [t]);

  useEffect(() => {
    if (stripeSessionId && !polling && !paymentStatus) {
      setPolling(true);
      pollStatus(stripeSessionId, 0);
    }
  }, [stripeSessionId, polling, paymentStatus, pollStatus]);

  async function handleCheckout(plan: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('sumup-checkout', {
        body: { action: 'checkout', plan, origin_url: window.location.origin + '/upgrade' },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.data?.url) {
        localStorage.setItem('djs_sumup_checkout_id', res.data.checkout_id);
        window.location.href = res.data.url;
      } else {
        toast.error(res.data?.error || 'Errore durante il checkout');
        setLoading(false);
      }
    } catch {
      toast.error('Errore durante il checkout');
      setLoading(false);
    }
  }

  const isPro = userPlan === 'pro';

  // Success state
  if (paymentStatus === 'paid' || (stripeSessionId && isPro)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-10 text-center shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Pagamento Completato!</h1>
          <p className="text-muted-foreground mb-6">Ora sei un DJ Pro. Goditi tutte le funzionalita!</p>
          <Button onClick={() => navigate('/dashboard')} className="px-8">
            Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Polling state
  if (polling) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-10 text-center shadow-lg">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-5" />
          <h2 className="text-xl font-bold text-foreground mb-2">Verifica pagamento...</h2>
          <p className="text-muted-foreground">Attendere qualche secondo...</p>
        </div>
      </div>
    );
  }

  // Already pro
  if (isPro && !stripeSessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-10 text-center shadow-lg">
          <Crown className="w-12 h-12 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Sei gia DJ Pro!</h1>
          <p className="text-muted-foreground mb-6">Hai gia accesso a tutte le funzionalita Pro.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Torna alla Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const monthly = { price: '3,99', period: '/mese' };
  const annual = { price: '29,99', period: '/anno', monthly: '2,50' };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Passa a DJ Pro</h1>
            <p className="text-sm text-muted-foreground">Sblocca tutte le funzionalita per i tuoi set</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-card border border-border rounded-xl p-1 inline-flex">
            <button onClick={() => setBilling('monthly')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Mensile
            </button>
            <button onClick={() => setBilling('annual')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${billing === 'annual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Annuale <span className="text-xs ml-1 opacity-80">-37%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-card rounded-2xl border border-border p-7">
            <h3 className="text-lg font-bold text-foreground mb-1">Free</h3>
            <p className="text-sm text-muted-foreground mb-5">Per iniziare a mixare</p>
            <div className="mb-6">
              <span className="text-3xl font-bold text-foreground">&euro;0</span>
              <span className="text-muted-foreground text-sm">{monthly.period}</span>
            </div>
            <ul className="space-y-3 mb-8">
              <Feature ok text="Libreria fino a 50 tracce" />
              <Feature ok text="Analisi BPM e Key" />
              <Feature ok text="1 Crate" />
              <Feature no text="Crate illimitati" />
              <Feature no text="Export VirtualDJ" />
              <Feature no text="Scopri tracce trending" />
              <Feature no text="Raccomandazioni smart" />
            </ul>
            <Button disabled variant="outline" className="w-full">
              Piano attuale
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="bg-card rounded-2xl border-2 border-primary p-7 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
              CONSIGLIATO
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              DJ Pro <Crown className="w-5 h-5 text-warning" />
            </h3>
            <p className="text-sm text-muted-foreground mb-5">Per il DJ che vuole il massimo</p>
            <div className="mb-6">
              {billing === 'monthly' ? (
                <>
                  <span className="text-3xl font-bold text-foreground">&euro;{monthly.price}</span>
                  <span className="text-muted-foreground text-sm">{monthly.period}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-foreground">&euro;{annual.price}</span>
                  <span className="text-muted-foreground text-sm">{annual.period}</span>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">&euro;{annual.monthly}{monthly.period} equivalente</p>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              <Feature ok text="Libreria illimitata" />
              <Feature ok text="Analisi BPM e Key avanzata" />
              <Feature ok text="Crate illimitati" />
              <Feature ok text="Export M3U per VirtualDJ" />
              <Feature ok text="Scopri tracce trending" />
              <Feature ok text="Raccomandazioni smart AI" />
              <Feature ok text="Supporto prioritario" />
            </ul>
            <Button onClick={() => handleCheckout(billing)} disabled={loading}
              className="w-full h-12 font-semibold shadow-md">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5 mr-2" /> Upgrade a DJ Pro</>}
            </Button>
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Pagamento sicuro via SumUp.</span>
        </div>
      </div>
    </div>
  );
}

function Feature({ ok, text }: { ok?: boolean; no?: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {ok ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
      <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{text}</span>
    </li>
  );
}
