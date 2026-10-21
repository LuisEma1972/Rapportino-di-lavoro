// Tokens remain in memory; no Google password or client secret is stored.
let driveToken=null, driveExpiry=0, driveBusy=false, googleLoading=null;
let driveMessage="Collega Drive per sincronizzare.";
const DRIVE_API="https://www.googleapis.com/drive/v3/";
async function updateSyncStatus(){
  try{
    const pending=(await readLocalArchive()).filter(r=>r.syncState!=="synced").length;
    const text=`${navigator.onLine?"":"Offline • "}${pending} da sincronizzare. ${driveMessage}`;
    $("driveStatus").textContent=text;$("syncSummary").textContent=text;
  }catch(e){$("syncSummary").textContent="Archivio locale non disponibile: "+e.message;}
}
function loadGoogle(){
  if(window.google?.accounts?.oauth2)return Promise.resolve();
  if(!navigator.onLine)return Promise.reject(new Error("Connessione assente. I dati restano sul telefono."));
  if(!googleLoading)googleLoading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";
    script.onload=resolve;script.onerror=()=>{googleLoading=null;reject(new Error("Accesso Google non disponibile. Riprova con Internet."));};document.head.append(script);
  });return googleLoading;
}
async function driveRequest(path,options={}){
  if(!driveToken||Date.now()>=driveExpiry){driveToken=null;throw new Error("Premi Collega Google Drive per autorizzare la sincronizzazione.");}
  const response=await fetch(path.startsWith("https://")?path:DRIVE_API+path,{...options,headers:{...options.headers,Authorization:"Bearer "+driveToken},signal:AbortSignal.timeout(30000)});
  if(response.status===401){driveToken=null;throw new Error("Accesso scaduto. Premi Collega Google Drive. I dati restano sul telefono.");}
  if(!response.ok){const error=new Error("Drive: richiesta non riuscita ("+response.status+"). I dati restano sul telefono.");error.status=response.status;throw error;}
  return response.json();
}
async function listDriveFiles(q){
  let files=[],pageToken;
  do{
    const params=new URLSearchParams({q,fields:"nextPageToken,files(id,name,appProperties)",pageSize:"100"});
    if(pageToken)params.set("pageToken",pageToken);
    const page=await driveRequest("files?"+params);files.push(...page.files);pageToken=page.nextPageToken;
  }while(pageToken);return files;
}
async function driveFolder(){
  const folders=await listDriveFiles("trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='rapportinoFolder' and value='v1' }");
  if(folders.length)return folders.sort((a,b)=>a.id.localeCompare(b.id))[0].id;
  return (await driveRequest("files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Rapportini - Dati",mimeType:"application/vnd.google-apps.folder",appProperties:{rapportinoFolder:"v1"}})})).id;
}
async function uploadRevision(report,folder){
  // Persist a pre-generated ID before upload: retries reuse it after ambiguous failures.
  if(!report.driveUploadId){
    report={...report,driveUploadId:(await driveRequest("files/generateIds?count=1&space=drive")).ids[0]};
    await updateSameRevision(report);
  }
  const metadata={id:report.driveUploadId,name:`${report.date}_${report.clientName.replace(/[^\p{L}\p{N} _-]/gu,"_")}_${report.revision}.json`,parents:[folder],mimeType:"application/json",appProperties:{rapportino:"v1",revision:report.revision}};
  const {syncState,driveUploadId,...data}=report;
  const boundary="rapportino_"+crypto.randomUUID();
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
  try{
    await driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+boundary},body});
  }catch(e){
    if(e.status!==409)throw e;
    const existing=await driveRequest("files/"+report.driveUploadId+"?alt=media");
    if(existing.revision!==report.revision)throw new Error("Versione Drive non corrispondente.");
  }
  await updateSameRevision({...report,syncState:"synced"});
}
async function updateSameRevision(data){
  const db=await localArchiveDb();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction("reports","readwrite"),store=tx.objectStore("reports"),get=store.get(data.reportId);
    get.onsuccess=()=>{if(get.result?.revision===data.revision)store.put(data);};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
async function mergeRemote(data){
  const db=await localArchiveDb();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction("reports","readwrite"),store=tx.objectStore("reports"),get=store.get(data.reportId);
    get.onsuccess=()=>{const old=get.result;if(!old||old.syncState==="synced"&&data.savedAt>old.savedAt)store.put(data);};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });}finally{db.close();}
}
async function pullDrive(){
  // Keep every saved revision on Drive, so another device's work is never overwritten.
  const files=await listDriveFiles("trashed=false and appProperties has { key='rapportino' and value='v1' }");
  const local=new Map((await readLocalArchive()).map(r=>[r.reportId,r]));
  for(const file of files){
    if([...local.values()].some(r=>r.revision===file.appProperties?.revision))continue;
    const data=validateLocalReport(await driveRequest("files/"+file.id+"?alt=media"));
    if(typeof data.revision!=="string"||!Number.isFinite(Date.parse(data.savedAt)))continue;
    const old=local.get(data.reportId);
    if(!old||old.syncState==="synced"&&data.savedAt>old.savedAt){
      await mergeRemote({...data,syncState:"synced",driveUploadId:file.id});local.set(data.reportId,{...data,syncState:"synced"});
    }
  }
}
async function syncDrive(){
  if(driveBusy)return;
  if(!navigator.onLine||!driveToken||Date.now()>=driveExpiry){
    driveMessage=navigator.onLine?"Collega Drive per sincronizzare.":"Sincronizzazione in attesa della rete.";await updateSyncStatus();return;
  }
  driveBusy=true;driveMessage="Sincronizzazione…";await updateSyncStatus();
  try{
    const folder=await driveFolder();
    // Upload local changes before merging remote results; archived revisions remain on Drive.
    for(let report of await readLocalArchive()){
      if(report.syncState==="synced")continue;
      if(!report.revision){report={...report,revision:crypto.randomUUID(),syncState:"pending"};await archiveStore(report);}
      await uploadRevision(report,folder);
    }
    await pullDrive();driveMessage="Sincronizzato con Drive.";
    if(!$("archiveModal").classList.contains("hidden"))await refreshArchive();
  }catch(e){driveMessage=e.message;}
  finally{driveBusy=false;await updateSyncStatus();}
}
$("driveClientId").value=appSettings.driveClientId||"";
$("saveDriveConfig").onclick=()=>{
  const value=$("driveClientId").value.trim();
  if(!value.endsWith(".apps.googleusercontent.com")){ $("settingsStatus").textContent="Inserisci il Client ID Google valido.";return;}
  appSettings={...appSettings,driveClientId:value};localStorage.setItem(SETTINGS_KEY,JSON.stringify(appSettings));
  driveToken=null;driveMessage="Configurazione salvata. Premi Collega Google Drive.";void loadGoogle().catch(e=>{driveMessage=e.message;void updateSyncStatus();});void updateSyncStatus();
};
$("connectDrive").onclick=()=>{
  if(driveBusy)return;
  if(!appSettings.driveClientId){driveMessage="Inserisci e salva prima il Client ID Google.";void updateSyncStatus();return;}
  if(!window.google?.accounts?.oauth2){void loadGoogle().then(()=>{driveMessage="Google pronto. Premi di nuovo Collega Google Drive.";void updateSyncStatus();}).catch(e=>{driveMessage=e.message;void updateSyncStatus();});return;}
  google.accounts.oauth2.initTokenClient({client_id:appSettings.driveClientId,scope:"https://www.googleapis.com/auth/drive.file",error_callback:e=>{driveMessage="Accesso Google annullato o bloccato. I dati restano sul telefono.";void updateSyncStatus();},callback:async response=>{
    if(response.error){driveMessage="Collegamento non riuscito: "+response.error;void updateSyncStatus();return;}
    driveToken=response.access_token;driveExpiry=Date.now()+Number(response.expires_in)*1000-60000;
    try{
      const about=await driveRequest("about?fields=user(permissionId,emailAddress)");
      if(appSettings.driveAccount&&appSettings.driveAccount!==about.user.permissionId)throw new Error("Questo archivio è associato a un altro account Google. Ricollega l’account originale.");
      appSettings={...appSettings,driveAccount:about.user.permissionId};localStorage.setItem(SETTINGS_KEY,JSON.stringify(appSettings));
      await syncDrive();
    }catch(e){driveToken=null;driveMessage=e.message;void updateSyncStatus();}
  }}).requestAccessToken({prompt:"select_account"});
};
$("syncDrive").onclick=()=>void syncDrive();
$("disconnectDrive").onclick=()=>{if(driveBusy)return;driveToken=null;driveMessage="Drive scollegato. Copie locali conservate.";void updateSyncStatus();};
$("exportBackup").onclick=async()=>{
  try{
    const blob=new Blob([JSON.stringify({format:"rapportino-backup-v1",reports:await readLocalArchive()},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="rapportini-backup-"+todayISO()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){alert("Backup non riuscito: "+e.message);}
};
window.addEventListener("online",()=>void syncDrive());window.addEventListener("offline",()=>void updateSyncStatus());
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void syncDrive();});
setInterval(()=>{if(!document.hidden&&navigator.onLine&&driveToken)void syncDrive();},60000);
if(appSettings.driveClientId&&navigator.onLine)void loadGoogle().catch(()=>{});
void updateSyncStatus();
