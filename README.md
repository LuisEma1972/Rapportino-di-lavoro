# Rapportino di lavoro — archivio locale

## Pubblicazione
Caricare il contenuto di questa cartella nella radice del repository GitHub Pages. Conservare le cartelle assets e vendor. Nessuna configurazione Google richiesta.

## Utilizzo
- Salva registra dati e firma nell’archivio del browser/dispositivo, senza generare PDF o aprire il pannello di condivisione.
- Stessa data e nome locale aggiornano il rapportino esistente; spazi e maiuscole vengono normalizzati.
- Archivio rapportini mostra un elenco ordinato per data decrescente, filtrabile per parte del nome, data esatta o entrambi.
- Apri recupera tutti i dati nella schermata principale per controllo o modifica. Le modifiche diventano definitive nell’archivio quando si preme Salva.
- I file JSON esportati in precedenza entrano nell’archivio aprendo Apri rapportino da File.
- Crea PDF genera il documento; Condividi lo esporta.
- Impostazioni permette di scegliere il logo e di esportare i dati del rapportino corrente come JSON.

## Conservazione dei dati
L’archivio è locale (IndexedDB), separato per browser/dispositivo/origine del sito. Gli aggiornamenti nello stesso sito mantengono l’archivio; cancellare i dati del sito o cambiare indirizzo/browser non lo trasferisce. Esportare i JSON come copia di sicurezza. Importarli su un altro dispositivo per recuperarli.

## Offline
Aprire almeno una volta il sito HTTPS e lasciarlo caricare prima di usarlo offline. Libreria PDF, font e logo neutro sono inclusi. Installare dalla schermata di condivisione di Safari sull’iPhone e verificare l’apertura in modalità aereo.

## Controlli
Verificati sintassi JavaScript, salvataggio e aggiornamento dell’identificativo locale con storage simulato, ricerca nome/data/combinata e ripristino di campi, orari e firma. Da verificare sul dispositivo reale.
