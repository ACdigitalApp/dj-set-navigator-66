import { useI18n, type Language } from '@/lib/i18n';

const OPTIONS: { code: Language; flag: string; label: string }[] = [
  { code: 'it', flag: '🇮🇹', label: 'Italiano' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center rounded-lg border border-border bg-secondary/40 p-0.5" role="group" aria-label="Language">
      {OPTIONS.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => setLang(o.code)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={lang === o.code}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            lang === o.code ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="text-base leading-none">{o.flag}</span>
          <span className="hidden md:inline">{o.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
