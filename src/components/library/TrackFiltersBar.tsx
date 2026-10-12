import { tr } from '@/lib/i18n';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { TrackFilters } from '@/types/track';
import { Search, X, Plus, Trash2, Music, Loader2, Copy } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateTrack, useDeleteTracks } from '@/hooks/useTracks';
import { analyzeAudioFile } from '@/lib/audioAnalysis';
import { toast } from 'sonner';
import { findDuplicateGroups } from '@/lib/dedup';
import { useQueryClient } from '@tanstack/react-query';

interface TrackFiltersBarProps {
  filters: TrackFilters;
  onChange: (filters: TrackFilters) => void;
  onNewTrack: () => void;
  onDeleteSelected: () => void;
  selectedCount: number;
  duplicateIds?: Set<string>;
  onDuplicatesFound?: (ids: Set<string>) => void;
}

const KEYS = ['1A','1B','2A','2B','3A','3B','4A','4B','5A','5B','6A','6B','7A','7B','8A','8B','9A','9B','10A','10B','11A','11B','12A','12B'];
const GENRES = ['House','Tech House','Techno','Progressive House','Vocal House','French House','UK Garage','Disco','Nu Disco','Electronica','Electro House','Breaks','Trance','Deep House','Melodic Techno','Downtempo','Dance Pop','EDM'];

export function TrackFiltersBar({ filters, onChange, onNewTrack, onDeleteSelected, selectedCount, duplicateIds, onDuplicatesFound }: TrackFiltersBarProps) {
  const { t } = useI18n();
  const updateTrack = useUpdateTrack();
  const deleteTracks = useDeleteTracks();
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeTotal, setAnalyzeTotal] = useState(0);
  const [analyzeCurrent, setAnalyzeCurrent] = useState(0);
  const [findingDupes, setFindingDupes] = useState(false);

  const update = (partial: Partial<TrackFilters>) => onChange({ ...filters, ...partial });
  const hasFilters = filters.search || filters.key || filters.genre || filters.energy;

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    setAnalyzeProgress(0);
    setAnalyzeCurrent(0);

    try {
      // Fetch tracks with audio but no BPM
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('id, audio_url, bpm, key')
        .not('audio_url', 'is', null)
        .is('bpm', null);

      if (error) throw error;
      if (!tracks || tracks.length === 0) {
        toast.info(tr('No tracks to analyze (all already have BPM or no audio)', 'Nessun brano da analizzare (tutti hanno già BPM o nessun audio)'));
        setAnalyzing(false);
        return;
      }

      setAnalyzeTotal(tracks.length);
      let analyzed = 0;

      for (const track of tracks) {
        setAnalyzeCurrent(analyzed + 1);
        setAnalyzeProgress(Math.round(((analyzed) / tracks.length) * 100));

        try {
          // Fetch audio file
          const response = await fetch(track.audio_url!);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const file = new File([blob], 'audio.mp3', { type: blob.type });

          const result = await analyzeAudioFile(file);
          const updates: Record<string, any> = { bpm: result.bpm };
          if (!track.key) updates.key = result.key;

          updateTrack.mutate({ id: track.id, updates });
          analyzed++;
        } catch (err: any) {
          console.warn(`Analisi fallita per track ${track.id}:`, err.message);
        }

        setAnalyzeProgress(Math.round(((analyzed) / tracks.length) * 100));
      }

      toast.success(`Analisi completata: ${analyzed}/${tracks.length} brani aggiornati`);
    } catch (err: any) {
      toast.error('Errore analisi: ' + err.message);
    } finally {
      setAnalyzing(false);
      setAnalyzeProgress(0);
    }
  };

  const handleFindDuplicates = async () => {
    setFindingDupes(true);
    try {
      const groups = await findDuplicateGroups();
      if (groups.length === 0) {
        toast.info('Nessun duplicato trovato');
        onDuplicatesFound?.(new Set());
        return;
      }
      const allDupeIds = new Set<string>();
      for (const g of groups) {
        for (const id of g.duplicateIds) allDupeIds.add(id);
      }
      onDuplicatesFound?.(allDupeIds);
      toast.info(`Trovati ${groups.length} gruppi di duplicati (${allDupeIds.size} brani da rimuovere)`);
    } catch (err: any) {
      toast.error('Errore: ' + err.message);
    } finally {
      setFindingDupes(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!duplicateIds || duplicateIds.size === 0) return;
    const ids = Array.from(duplicateIds);
    deleteTracks.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length} duplicati eliminati`);
        onDuplicatesFound?.(new Set());
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
      },
    });
  };

  return (
    <div className="flex flex-col border-b border-border bg-card/80">
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('filter.searchTracks')}
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
            className="pl-8 h-8 text-xs bg-secondary border-border"
          />
        </div>

        <Select value={filters.key || 'all'} onValueChange={v => update({ key: v === 'all' ? null : v })}>
          <SelectTrigger className="w-20 h-8 text-xs bg-secondary border-border">
            <SelectValue placeholder={t('col.key')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allKeys')}</SelectItem>
            {KEYS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.genre || 'all'} onValueChange={v => update({ genre: v === 'all' ? null : v })}>
          <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border">
            <SelectValue placeholder={t('col.genre')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter.allGenres')}</SelectItem>
            {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={handleAnalyzeAll}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Music className="h-3.5 w-3.5" />}
          Analizza BPM
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={handleFindDuplicates}
          disabled={findingDupes}
        >
          {findingDupes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          Trova Duplicati
        </Button>

        {duplicateIds && duplicateIds.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDeleteDuplicates}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Elimina {duplicateIds.size} duplicati
          </Button>
        )}

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onNewTrack}>
          <Plus className="h-3.5 w-3.5" />
          {t('action.newTrack')}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('action.deleteSelected')}{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </Button>

        {hasFilters && (
          <button
            onClick={() => onChange({ search: '', bpmMin: null, bpmMax: null, key: null, genre: null, energy: null, source: null, status: null })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> {t('filter.clear')}
          </button>
        )}
      </div>

      {analyzing && (
        <div className="px-2 pb-2 flex items-center gap-2">
          <Progress value={analyzeProgress} className="flex-1 h-2" />
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            Analisi {analyzeCurrent}/{analyzeTotal} brani in corso...
          </span>
        </div>
      )}
    </div>
  );
}
