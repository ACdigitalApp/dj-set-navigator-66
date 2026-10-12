import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 'en' | 'it';

const translations = {
  // Navigation
  'nav.dashboard': { en: 'Dashboard', it: 'Dashboard' },
  'nav.library': { en: 'Library', it: 'Libreria' },
  'nav.smartCrates': { en: 'Smart Crates', it: 'Crate Intelligenti' },
  'nav.sources': { en: 'Sources', it: 'Sorgenti' },
  'nav.settings': { en: 'Settings', it: 'Impostazioni' },
  'nav.userManagement': { en: 'User Management', it: 'Gestione Utenti' },
  'nav.bankDetails': { en: 'Bank Details', it: 'Dati Bancari' },

  // Home / Landing
  'home.features': { en: 'Features', it: 'Funzioni' },
  'home.benefits': { en: 'Benefits', it: 'Vantaggi' },
  'home.signIn': { en: 'Sign In', it: 'Accedi' },
  'home.startFree': { en: 'Start Free', it: 'Inizia Gratis' },
  'home.heroTitle1': { en: 'Organize your music', it: 'Organizza la tua musica' },
  'home.heroTitleHighlight': { en: 'like a pro DJ', it: 'come un DJ professionista' },
  'home.heroTitle2': { en: '', it: '' },
  'home.heroSubtitle': { en: 'Manage playlists, select the best tracks, find the most compatible mixes and keep your library always up to date.', it: 'Gestisci playlist, seleziona i brani migliori, trova i mix più compatibili e mantieni la tua libreria sempre aggiornata.' },
  'home.card1Title': { en: 'Music Selection', it: 'Selezione Musicale' },
  'home.card1Desc': { en: 'Organize tracks, playlists and library with smart filters for BPM, key, energy and compatibility.', it: 'Organizza tracce, playlist e libreria con filtri intelligenti per BPM, key, energia e compatibilità.' },
  'home.card2Title': { en: 'Smart Recommendations', it: 'Raccomandazioni Intelligenti' },
  'home.card2Desc': { en: 'Get suggestions for the next best track based on mix, style, energy and sound affinity.', it: 'Ricevi suggerimenti sul prossimo brano più adatto in base a mix, stile, energia e affinità sonora.' },
  'home.card3Title': { en: 'Always Updated Library', it: 'Libreria Sempre Aggiornata' },
  'home.card3Desc': { en: 'Keep control of your selections, discover useful new tracks and prepare more effective sets.', it: 'Mantieni il controllo delle tue selezioni, scopri novità utili e prepara set più efficaci.' },
  'home.infoTag': { en: 'PORTABLE APP', it: 'APP PORTATILE' },
  'home.infoTitle': { en: 'Take your music selection everywhere', it: 'Porta la tua selezione musicale sempre con te' },
  'home.infoBullet1': { en: 'Quick access to your library', it: 'Accesso rapido alla libreria' },
  'home.infoBullet2': { en: 'Playlists and crates always available', it: 'Playlist e crate sempre disponibili' },
  'home.infoBullet3': { en: 'Useful tools to choose the next track', it: 'Strumenti utili per scegliere il prossimo brano' },
  'home.infoBullet4': { en: 'Clean and optimized experience', it: 'Esperienza pulita e ottimizzata' },
  'home.ctaTitle': { en: 'Ready to improve your music selection?', it: 'Pronto a migliorare la tua selezione musicale?' },
  'home.ctaSubtitle': { en: 'Access your library, organize tracks and build smarter sets.', it: 'Accedi alla tua libreria, organizza i brani e costruisci set più intelligenti.' },
  'home.registerFree': { en: 'Register Free', it: 'Registrati Gratis' },

  // Auth
  'auth.welcomeBack': { en: 'Welcome Back!', it: 'Bentornato!' },
  'auth.createAccount': { en: 'Create Account', it: 'Crea Account' },
  'auth.loginSubtitle': { en: 'Sign in to manage your music', it: 'Accedi per gestire la tua musica' },
  'auth.signupSubtitle': { en: 'Register to get started', it: 'Registrati per iniziare' },
  'auth.login': { en: 'Sign In', it: 'Accedi' },
  'auth.signup': { en: 'Register', it: 'Registrati' },
  'auth.forgotPassword': { en: 'Forgot password?', it: 'Non ricordi la password?' },
  'auth.noAccount': { en: "Don't have an account?", it: 'Non hai un account?' },
  'auth.hasAccount': { en: 'Already have an account?', it: 'Hai già un account?' },
  'auth.loginSuccess': { en: 'Logged in!', it: 'Accesso effettuato!' },
  'auth.signupSuccess': { en: 'Check your email to confirm', it: 'Controlla la tua email per confermare' },
  'auth.name': { en: 'Name', it: 'Nome' },
  'auth.namePlaceholder': { en: 'Your name', it: 'Il tuo nome' },
  'auth.confirmPassword': { en: 'Confirm Password', it: 'Conferma Password' },
  'auth.passwordMismatch': { en: 'Passwords do not match', it: 'Le password non corrispondono' },

  // Errors
  'error.forbidden': { en: 'Access Denied', it: 'Accesso Negato' },
  'error.forbiddenDesc': { en: 'You do not have permission to access this page. Contact an administrator.', it: 'Non hai i permessi per accedere a questa pagina. Contatta un amministratore.' },
  'error.goBack': { en: 'Go to Library', it: 'Vai alla Libreria' },

  // Library sidebar
  'sidebar.library': { en: 'Library', it: 'Libreria' },
  'sidebar.allTracks': { en: 'All Tracks', it: 'Tutti i Brani' },
  'sidebar.newArrivals': { en: 'New Arrivals', it: 'Nuovi Arrivi' },
  'sidebar.trending': { en: 'Trending', it: 'Tendenze' },
  'sidebar.warmUp': { en: 'Warm Up', it: 'Riscaldamento' },
  'sidebar.peakTime': { en: 'Peak Time', it: 'Momento Clou' },
  'sidebar.riempipista': { en: 'Riempipista', it: 'Riempipista' },
  'sidebar.toReview': { en: 'To Review', it: 'Da Valutare' },
  'sidebar.approved': { en: 'Approved', it: 'Approvati' },
  'sidebar.rejected': { en: 'Rejected', it: 'Rifiutati' },
  'sidebar.favorites': { en: 'Favorites', it: 'Preferiti' },
  'sidebar.sources': { en: 'Sources', it: 'Sorgenti' },
  'sidebar.localLibrary': { en: 'Local Library', it: 'Libreria Locale' },
  'sidebar.otherSources': { en: 'Other Sources', it: 'Altre Sorgenti' },
  'sidebar.virtualDj': { en: 'Virtual DJ', it: 'Virtual DJ' },
  'sidebar.soon': { en: 'Soon', it: 'Presto' },

  // Track table columns
  'col.titleArtist': { en: 'Title / Artist', it: 'Titolo / Artista' },
  'col.bpm': { en: 'BPM', it: 'BPM' },
  'col.key': { en: 'Key', it: 'Tonalità' },
  'col.energy': { en: 'Energy', it: 'Energia' },
  'col.genre': { en: 'Genre', it: 'Genere' },
  'col.affinity': { en: 'Affinity', it: 'Affinità' },
  'col.crowd': { en: 'Crowd', it: 'Crowd' },
  'col.fresh': { en: 'Fresh', it: 'Novità' },
  'col.fit': { en: 'Fit', it: 'Fit' },
  'col.source': { en: 'Source', it: 'Sorgente' },
  'col.status': { en: 'Status', it: 'Stato' },

  // Filters
  'filter.searchTracks': { en: 'Search tracks...', it: 'Cerca brani...' },
  'filter.bpmMin': { en: 'BPM min', it: 'BPM min' },
  'filter.bpmMax': { en: 'BPM max', it: 'BPM max' },
  'filter.allKeys': { en: 'All Keys', it: 'Tutte le Tonalità' },
  'filter.allGenres': { en: 'All Genres', it: 'Tutti i Generi' },
  'filter.clear': { en: 'Clear', it: 'Pulisci' },

  // Status
  'status.approved': { en: 'Approved', it: 'Approvato' },
  'status.rejected': { en: 'Rejected', it: 'Rifiutato' },
  'status.toReview': { en: 'To Review', it: 'Da Valutare' },

  // Recommendation panel
  'rec.selectedTrack': { en: 'Selected Track', it: 'Brano Selezionato' },
  'rec.bestFor': { en: 'Best for', it: 'Ideale per' },
  'rec.recommendedNext': { en: 'Recommended Next', it: 'Consigliati Dopo' },
  'rec.moreOptions': { en: 'More options', it: 'Altre opzioni' },
  'rec.selectTrack': { en: 'Select a track to see recommendations', it: 'Seleziona un brano per le raccomandazioni' },

  // Recommendation reasons
  'reason.bpmMatch': { en: 'BPM match', it: 'BPM compatibile' },
  'reason.keyMatch': { en: 'Key match', it: 'Tonalità compatibile' },
  'reason.keyCompatible': { en: 'Key compatible', it: 'Tonalità affine' },
  'reason.sameEnergy': { en: 'Same energy', it: 'Stessa energia' },
  'reason.energyUp': { en: 'Energy up', it: 'Energia in salita' },
  'reason.energyDown': { en: 'Energy down', it: 'Energia in discesa' },
  'reason.highCrowd': { en: 'High crowd', it: 'Alto potenziale crowd' },
  'reason.highAffinity': { en: 'High affinity', it: 'Alta affinità' },
  'reason.fresh': { en: 'Fresh pick', it: 'Novità fresca' },
  'reason.sameGenre': { en: 'Same genre', it: 'Stesso genere' },

  // Actions
  'action.approve': { en: 'Approve', it: 'Approva' },
  'action.reject': { en: 'Reject', it: 'Rifiuta' },
  'action.favorite': { en: 'Favorite', it: 'Preferito' },
  'action.riempipista': { en: 'Riempipista', it: 'Riempipista' },
  'action.save': { en: 'Save', it: 'Salva' },
  'action.addToPlaylist': { en: 'Add to playlist', it: 'Aggiungi a playlist' },
  'action.removeFavorite': { en: 'Remove from favorites', it: 'Rimuovi dai preferiti' },
  'action.savedFavorite': { en: 'Saved to favorites', it: 'Salvato nei preferiti' },
  'action.removedFavorite': { en: 'Removed from favorites', it: 'Rimosso dai preferiti' },
  'action.playlistComingSoon': { en: 'Playlist: coming soon', it: 'Playlist: in arrivo' },
  'action.newTrack': { en: 'New', it: 'Nuovo' },
  'action.deleteSelected': { en: 'Delete', it: 'Elimina' },
  'action.deleteConfirmTitle': { en: 'Delete tracks?', it: 'Eliminare i brani?' },
  'action.deleteConfirmDesc': { en: 'This action cannot be undone. The selected tracks will be permanently removed.', it: 'Questa azione non può essere annullata. I brani selezionati verranno rimossi definitivamente.' },
  'action.cancel': { en: 'Cancel', it: 'Annulla' },
  'action.confirm': { en: 'Confirm', it: 'Conferma' },
  'action.deleted': { en: 'Track deleted', it: 'Brano eliminato' },
  'action.deletedMultiple': { en: 'tracks deleted', it: 'brani eliminati' },
  'action.download': { en: 'Download audio', it: 'Scarica audio' },
  'action.noAudioDownload': { en: 'No audio to download', it: 'Nessun audio da scaricare' },
  'action.deleteTrack': { en: 'Delete track', it: 'Elimina brano' },

  // Audio player
  'player.uploadAudio': { en: 'Upload audio', it: 'Carica audio' },
  'player.audioUploaded': { en: 'Audio uploaded!', it: 'Audio caricato!' },
  'player.artworkUploaded': { en: 'Artwork uploaded!', it: 'Copertina caricata!' },
  'player.uploadError': { en: 'Upload error', it: 'Errore upload' },
  'player.noAudio': { en: 'No audio', it: 'Nessun audio' },

  // Dashboard
  'dash.title': { en: 'Dashboard', it: 'Dashboard' },
  'dash.subtitle': { en: 'Your music selection overview', it: 'Panoramica della tua selezione musicale' },
  'dash.totalTracks': { en: 'Total Tracks', it: 'Brani Totali' },
  'dash.newRecommended': { en: 'New Recommended', it: 'Nuovi Consigliati' },
  'dash.highCrowd': { en: 'High Crowd', it: 'Alto Crowd' },
  'dash.toReview': { en: 'To Review', it: 'Da Valutare' },
  'dash.approved': { en: 'Approved', it: 'Approvati' },
  'dash.rejected': { en: 'Rejected', it: 'Rifiutati' },
  'dash.topRecommended': { en: 'Top Recommended New', it: 'Top Nuovi Consigliati' },
  'dash.bestWarmup': { en: 'Best Warm-Up', it: 'Migliori Warm-Up' },
  'dash.peakBangers': { en: 'Peak Time Bangers', it: 'Hit da Peak Time' },
  'dash.noTracks': { en: 'No tracks yet', it: 'Nessun brano ancora' },

  // Settings
  'settings.title': { en: 'Settings', it: 'Impostazioni' },
  'settings.subtitle': { en: 'Configure recommendation engine parameters', it: 'Configura i parametri del motore di raccomandazione' },
  'settings.mixWeights': { en: 'Mix Compatibility Weights', it: 'Pesi Compatibilità Mix' },
  'settings.weightsDesc': { en: 'Adjust how much each factor influences the compatibility score. Total:', it: 'Regola quanto ogni fattore influenza il punteggio di compatibilità. Totale:' },
  'settings.bpmCompat': { en: 'BPM Compatibility', it: 'Compatibilità BPM' },
  'settings.keyCompat': { en: 'Key Compatibility', it: 'Compatibilità Tonalità' },
  'settings.energyMatch': { en: 'Energy Match', it: 'Corrispondenza Energia' },
  'settings.soundAffinity': { en: 'Sound Affinity', it: 'Affinità Sonora' },
  'settings.crowdScore': { en: 'Crowd Score', it: 'Punteggio Crowd' },
  'settings.personalFit': { en: 'Personal Fit', it: 'Compatibilità Personale' },
  'settings.preferences': { en: 'Preferences', it: 'Preferenze' },
  'settings.bpmTolerance': { en: 'BPM Tolerance Range', it: 'Tolleranza BPM' },
  'settings.keyStrictness': { en: 'Key Compatibility Strictness', it: 'Rigidità Compatibilità Tonalità' },
  'settings.energyPref': { en: 'Energy Preference (low→high)', it: 'Preferenza Energia (bassa→alta)' },
  'settings.freshnessImportance': { en: 'Freshness Importance', it: 'Importanza Novità' },
  'settings.crowdImportance': { en: 'Crowd Score Importance', it: 'Importanza Punteggio Crowd' },
  'settings.save': { en: 'Save Settings', it: 'Salva Impostazioni' },
  'settings.saved': { en: 'Settings saved', it: 'Impostazioni salvate' },
  'settings.language': { en: 'Language', it: 'Lingua' },
  'settings.languageDesc': { en: 'Choose the app language', it: 'Scegli la lingua dell\'app' },
  'settings.profile': { en: 'Profile', it: 'Profilo' },
  'settings.profileDesc': { en: 'Your account information', it: 'Informazioni del tuo account' },
  'settings.changePassword': { en: 'Change Password', it: 'Cambia Password' },
  'settings.changePasswordDesc': { en: 'Update your account password', it: 'Modifica la password del tuo account' },
  'settings.passwordChanged': { en: 'Password updated', it: 'Password aggiornata' },
  'settings.logout': { en: 'Sign Out', it: 'Esci' },
  'settings.logoutDesc': { en: 'Disconnect your account', it: 'Disconnetti il tuo account' },
  'settings.subscription': { en: 'Subscription', it: 'Abbonamento' },
  'settings.subscriptionDesc': { en: 'Manage your plan and billing', it: 'Gestisci il tuo piano e la fatturazione' },
  'settings.fullAccess': { en: 'Full access', it: 'Accesso completo' },

  // Crates
  'crates.title': { en: 'Smart Crates', it: 'Crate Intelligenti' },
  'crates.subtitle': { en: 'Auto-organized collections based on scoring rules', it: 'Collezioni automatiche basate su regole di punteggio' },
  'crates.warmUp': { en: 'Warm Up', it: 'Riscaldamento' },
  'crates.warmUpDesc': { en: 'Low energy, smooth openers', it: 'Bassa energia, aperture fluide' },
  'crates.primeTime': { en: 'Prime Time', it: 'Ora di Punta' },
  'crates.primeTimeDesc': { en: 'Building momentum', it: 'Costruzione del momento' },
  'crates.peakTime': { en: 'Peak Time', it: 'Momento Clou' },
  'crates.peakTimeDesc': { en: 'Maximum energy bangers', it: 'Hit ad alta energia' },
  'crates.closing': { en: 'Closing', it: 'Chiusura' },
  'crates.closingDesc': { en: 'Wind down tracks', it: 'Brani per chiudere' },
  'crates.newHeat': { en: 'New Heat', it: 'Novità Hot' },
  'crates.newHeatDesc': { en: 'Fresh high-scoring tracks', it: 'Novità con punteggio alto' },
  'crates.safeMix': { en: 'Safe Mix', it: 'Mix Sicuro' },
  'crates.safeMixDesc': { en: 'Proven crowd pleasers', it: 'Successi comprovati per il pubblico' },
  'crates.energyUp': { en: 'Energy Up', it: 'Energia Su' },
  'crates.energyUpDesc': { en: 'Tracks to raise energy', it: 'Brani per alzare l\'energia' },
  'crates.riempipista': { en: 'Riempipista', it: 'Riempipista' },
  'crates.riempipistaDesc': { en: 'Guaranteed floor fillers', it: 'Riempi pista garantiti' },
  'crates.similarFav': { en: 'Similar to Favorites', it: 'Simili ai Preferiti' },
  'crates.similarFavDesc': { en: 'Matches your top picks', it: 'Corrispondenze con le tue scelte' },
  'crates.highCompat': { en: 'High Compatibility', it: 'Alta Compatibilità' },
  'crates.highCompatDesc': { en: 'Best mixing candidates', it: 'Migliori candidati per il mix' },
  'crates.gems': { en: 'Underused Gems', it: 'Gemme Nascoste' },
  'crates.gemsDesc': { en: 'Great tracks, rarely played', it: 'Ottimi brani, raramente suonati' },
  'crates.moreTracks': { en: 'more tracks', it: 'altri brani' },
  'crates.noTracks': { en: 'No matching tracks', it: 'Nessun brano trovato' },

  // Sources
  'sources.title': { en: 'Sources', it: 'Sorgenti' },
  'sources.subtitle': { en: 'Music source adapters and integrations', it: 'Adattatori e integrazioni sorgenti musicali' },
  'sources.active': { en: 'Active', it: 'Attivo' },
  'sources.placeholder': { en: 'Placeholder', it: 'Segnaposto' },
  'sources.activeDesc': { en: 'Connected and active. Tracks are imported from your local files.', it: 'Connesso e attivo. I brani vengono importati dai tuoi file locali.' },
  'sources.placeholderDesc': { en: 'This adapter is a placeholder for future integration. No real data connection exists yet.', it: 'Questo adattatore è un segnaposto per integrazioni future. Nessuna connessione reale.' },
  'sources.mockWarning': { en: 'This is a mock adapter. It returns demo data only. Real API integration requires proper credentials and legal access.', it: 'Questo è un adattatore fittizio. Restituisce solo dati demo. L\'integrazione API reale richiede credenziali e accesso legale.' },
  'sources.adapterMethods': { en: 'Adapter methods', it: 'Metodi adattatore' },
  'sources.archNotes': { en: 'Architecture Notes', it: 'Note Architettura' },
  'sources.archDesc': { en: 'Each source adapter implements a common interface with methods for fetching trending tracks, new releases, searching, and mapping external data to the internal track model. The adapter pattern allows adding new sources without modifying existing code. Placeholder adapters return mock data and are clearly marked as non-functional.', it: 'Ogni adattatore sorgente implementa un\'interfaccia comune con metodi per ottenere brani in tendenza, nuove uscite, ricerca e mappatura dei dati esterni nel modello interno. Il pattern adapter consente di aggiungere nuove sorgenti senza modificare il codice esistente.' },
  'sources.connectTidal': { en: 'Connect TIDAL', it: 'Connetti TIDAL' },
  'sources.disconnectTidal': { en: 'Disconnect TIDAL', it: 'Disconnetti TIDAL' },
  'sources.tidalConnected': { en: 'TIDAL connected!', it: 'TIDAL connesso!' },
  'sources.tidalDisconnected': { en: 'TIDAL disconnected', it: 'TIDAL disconnesso' },
  'sources.tidalError': { en: 'TIDAL connection error', it: 'Errore connessione TIDAL' },
  'sources.tidalDesc': { en: 'Connect your TIDAL account to search and import tracks.', it: 'Connetti il tuo account TIDAL per cercare e importare brani.' },
  'sources.connecting': { en: 'Connecting...', it: 'Connessione...' },
  'sources.tidalSearch': { en: 'Search TIDAL', it: 'Cerca su TIDAL' },
  'sources.tidalSearchPlaceholder': { en: 'Search tracks on TIDAL...', it: 'Cerca brani su TIDAL...' },
  'sources.search': { en: 'Search', it: 'Cerca' },
  'sources.import': { en: 'Import', it: 'Importa' },
  'sources.imported': { en: 'imported to library', it: 'importato in libreria' },
  'sources.vdjImport': { en: 'Import VDJ Library', it: 'Importa Libreria VDJ' },
  'sources.vdjDesc': { en: 'Import tracks from your VirtualDJ database.xml file.', it: 'Importa brani dal tuo file database.xml di VirtualDJ.' },
  'sources.vdjImporting': { en: 'Importing...', it: 'Importazione...' },
  'sources.vdjSuccess': { en: 'tracks imported from VirtualDJ', it: 'brani importati da VirtualDJ' },
  'sources.vdjError': { en: 'Error importing VDJ library', it: 'Errore importazione libreria VDJ' },
  'sources.vdjNoTracks': { en: 'No tracks found in the file', it: 'Nessun brano trovato nel file' },
  'sources.vdjProgress': { en: 'Importing tracks', it: 'Importazione brani' },

  // Track detail
  'detail.backToLibrary': { en: 'Back to Library', it: 'Torna alla Libreria' },
  'detail.duration': { en: 'Duration', it: 'Durata' },
  'detail.recommendedNext': { en: 'Recommended Next', it: 'Consigliati Dopo' },

  // Use cases
  'useCase.warmUp': { en: 'Warm Up', it: 'Riscaldamento' },
  'useCase.midSet': { en: 'Mid Set', it: 'Mid Set' },
  'useCase.peakTime': { en: 'Peak Time', it: 'Momento Clou' },
  'useCase.closing': { en: 'Closing', it: 'Chiusura' },

  // Admin / User Management
  'admin.title': { en: 'User Management', it: 'Gestione Utenti' },
  'admin.subtitle': { en: 'Manage users, plans and revenue', it: 'Amministra utenti, piani e incassi' },
  'admin.refresh': { en: 'Refresh', it: 'Aggiorna' },
  'admin.newUser': { en: 'New User', it: 'Nuovo Utente' },
  'admin.totalRevenue': { en: 'Total Revenue', it: 'Incasso Totale' },
  'admin.totalBalance': { en: 'Total Balance', it: 'Saldo Totale' },
  'admin.payingUsers': { en: 'Paying Users', it: 'Utenti Paganti' },
  'admin.last30Days': { en: 'Last 30 Days', it: 'Ultimi 30gg' },
  'admin.activeTrial': { en: 'Active Trial', it: 'Trial Attive' },
  'admin.expired': { en: 'Expired', it: 'Scaduti' },
  'admin.searchPlaceholder': { en: 'Search name or email...', it: 'Cerca nome o email...' },
  'admin.registeredUsers': { en: 'Registered Users', it: 'Utenti Registrati' },
  'admin.colName': { en: 'Name', it: 'Nome' },
  'admin.colRole': { en: 'Role', it: 'Ruolo' },
  'admin.colRegDate': { en: 'Reg. Date', it: 'Data Reg.' },
  'admin.colLastAccess': { en: 'Last Access', it: 'Ultimo Accesso' },

  // Bank Details
  'bank.title': { en: 'My Bank Details', it: 'I Miei Dati Bancari' },
  'bank.subtitle': { en: 'Manage bank coordinates and transactions', it: 'Gestione coordinate bancarie e transazioni' },
  'bank.adminArea': { en: 'Admin Area', it: 'Area Protetta Admin' },
  'bank.coordinates': { en: 'Coordinates', it: 'Coordinate' },
  'bank.transactions': { en: 'Transactions', it: 'Transazioni' },
  'bank.bankCoordinates': { en: 'Bank Coordinates', it: 'Coordinate Bancarie' },
  'bank.bankCoordinatesDesc': { en: 'Your coordinates for receiving payments', it: 'Le tue coordinate per ricevere pagamenti' },
  'bank.edit': { en: 'Edit', it: 'Modifica' },
  'bank.holder': { en: 'Holder', it: 'Intestatario' },
  'bank.bank': { en: 'Bank', it: 'Banca' },
  'bank.bankAddress': { en: 'Bank Address', it: 'Indirizzo Banca' },
  'bank.noTransactions': { en: 'No transactions yet', it: 'Nessuna transazione' },
  'bank.noLogs': { en: 'No log entries', it: 'Nessun registro' },

  // Discover
  'discover.title': { en: 'Discover', it: 'Scopri' },
  'discover.subtitle': { en: 'Find trending tracks and add them to your library', it: 'Trova brani in tendenza e aggiungili alla tua libreria' },
  'discover.allGenres': { en: 'All Genres', it: 'Tutti i Generi' },
  'discover.search': { en: 'Search', it: 'Cerca' },
  'discover.addToLibrary': { en: 'Add to Library', it: 'Aggiungi alla Libreria' },
  'discover.exportM3U': { en: 'Export VDJ', it: 'Esporta VDJ' },
  'discover.importing': { en: 'Importing', it: 'Importazione in corso' },
  'discover.importDone': { en: 'Import complete', it: 'Importazione completata' },
  'discover.imported': { en: 'Imported', it: 'Importati' },
  'discover.skipped': { en: 'Skipped', it: 'Saltati' },
  'discover.errors': { en: 'Errors', it: 'Errori' },
  'discover.noResults': { en: 'No tracks found', it: 'Nessun brano trovato' },
  'discover.error': { en: 'Search error', it: 'Errore di ricerca' },
  'discover.m3uExported': { en: 'M3U exported!', it: 'M3U esportato!' },
  'discover.m3uHint': { en: 'Drag the .m3u file into VirtualDJ to import', it: 'Trascina il file .m3u in VirtualDJ per importare' },
  'discover.colTitle': { en: 'Title', it: 'Titolo' },
  'discover.colArtist': { en: 'Artist', it: 'Artista' },
  'discover.colPopularity': { en: 'Popularity', it: 'Popolarità' },

  // Navigation
  'nav.discover': { en: 'Discover', it: 'Scopri' },

  // General
  'general.loading': { en: 'Loading...', it: 'Caricamento...' },
  'general.noTracks': { en: 'No tracks found', it: 'Nessun brano trovato' },
  'general.trackNotFound': { en: 'Track not found', it: 'Brano non trovato' },
} as const;

type TranslationKey = keyof typeof translations;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('dj-engine-lang');
    return (saved === 'it' || saved === 'en') ? saved : 'en';
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem('dj-engine-lang', l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Non-hook translator for toasts/handlers; reads the saved preference (default English). */
export function tr(en: string, it: string): string {
  try { return localStorage.getItem('dj-engine-lang') === 'it' ? it : en; } catch { return en; }
}
