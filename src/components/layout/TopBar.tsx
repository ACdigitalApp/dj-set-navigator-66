import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Turntable } from '@/components/Turntable';

export function TopBar() {
  const { t } = useI18n();
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
    <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card shrink-0 z-50">
      <Link to="/" className="flex items-center gap-2">
        <Turntable size="sm" />
        <span className="font-heading font-bold text-foreground text-sm tracking-tight hidden sm:inline">DJ'S ENGINE</span>
        <span className="italic text-[#2D6A4F] text-xs hidden sm:inline ml-1">by AC Digital App</span>
      </Link>

      <div className="flex items-center gap-2">
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
            <span className="hidden sm:inline">Sign Out</span>
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
