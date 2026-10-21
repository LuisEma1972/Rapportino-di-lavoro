# Rapportino — dati su Drive, PDF sul telefono

## Aggiornamento
Caricare TUTTO il contenuto di questa cartella nel sito esistente, mantenendo lo stesso indirizzo e le cartelle vendor e assets. È incluso il nuovo drive.js. Non cancellare i dati del sito: contengono i rapportini locali. Chiudere e riaprire l’app dopo l’aggiornamento per attivare la nuova versione.

## Funzionamento
- Salva registra i dati e la firma nell’archivio locale, anche offline. Non apre più l’esportazione JSON.
- Da sincronizzare indica che non esiste ancora conferma del caricamento su Drive.
- Con rete, app aperta e autorizzazione valida, la sincronizzazione parte dopo Salva, al ritorno della rete, rientrando nell’app e ogni minuto.
- Crea PDF e Condividi mantengono il PDF separato da Drive: su iPhone scegliere Salva su File, poi Sul mio iPhone e la cartella desiderata.
- Archivio rapportini cerca per data o locale nelle copie locali. Sincronizza adesso recupera anche i dati degli altri dispositivi collegati allo stesso account e allo stesso Client ID Google.
- La cartella visibile su Drive si chiama Rapportini - Dati. Contiene JSON e firma, senza PDF. Ogni modifica crea una versione separata; l’elenco dell’app mostra la versione con savedAt più recente per lo stesso identificativo. Le precedenti rimangono su Drive. Tenere corretti gli orologi dei dispositivi. La sincronizzazione non unisce singoli campi modificati contemporaneamente.
- Gli identificativi dei rapportini già esistenti sono mantenuti: stessa data e locale normalizzato aggiornano la stessa voce; cambiare data o locale crea una nuova voce.
- Le vecchie copie locali vengono caricate al primo collegamento. Apri rapportino da File importa singoli JSON o un backup esportato dall’app. L’importazione sostituisce le voci con stesso identificativo dopo conferma.
- Esporta backup di tutti i dati produce un JSON da conservare in File. Il recupero usa Apri rapportino da File (limite attuale: 10 MB).

## Configurazione Google iniziale (una volta per il progetto)
1. In Google Cloud Console creare o usare un progetto e abilitare Google Drive API.
2. In Google Auth Platform configurare Branding, Audience e Data Access. Aggiungere l’ambito https://www.googleapis.com/auth/drive.file. Se il progetto è in Testing aggiungere come test user l’account Google che userà l’app.
3. Creare un client OAuth di tipo Applicazione web. Nelle origini JavaScript autorizzate inserire l’origine HTTPS del sito, ad esempio https://nomeutente.github.io (senza il percorso del repository). Non serve inserire un client secret nell’app; non farlo.
4. Copiare il Client ID che termina con .apps.googleusercontent.com.
5. Nell’app aprire Impostazioni, incollarlo in Client ID Google e premere Salva configurazione Drive, poi Collega Google Drive. Al primo caricamento della libreria Google può essere necessario premere di nuovo Collega.
6. Autorizzare l’account scelto. Usare lo stesso account e Client ID su tutti i dispositivi. L’archivio locale viene associato al primo account per impedire caricamenti accidentali in un altro Drive.

Il collegamento reale richiede questa configurazione e una prova sul proprio sito/iPhone. Non è stato effettuato alcun accesso al tuo account Google durante lo sviluppo.

## Offline e conservazione
Aprire una volta il sito HTTPS online e attendere che sia caricato. File dell’app, libreria PDF e font sono inclusi nella cache offline. La schermata Google richiede Internet, ma il salvataggio locale e il PDF non dipendono dal caricamento Google.

Su iPhone non è garantita l’esecuzione con app chiusa: riaprirla per sincronizzare. Dopo riavvio o scadenza dell’autorizzazione premere Collega Google Drive: il token resta solo in memoria. I dati in attesa rimangono sul dispositivo. Cancellando i dati del sito si perdono le copie non sincronizzate; esportare un backup quando si lavora a lungo senza rete.

## Verifiche eseguite
Sintassi JavaScript e simulazioni di: assenza rete, caricamento, protezione di una modifica effettuata durante il caricamento, conservazione dell’ID di upload per ripetere un tentativo interrotto, autorizzazione scaduta. Da provare sul dispositivo: consenso OAuth, sincronizzazione tra due dispositivi, riapertura in modalità aereo, firma e PDF condiviso in File.
