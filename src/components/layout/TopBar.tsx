import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Turntable } from '@/components/Turntable';

export function TopBar() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (authenticated === null) return null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 md:px-6 min-h-14 py-2 border-b border-border bg-card shrink-0 z-50">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        <Link to="/" className="flex items-center gap-2">
          <Turntable size="sm" />
          <span className="font-heading font-bold text-foreground text-sm tracking-tight hidden sm:inline">DJ'S ENGINE</span>
          <span className="italic text-[#2D6A4F] text-xs hidden sm:inline ml-1">by AC Digital App</span>
        </Link>
        <a
          href="https://acdigitalapp.it"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#2D6A4F] underline underline-offset-2 hover:text-[#1C6B3B] py-1"
        >
          {lang === 'it' ? 'AC Digital App — Scopri le altre applicazioni' : 'AC Digital App — Discover our other apps'}
        </a>
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {authenticated ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{lang === 'it' ? 'Esci' : 'Sign Out'}</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('home.signIn')}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
