# Rapportino Web – versione basata sulla app Swift

Questa versione replica la logica del ContentView.swift fornito:

- Dati Cliente: nome + data
- Tecnici coinvolti
- Orari Arrivo / Pausa / Ripresa / Fine
- Pausa pranzo attivabile/disattivabile
- Minuti a intervalli di 15 minuti
- I nuovi tecnici ereditano gli orari del primo tecnico
- Calcolo ore con gestione del passaggio della mezzanotte
- Totale ore
- Dettagli Intervento:
  - Lavoro svolto
  - Materiali utilizzati
  - Materiali riparati
- Firma del tecnico tramite touchscreen/mouse
- Numerazione progressiva rapportino
- Generazione e anteprima PDF
- Salvataggio/condivisione PDF
- Nuovo rapportino
- Bozza salvata localmente nel browser
- Installabile come PWA

## Avvio
Per test locale:

python3 -m http.server 8080

Poi aprire:
http://localhost:8080

## Mancano due asset originali
Il sorgente Swift fa riferimento a:
- LogoApp
- RapportinoNuovo

Non erano inclusi nel file fornito. Appena vengono forniti, si possono inserire nella web app
per avere logo e layout PDF uguali all'app originale.

## Passo successivo
Collegamento Google Drive:
- login Google
- salvataggio PDF
- salvataggio JSON dei dati
- archivio rapportini multi-dispositivo


## Versione 2 - layout PDF recuperato dal vecchio sorgente Swift

Il PDF è stato riallineato alle coordinate originali usate da `generatePDFFromImageTemplate()`:
- A4 595 x 842 pt
- Cliente: x 425, y 50
- Data: x 425, y 79
- Tecnici: x 33, y iniziale 197, passo 20
- Materiali utilizzati: x 33, y 315
- Materiali riparati: x 33, y 475
- Lavoro svolto: x 33, y 633
- Firma: x 350, y 770, 200 x 60

Il file grafico originale `LogoApp` non era presente nei materiali recuperabili.
Il layout contiene quindi uno spazio riservato per inserirlo senza alterare il resto.


# Google Drive - Versione 4

Questa versione aggiunge:

- Accesso Google tramite Google Identity Services.
- Scope `drive.file` (l'app accede ai file/cartelle che crea).
- Creazione automatica:
  - `Rapportini`
  - `Rapportini/ANNO`
  - `Rapportini/ANNO/CLIENTE`
- Salvataggio di:
  - PDF finale
  - file JSON con tutti i dati modificabili del rapportino
- Archivio Drive dei rapportini creati dall'app.
- Apertura di un rapportino dal Drive.
- Duplicazione di un rapportino esistente.
- Firma salvata nel JSON e ripristinata quando si riapre il rapportino.

## Configurazione Google Cloud

1. Aprire Google Cloud Console.
2. Creare (o scegliere) un progetto.
3. Abilitare **Google Drive API**.
4. Configurare **OAuth consent screen**.
5. Creare credenziali **OAuth Client ID** di tipo **Web application**.
6. Nelle "Authorized JavaScript origins" inserire il dominio dove sarà pubblicata la web app.
   Per test locale si può usare, ad esempio:
   - `http://localhost:8080`
7. Copiare il Client ID.
8. Aprire `config.js` e impostare:

```js
window.RAPPORTINO_GOOGLE_CLIENT_ID = "IL_TUO_CLIENT_ID.apps.googleusercontent.com";
```

NON inserire il Client Secret nella web app.

## Avvio locale

Dentro la cartella dell'app:

```bash
python3 -m http.server 8080
```

Poi aprire:

`http://localhost:8080`

## Nota

Il login Google richiede che l'app sia servita via HTTP/HTTPS.
Aprire `index.html` direttamente con `file://` non è sufficiente per OAuth.


## Correzione logo PDF
Logo estratto direttamente dal PDF originale, con proporzioni e posizione conservate. Incorporato nel codice per funzionare anche senza caricamenti esterni. Cache aggiornata automaticamente alla versione 5. Dopo aver sostituito i file sul server, chiudere e riaprire l’app.


## Impostazioni e archivio aggiornati
Le sezioni precedenti descrivono versioni precedenti. La configurazione attuale è questa:
- Aprire Impostazioni per caricare un logo PNG/JPEG/WebP, impostare Client ID e link cartella Drive.
- Il logo è memorizzato nel browser e usato nell’interfaccia e nei nuovi PDF.
- Cartella unica: PDF e JSON sono salvati direttamente nella cartella impostata; l’archivio legge solo quella cartella, con paginazione.
- Nome: AAAAMMGG_nome_locale.pdf e lo stesso nome .json. Maiuscole e spazi ripetuti vengono normalizzati.
- Salvare nuovamente stessa data e stesso locale aggiorna i file con PATCH. Una duplicazione deve cambiare data o locale per diventare un nuovo rapportino.
- Il salvataggio blocca doppi clic e PDF non aggiornati dopo modifiche ai dati o al logo.
- L’accesso richiede lo scope https://www.googleapis.com/auth/drive per usare una cartella esistente; dichiararlo anche nel consenso Google Cloud. Il permesso riguarda Drive intero, mentre il codice cerca e salva nella cartella impostata.
- Non è stata eseguita una prova con un account Google reale: occorre configurare il Client ID e l’origine HTTP/HTTPS autorizzata.
- Drive non impone nomi univoci: il controllo previene salvataggi ripetuti, ma non garantisce unicità atomica di due primi salvataggi simultanei da dispositivi diversi. Per una garanzia assoluta occorre un servizio centrale con vincolo univoco. Le copie pregresse non vengono eliminate.
- Modificare nome o data identifica un altro rapportino: non elimina o rinomina quello precedente.


## Salvataggio dati (versione attuale)
Il pulsante Salva rapportino carica solo il JSON con tutti i campi e la firma. Non è necessario generare un PDF. Apri nell’archivio ripristina i dati modificabili; salvare stessa data e locale aggiorna il JSON. Il PDF viene generato localmente per scaricarlo/condividerlo e non viene più caricato su Drive. Eventuali PDF delle versioni precedenti restano nella cartella e non vengono cancellati automaticamente. Il logo è una impostazione del browser, non è incluso nei singoli rapportini: il PDF usa il logo attualmente selezionato.
