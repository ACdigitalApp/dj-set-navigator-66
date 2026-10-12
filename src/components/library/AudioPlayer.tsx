import { tr } from '@/lib/i18n';
import { useRef, useState, useEffect } from 'react';
import type { Track } from '@/types/track';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateTrack } from '@/hooks/useTracks';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { analyzeAudioFile } from '@/lib/audioAnalysis';

type AudioStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';

interface AudioPlayerProps {
  track: Track | null;
  onNext?: () => void;
  onPrev?: () => void;
}

export function AudioPlayer({ track, onNext, onPrev }: AudioPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const updateTrack = useUpdateTrack();
  const { t } = useI18n();
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
  const [analyzing, setAnalyzing] = useState(false);

  const hasAudio = !!track?.audio_url;

  useEffect(() => {
    setAudioStatus(hasAudio ? 'idle' : 'idle');
  }, [track?.id]);

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !track) return;
    const file = e.target.files[0];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = sanitizedName.split('.').pop();
    const path = `${track.id}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('track-audio')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('track-audio').getPublicUrl(path);
      updateTrack.mutate({ id: track.id, updates: { audio_url: publicUrl } });
      toast.success(t('player.audioUploaded'));

      // Auto-analyze BPM and key
      setAnalyzing(true);
      toast.loading(tr('Analyzing BPM and key...', 'Analisi BPM e tonalità...'), { id: 'audio-analysis-player' });
      try {
        const result = await analyzeAudioFile(file);
        updateTrack.mutate({ id: track.id, updates: { bpm: result.bpm, key: result.key } });
        toast.success(tr(`BPM: ${result.bpm} | Key: ${result.key} detected automatically`, `BPM: ${result.bpm} | Tonalità: ${result.key} rilevati automaticamente`), { id: 'audio-analysis-player' });
      } catch (analysisErr: any) {
        toast.error('Errore analisi audio: ' + analysisErr.message, { id: 'audio-analysis-player' });
      } finally {
        setAnalyzing(false);
      }
    } catch (err: any) {
      toast.error(t('player.uploadError') + ': ' + err.message);
    }
  };

  const handleUploadArtwork = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !track) return;
    const file = e.target.files[0];
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = sanitizedName.split('.').pop();
    const path = `${track.id}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('track-artwork')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('track-artwork').getPublicUrl(path);
      updateTrack.mutate({ id: track.id, updates: { artwork_url: publicUrl } });
      toast.success(t('player.artworkUploaded'));
    } catch (err: any) {
      toast.error(t('player.uploadError') + ': ' + err.message);
    }
  };

  if (!track) return null;

  return (
    <div className="border-t border-border bg-card px-4 py-2 flex items-center gap-4">
      {/* Artwork */}
      <div className="relative group shrink-0">
        <div className="w-12 h-12 rounded bg-secondary overflow-hidden">
          {track.artwork_url ? (
            <img src={track.artwork_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">🎵</div>
          )}
        </div>
        <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded">
          <Upload className="h-4 w-4 text-white" />
          <input type="file" accept="image/*" className="hidden" onChange={handleUploadArtwork} />
        </label>
      </div>

      {/* Track info */}
      <div className="min-w-0 w-32 shrink-0">
        <div className="text-xs font-medium text-foreground truncate">{track.title}</div>
        <div className="text-[10px] text-muted-foreground truncate">{track.artist}</div>
      </div>

      {/* Audio player or upload prompt */}
      {hasAudio ? (
        <audio
          ref={audioRef}
          controls
          src={track.audio_url!}
          onLoadStart={() => setAudioStatus('loading')}
          onCanPlay={() => setAudioStatus('ready')}
          onPlay={() => setAudioStatus('playing')}
          onPause={() => setAudioStatus('paused')}
          onEnded={() => { setAudioStatus('idle'); onNext?.(); }}
          onError={() => {
            setAudioStatus('error');
            toast.error(t('player.noAudio'));
          }}
          className="flex-1 h-8"
          style={{ minWidth: 200 }}
        />
      ) : (
        <div className="flex-1 flex items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors text-xs">
            <Upload className="h-3.5 w-3.5" />
            {t("player.uploadAudio")}
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleUploadAudio} />
          </label>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {t('player.noAudio')}
          </span>
        </div>
      )}

      {/* Audio status indicator */}
      {audioStatus === 'error' && hasAudio && (
        <span className="text-[10px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Error
        </span>
      )}
    </div>
  );
}
