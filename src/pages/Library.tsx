import { tr } from '@/lib/i18n';
import { useState, useMemo, useCallback } from 'react';
import { useTracks, useDeleteTracks } from '@/hooks/useTracks';
import { LibrarySidebar } from '@/components/library/LibrarySidebar';
import { TrackTable } from '@/components/library/TrackTable';
import { TrackFiltersBar } from '@/components/library/TrackFiltersBar';
import { RecommendationPanel } from '@/components/library/RecommendationPanel';
import { AudioPlayer } from '@/components/library/AudioPlayer';
import { useI18n } from '@/lib/i18n';
import type { Track, TrackFilters, SortField, SortDirection } from '@/types/track';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { fetchExistingTrackKeys, normalizeKey } from '@/lib/dedup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function LibraryPage() {
  const { t } = useI18n();
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [filters, setFilters] = useState<TrackFilters>({
    search: '', bpmMin: null, bpmMax: null, key: null, genre: null, energy: null, source: null, status: null,
  });
  const [sortField, setSortField] = useState<SortField>('bpm');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const deleteTracks = useDeleteTracks();

  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    switch (sidebarFilter) {
      case 'to_review': f.status = 'to_review'; break;
      case 'approved': f.status = 'approved'; break;
      case 'rejected': f.status = 'rejected'; break;
      case 'source_local': f.source = 'local'; break;
      case 'source_virtualdj': f.source = 'virtualdj'; break;
      case 'source_tidal': f.source = 'tidal'; break;
      case 'source_mixupload': f.source = 'mixupload'; break;
    }
    return f;
  }, [filters, sidebarFilter]);

  const { data: allTracks = [], isLoading } = useTracks(effectiveFilters, sortField, sortDir);

  const displayTracks = useMemo(() => {
    let tracks = allTracks;
    switch (sidebarFilter) {
      case 'favorites': tracks = tracks.filter(t => t.favorite); break;
      case 'riempipista': tracks = tracks.filter(t => t.riempipista); break;
      case 'new': tracks = tracks.filter(t => (t.freshness_score || 0) >= 7); break;
      case 'trending': tracks = tracks.filter(t => (t.crowd_score || 0) >= 8); break;
      case 'warmup': tracks = tracks.filter(t => (t.energy || 5) <= 5 || (t.bpm || 120) < 120); break;
      case 'peak': tracks = tracks.filter(t => (t.energy || 5) >= 8 || (t.bpm || 120) >= 130); break;
    }
    return tracks;
  }, [allTracks, sidebarFilter]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handlePlayTrack = useCallback((track: Track) => {
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(track);
      setSelectedTrack(track);
    }
  }, [playingTrack]);

  const handleAddToPlaylist = useCallback((track: Track) => {
    toast.info(`${t('action.playlistComingSoon')}: "${track.title}"`);
  }, [t]);

  const handleNextTrack = useCallback(() => {
    const current = playingTrack || selectedTrack;
    if (!current) return;
    const idx = displayTracks.findIndex(t => t.id === current.id);
    if (idx < displayTracks.length - 1) {
      const next = displayTracks[idx + 1];
      setSelectedTrack(next);
      if (playingTrack) setPlayingTrack(next);
    }
  }, [playingTrack, selectedTrack, displayTracks]);

  const handlePrevTrack = useCallback(() => {
    const current = playingTrack || selectedTrack;
    if (!current) return;
    const idx = displayTracks.findIndex(t => t.id === current.id);
    if (idx > 0) {
      const prev = displayTracks[idx - 1];
      setSelectedTrack(prev);
      if (playingTrack) setPlayingTrack(prev);
    }
  }, [playingTrack, selectedTrack, displayTracks]);

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    deleteTracks.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length} ${t('action.deletedMultiple')}`);
        setSelectedIds(new Set());
      },
    });
    setShowDeleteDialog(false);
  };

  const handleNewTrack = () => {
    setNewTitle('');
    setNewArtist('');
    setShowNewDialog(true);
  };

  const confirmNewTrack = async () => {
    if (!newTitle.trim() || !newArtist.trim()) return;
    // Dedup check
    const existing = await fetchExistingTrackKeys();
    if (existing.has(normalizeKey(newTitle, newArtist))) {
      toast.warning(tr('Track already in library (same title + artist)', 'Brano già presente in libreria (stesso titolo + artista)'));
      return;
    }
    const { error } = await supabase.from('tracks').insert({ title: newTitle.trim(), artist: newArtist.trim(), source: 'local', status: 'to_review' });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('action.savedFavorite'));
    }
    setShowNewDialog(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Delete multiple dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('action.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{selectedIds.size} {t('action.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('action.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New track dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.newTrack')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('col.titleArtist').split('/')[0].trim()}</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Track title" />
            </div>
            <div className="grid gap-2">
              <Label>Artist</Label>
              <Input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder="Artist name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={confirmNewTrack} disabled={!newTitle.trim() || !newArtist.trim()}>{t('action.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 min-h-0">
        <LibrarySidebar activeFilter={sidebarFilter} onFilterChange={setSidebarFilter} />
        <div className="flex-1 flex flex-col min-w-0">
          <TrackFiltersBar filters={filters} onChange={setFilters} onNewTrack={handleNewTrack} onDeleteSelected={handleDeleteSelected} selectedCount={selectedIds.size} duplicateIds={duplicateIds} onDuplicatesFound={setDuplicateIds} />
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('general.loading')}</div>
          ) : (
            <TrackTable
              tracks={displayTracks}
              selectedTrackId={selectedTrack?.id || null}
              playingTrackId={playingTrack?.id || null}
              onSelectTrack={setSelectedTrack}
              onPlayTrack={handlePlayTrack}
              onAddToPlaylist={handleAddToPlaylist}
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              duplicateIds={duplicateIds}
            />
          )}
        </div>
        <RecommendationPanel selectedTrack={selectedTrack} allTracks={allTracks} />
      </div>
      <AudioPlayer track={playingTrack || selectedTrack} onNext={handleNextTrack} onPrev={handlePrevTrack} />
    </div>
  );
}
