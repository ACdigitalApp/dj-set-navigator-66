import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Library, Sparkles, TrendingUp, Sun, Flame, Star as StarIcon,
  CheckCircle2, XCircle, Heart, Clock, Folder, Upload, Loader2, HardDrive, Disc3
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { parseVdjXml, convertKeyToCamelot } from '@/lib/adapters/virtualdj';
import { Progress } from '@/components/ui/progress';
import { fetchExistingTrackKeys, normalizeKey } from '@/lib/dedup';

interface LibrarySidebarProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function LibrarySidebar({ activeFilter, onFilterChange }: LibrarySidebarProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [vdjImporting, setVdjImporting] = useState(false);
  const [vdjProgress, setVdjProgress] = useState(0);

  const handleVdjImport = async () => {
    try {
      let file: File;
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'VirtualDJ Database', accept: { 'text/xml': ['.xml'] } }],
          multiple: false,
        });
        file = await handle.getFile();
      } else {
        file = await new Promise<File>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xml';
          input.onchange = () => {
            if (input.files?.[0]) resolve(input.files[0]);
            else reject(new Error('No file selected'));
          };
          input.click();
        });
      }

      setVdjImporting(true);
      setVdjProgress(0);

      const xmlText = await file.text();
      const vdjTracks = parseVdjXml(xmlText);

      if (vdjTracks.length === 0) {
        toast.warning(t('sources.vdjNoTracks'));
        setVdjImporting(false);
        return;
      }

      // Fetch existing track keys for dedup
      const existingKeys = await fetchExistingTrackKeys();

      const BATCH_SIZE = 50;
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < vdjTracks.length; i += BATCH_SIZE) {
        const batchRaw = vdjTracks.slice(i, i + BATCH_SIZE);
        const batch = batchRaw
          .filter(vt => {
            const key = normalizeKey(vt.title, vt.artist);
            if (existingKeys.has(key)) {
              skipped++;
              return false;
            }
            existingKeys.add(key); // prevent intra-batch dupes
            return true;
          })
          .map(vt => ({
            title: vt.title,
            artist: vt.artist,
            bpm: vt.bpm || null,
            key: convertKeyToCamelot(vt.key),
            genre: vt.genre || null,
            duration: vt.duration || null,
            source: 'virtualdj',
            source_track_id: vt.filePath || null,
            status: 'to_review' as const,
          }));

        if (batch.length > 0) {
          const { error } = await supabase.from('tracks').insert(batch);
          if (error) {
            console.error('Batch insert error:', error);
            errors += batch.length;
          } else {
            imported += batch.length;
          }
        }

        setVdjProgress(Math.round(((i + batchRaw.length) / vdjTracks.length) * 100));
      }

      toast.success(tr(`Imported: ${imported} | Already present (skipped): ${skipped} | Errors: ${errors}`, `Importati: ${imported} | Già presenti (saltati): ${skipped} | Errori: ${errors}`));
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(t('sources.vdjError'));
        console.error(err);
      }
    } finally {
      setVdjImporting(false);
    }
  };

  const LIBRARY_ITEMS = [
    { id: 'all', label: t('sidebar.allTracks'), icon: Library },
    { id: 'new', label: t('sidebar.newArrivals'), icon: Sparkles },
    { id: 'trending', label: t('sidebar.trending'), icon: TrendingUp },
    { id: 'warmup', label: t('sidebar.warmUp'), icon: Sun },
    { id: 'peak', label: t('sidebar.peakTime'), icon: Flame },
    { id: 'riempipista', label: t('sidebar.riempipista'), icon: StarIcon },
    { id: 'to_review', label: t('sidebar.toReview'), icon: Clock },
    { id: 'approved', label: t('sidebar.approved'), icon: CheckCircle2 },
    { id: 'rejected', label: t('sidebar.rejected'), icon: XCircle },
    { id: 'favorites', label: t('sidebar.favorites'), icon: Heart },
  ];

  const SOURCE_ITEMS = [
    { id: 'source_local', label: t('sidebar.localLibrary'), icon: Folder },
    { id: 'source_virtualdj', label: t('sidebar.virtualDj'), icon: Disc3 },
    { id: 'source_tidal', label: 'TIDAL', icon: Folder, placeholder: true },
    { id: 'source_mixupload', label: 'Mixupload', icon: Folder, placeholder: true },
    { id: 'source_other', label: t('sidebar.otherSources'), icon: Folder, placeholder: true },
  ];

  return (
    <div className="w-48 shrink-0 border-r border-border bg-card/50 overflow-y-auto">
      <div className="p-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">{t('sidebar.library')}</h3>
        <div className="space-y-0.5">
          {LIBRARY_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                activeFilter === item.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 pt-0">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">{t('sidebar.sources')}</h3>
        <div className="space-y-0.5">
          {SOURCE_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
                activeFilter === item.id
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                item.placeholder && "opacity-60"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.placeholder && <span className="text-[9px] text-muted-foreground ml-auto">{t('sidebar.soon')}</span>}
            </button>
          ))}

          {/* Import VDJ Library button */}
          <button
            onClick={handleVdjImport}
            disabled={vdjImporting}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left",
              "text-success hover:bg-success/10 font-medium",
              vdjImporting && "opacity-70 cursor-wait"
            )}
          >
            {vdjImporting ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{vdjImporting ? t('sources.vdjImporting') : t('sources.vdjImport')}</span>
          </button>

          {vdjImporting && (
            <div className="px-2 pt-1">
              <Progress value={vdjProgress} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
