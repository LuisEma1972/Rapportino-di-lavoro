# Rapportino — salvataggio in File e cancellazione dall’app

Caricare tutti i file di questa cartella nel sito esistente. Il precedente drive.js non è più usato e può essere rimosso dal repository. La versione aggiornata non effettua sincronizzazioni Drive. Chiudere tutte le finestre dell’app e riaprire online per installare l’aggiornamento. Non cancellare i dati del sito per aggiornare.

1. Compilare il rapportino. Se serve, creare il PDF e usare Condividi → Salva su File prima di svuotare il modulo.
2. Premere Salva: esporta il file dati JSON. Su iPhone scegliere Salva su File e una cartella Sul mio iPhone.
3. Verificare che il JSON sia presente e premere Nuovo rapportino. Confermare di aver salvato tutto sul telefono: l’app elimina il rapportino corrispondente dal proprio archivio, elimina la bozza e la firma e svuota modulo e anteprima PDF.
4. Per riaprirlo usare Apri rapportino da File. Il singolo JSON viene caricato nel modulo senza aggiungere una nuova copia all’archivio. Finché si lavora il modulo mantiene una bozza locale, eliminata con la conferma del salvataggio.

La conferma è necessaria: il browser non può verificare se Salva su File è stato effettivamente eseguito. Annullare la condivisione non cancella dati. Prima di premere Nuovo rapportino salvare nuovamente eventuali modifiche successive all’esportazione. La conferma è una dichiarazione dell’utente: non viene controllato automaticamente il file sul telefono. Il solo PDF non basta a ripristinare i campi modificabili.

La cancellazione riguarda il rapportino salvato, non gli altri rapportini precedenti né logo e impostazioni. Eventuali copie già caricate su Drive in passato non vengono eliminate. I backup JSON precedenti possono essere importati con Apri rapportino da File; questa importazione ricrea le relative voci nell’archivio locale dopo conferma.

Offline: aprire prima l’app online e attendere il caricamento. Codice, font e generatore PDF sono inclusi. Provare in modalità aereo sul proprio iPhone.

Verifiche: sintassi JavaScript; simulazione di esportazione senza cancellazione automatica, conferma annullata, protezione delle modifiche successive, cancellazione confermata e condivisione annullata. Il flusso Salva su File va provato sull’iPhone.

## Archivio rapportini — correzione v23
Aprire Archivio rapportini → Seleziona rapportini da File. Selezionare uno o più JSON salvati sul telefono (anche backup JSON precedenti). Cercare per locale o data e premere Apri. I file selezionati restano solo in memoria per la sessione: alla riapertura dell’app occorre selezionarli nuovamente. Eventuali copie interne precedenti restano consultabili. Aggiorna conserva la selezione; Nuovo rapportino la svuota dopo conferma. Nessuna nuova copia viene registrata nell’archivio interno. Il rapportino aperto usa la bozza temporanea già prevista, cancellata con Nuovo rapportino.

Corretta anche la funzione mancante per visualizzare nomi con caratteri speciali. Verificati avvio, selezione, deduplicazione, ricerca e validazione con simulazione JavaScript. Selettore File e condivisione da verificare su iPhone.

## v24 — nessun collegamento Drive
Rimosso anche il riferimento residuo a Drive nell’elenco. L’app usa solo i file selezionati dal telefono e le eventuali copie locali precedenti. Se nel repository sono rimasti drive.js e config.js, eliminarli manualmente: il caricamento ZIP non rimuove file già esistenti. Non eliminare file presenti nel proprio account Google Drive. Il piè di pagina mostra v24.

## v25 — condivisione del solo file
Rimosso il titolo aggiuntivo dalle condivisioni PDF e JSON per evitare allegati testuali aggiuntivi su iPhone. Verificare il risultato con Salva su File su iOS.
