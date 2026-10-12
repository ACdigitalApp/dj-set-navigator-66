import { tr } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSettings, useUpsertSetting } from '@/hooks/useSettings';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Save, Globe, User, Key, Crown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import type { RecommendationWeights } from '@/types/track';
import { DEFAULT_WEIGHTS } from '@/types/track';
import type { Language } from '@/lib/i18n';
import vinylLogo from '@/assets/vinyl-logo.avif';

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  
  const { data: settings } = useSettings();
  const upsertSetting = useUpsertSetting();

  const [weights, setWeights] = useState<RecommendationWeights>(DEFAULT_WEIGHTS);
  const [bpmTolerance, setBpmTolerance] = useState(6);
  const [keyStrictness, setKeyStrictness] = useState(70);
  const [energyPreference, setEnergyPreference] = useState(50);
  const [freshnessImportance, setFreshnessImportance] = useState(50);
  const [crowdImportance, setCrowdImportance] = useState(50);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetStep, setResetStep] = useState(0); // 0=idle, 1=first confirm, 2=second confirm
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.display_name || user.email?.split('@')[0] || '');
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
        setIsAdmin(!!data);
      }
    });
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.recommendation_weights) setWeights(settings.recommendation_weights as any);
      if (settings.bpm_tolerance) setBpmTolerance(settings.bpm_tolerance as number);
      if (settings.key_strictness) setKeyStrictness(settings.key_strictness as number);
      if (settings.energy_preference) setEnergyPreference(settings.energy_preference as number);
      if (settings.freshness_importance) setFreshnessImportance(settings.freshness_importance as number);
      if (settings.crowd_importance) setCrowdImportance(settings.crowd_importance as number);
    }
  }, [settings]);

  const handleSave = async () => {
    await upsertSetting.mutateAsync({ key: 'recommendation_weights', value: weights });
    await upsertSetting.mutateAsync({ key: 'bpm_tolerance', value: bpmTolerance });
    await upsertSetting.mutateAsync({ key: 'key_strictness', value: keyStrictness });
    await upsertSetting.mutateAsync({ key: 'energy_preference', value: energyPreference });
    await upsertSetting.mutateAsync({ key: 'freshness_importance', value: freshnessImportance });
    await upsertSetting.mutateAsync({ key: 'crowd_importance', value: crowdImportance });
    toast.success(t('settings.saved'));
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success(t('settings.passwordChanged'));
    setNewPassword('');
    setShowPasswordForm(false);
  };

  const handleResetLibrary = async () => {
    if (resetStep < 2) { setResetStep(s => s + 1); return; }
    setResetting(true);
    const { error } = await supabase.from('tracks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setResetting(false);
    setResetStep(0);
    if (error) { toast.error(error.message); return; }
    toast.success('Libreria resettata con successo');
  };

  const total = weights.bpm + weights.key + weights.energy + weights.affinity + weights.crowd + weights.personalFit;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <img src={vinylLogo} alt="DJSENGINE" className="h-10 w-10 rounded-full animate-spin-slow" />
        <h1 className="text-2xl font-heading font-bold text-primary">{t('settings.title')}</h1>
      </div>

      {/* Profile */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-5">
        <h2 className="text-lg font-heading font-semibold text-primary flex items-center gap-2">
          <User className="h-5 w-5" /> {t('settings.profile')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('settings.profileDesc')}</p>

        <div className="flex items-center gap-4">
          <img src={vinylLogo} alt="Avatar" className="h-16 w-16 rounded-full border-2 border-border" />
          <div>
            <p className="font-medium text-foreground">{userName}</p>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <label className="block text-sm font-medium text-foreground mb-1">Email</label>
          <input
            type="email"
            value={userEmail}
            disabled
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-muted-foreground text-sm"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="font-medium text-foreground">{t('settings.changePassword')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.changePasswordDesc')}</p>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-primary hover:bg-secondary transition-colors"
          >
            <Key className="h-4 w-4" /> {t('settings.changePassword')}
          </button>
        </div>

        {showPasswordForm && (
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={handleChangePassword} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              {t('action.save')}
            </button>
          </div>
        )}

      </section>

      {/* Subscription */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-primary flex items-center gap-2">
          <Crown className="h-5 w-5" /> {t('settings.subscription')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('settings.subscriptionDesc')}</p>
        <div className="bg-secondary rounded-lg p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
            <Crown className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">DJ Pro</p>
            <p className="text-xs text-muted-foreground">{t('settings.fullAccess')}</p>
          </div>
          <button
            onClick={() => navigate('/upgrade')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade
          </button>
        </div>
      </section>

      {/* Language */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-primary flex items-center gap-2">
          <Globe className="h-5 w-5" /> {t('settings.language')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('settings.languageDesc')}</p>
        <div className="flex gap-2">
          {(['en', 'it'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${lang === l ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground border border-border'}`}
            >
              {l === 'en' ? '🇬🇧 English' : '🇮🇹 Italiano'}
            </button>
          ))}
        </div>
      </section>

      {/* Recommendation Weights */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-primary">{t('settings.mixWeights')}</h2>
        <p className="text-xs text-muted-foreground">{t('settings.weightsDesc')} <span className={total === 100 ? 'text-success font-medium' : 'text-warning font-medium'}>{total}%</span></p>
        <div className="space-y-4">
          <WeightSlider label={t('settings.bpmCompat')} value={weights.bpm} onChange={v => setWeights(w => ({ ...w, bpm: v }))} />
          <WeightSlider label={t('settings.keyCompat')} value={weights.key} onChange={v => setWeights(w => ({ ...w, key: v }))} />
          <WeightSlider label={t('settings.energyMatch')} value={weights.energy} onChange={v => setWeights(w => ({ ...w, energy: v }))} />
          <WeightSlider label={t('settings.soundAffinity')} value={weights.affinity} onChange={v => setWeights(w => ({ ...w, affinity: v }))} />
          <WeightSlider label={t('settings.crowdScore')} value={weights.crowd} onChange={v => setWeights(w => ({ ...w, crowd: v }))} />
          <WeightSlider label={t('settings.personalFit')} value={weights.personalFit} onChange={v => setWeights(w => ({ ...w, personalFit: v }))} />
        </div>
      </section>

      {/* Other Settings */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-primary">{t('settings.preferences')}</h2>
        <SettingSlider label={t('settings.bpmTolerance')} value={bpmTolerance} min={1} max={20} onChange={setBpmTolerance} unit=" BPM" />
        <SettingSlider label={t('settings.keyStrictness')} value={keyStrictness} min={0} max={100} onChange={setKeyStrictness} unit="%" />
        <SettingSlider label={t('settings.energyPref')} value={energyPreference} min={0} max={100} onChange={setEnergyPreference} unit="%" />
        <SettingSlider label={t('settings.freshnessImportance')} value={freshnessImportance} min={0} max={100} onChange={setFreshnessImportance} unit="%" />
        <SettingSlider label={t('settings.crowdImportance')} value={crowdImportance} min={0} max={100} onChange={setCrowdImportance} unit="%" />
      </section>

      {isAdmin && (
        <section className="bg-card rounded-xl border border-destructive/30 p-6 space-y-4">
          <h2 className="text-lg font-heading font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Zona Pericolosa
          </h2>
          <p className="text-xs text-muted-foreground">{tr('Delete all tracks from the library. This action cannot be undone.', 'Elimina tutti i brani dalla libreria. Questa azione è irreversibile.')}</p>
          <div className="flex items-center gap-3">
            {resetStep === 0 && (
              <button
                onClick={() => setResetStep(1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Resetta Libreria
              </button>
            )}
            {resetStep === 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-warning font-medium">Sei sicuro?</span>
                <button onClick={handleResetLibrary} className="px-4 py-2 rounded-lg bg-destructive/20 text-destructive text-sm font-medium hover:bg-destructive/30 transition-colors">
                  {tr('Yes, continue', 'Sì, continua')}
                </button>
                <button onClick={() => setResetStep(0)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  Annulla
                </button>
              </div>
            )}
            {resetStep === 2 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive font-bold">⚠️ ULTIMA CONFERMA — tutti i brani verranno eliminati!</span>
                <button onClick={handleResetLibrary} disabled={resetting} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50">
                  {resetting ? 'Eliminazione...' : 'Elimina tutto'}
                </button>
                <button onClick={() => setResetStep(0)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  Annulla
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Save className="h-4 w-4" /> {t('settings.save')}
      </button>
    </div>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={0} max={50} step={1} className="flex-1" />
      <span className="font-mono text-xs text-foreground w-10 text-right">{value}%</span>
    </div>
  );
}

function SettingSlider({ label, value, min, max, onChange, unit }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-muted-foreground w-52 shrink-0">{label}</span>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} className="flex-1" />
      <span className="font-mono text-xs text-foreground w-16 text-right">{value}{unit}</span>
    </div>
  );
}
