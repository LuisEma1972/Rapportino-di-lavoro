const $ = id => document.getElementById(id);

let technicians = [];
let signatureDataUrl = null;
let currentPdfBlob = null;
let currentPdfUrl = null;

const SETTINGS_KEY = "rapportino.settings";
let appSettings = (()=>{try{return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{};}catch{return {};}})();

function showReportInMain(d){
  validateLocalReport(d);
  $("clientName").value=d.clientName;$("date").value=d.date;technicians=d.technicians;
  for(const field of ["workDone","materialsUsed","materialsRepaired"])$(field).value=d[field]||"";
  signatureDataUrl=d.signatureDataUrl||null;currentPdfBlob=null;generatedReportSnapshot=null;
  if(currentPdfUrl)URL.revokeObjectURL(currentPdfUrl);currentPdfUrl=null;
  updateSignatureUi();renderTechnicians();persistDraft();syncButtons();
  $("reportNotice").textContent="Rapportino caricato nel modulo.";
  window.scrollTo({top:0,behavior:"smooth"});
}

let pendingLogo;
let generatedReportSnapshot = null;

function canonicalLocale(value){
  return String(value).normalize("NFKC").trim().replace(/\s+/g," ").toLocaleLowerCase("it-IT");
}

function reportSnapshot(){return JSON.stringify({date:$("date").value,client:$("clientName").value,technicians,work:$("workDone").value,used:$("materialsUsed").value,repaired:$("materialsRepaired").value,signatureDataUrl,logo:appSettings.logo});}
function applyAppLogo(){document.querySelector("#logoBox img").src=appSettings.logo||"assets/default_logo.svg";}
let pdfLogoImage = null;

function loadLogoImage(){
  if (pdfLogoImage) return Promise.resolve(pdfLogoImage);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { pdfLogoImage = img; resolve(img); };
    img.onerror = reject;
    img.src = appSettings.logo;
  });
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off*60000).toISOString().slice(0,10);
}

function cloneTimes(times) {
  return JSON.parse(JSON.stringify(times));
}

function defaultTimes() {
  return {
    arrival: { hour: 8, minute: 0 },
    pause: { hour: 12, minute: 0 },
    resume: { hour: 13, minute: 0 },
    end: { hour: 17, minute: 0 }
  };
}

function decimalHour(t) { return Number(t.hour) + Number(t.minute)/60; }

function duration(start, end) {
  let s = decimalHour(start), e = decimalHour(end);
  if (e <= s) e += 24;
  return Math.max(0, e-s);
}

function techHours(t) {
  if (t.hasBreak) {
    return duration(t.times.arrival, t.times.pause) + duration(t.times.resume, t.times.end);
  }
  return duration(t.times.arrival, t.times.end);
}

function totalHours() {
  return technicians.reduce((sum,t)=>sum+techHours(t),0);
}

function timeString(t) {
  return `${String(t.hour).padStart(2,"0")}:${String(t.minute).padStart(2,"0")}`;
}

function populateSelect(select, values, suffix="") {
  select.innerHTML = "";
  values.forEach(v=>{
    const o=document.createElement("option");
    o.value=v; o.textContent=String(v).padStart(2,"0")+suffix;
    select.appendChild(o);
  });
}

function syncButtons() {
  const valid = technicians.length > 0 && $("clientName").value.trim().length > 0;
  $("generatePdfBtn").disabled = !valid;
  $("saveShareBtn").disabled = !currentPdfBlob;
}

function addTechnician(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const inherited = technicians.length
    ? { times: cloneTimes(technicians[0].times), hasBreak: technicians[0].hasBreak }
    : { times: defaultTimes(), hasBreak: true };

  technicians.push({
    id: crypto.randomUUID(),
    name: trimmed,
    times: inherited.times,
    hasBreak: inherited.hasBreak
  });
  renderTechnicians();
}

function renderTechnicians() {
  const wrap = $("technicians");
  wrap.innerHTML = "";
  technicians.forEach(t => {
    const node = $("techTemplate").content.firstElementChild.cloneNode(true);
    node.dataset.id = t.id;
    node.querySelector(".tech-name-label").textContent = t.name;
    node.querySelector(".tech-hours").textContent = `${techHours(t).toFixed(1)} h`;

    const hasBreak = node.querySelector(".has-break");
    hasBreak.checked = t.hasBreak;

    const editor = node.querySelector(".time-editor");
    const toggleBtn = node.querySelector(".toggle-times");

    ["arrival","pause","resume","end"].forEach(k=>{
      const hs=node.querySelector(`.${k}-hour`);
      const ms=node.querySelector(`.${k}-minute`);
      populateSelect(hs, Array.from({length:24},(_,i)=>i));
      populateSelect(ms, [0,15,30,45]);
      hs.value=t.times[k].hour;
      ms.value=t.times[k].minute;
      hs.onchange=()=>{ t.times[k].hour=Number(hs.value); updateComputed(); };
      ms.onchange=()=>{ t.times[k].minute=Number(ms.value); updateComputed(); };
    });

    const syncBreakRows=()=>{
      node.querySelector(".pause-line").classList.toggle("hidden", !t.hasBreak);
      node.querySelector(".resume-line").classList.toggle("hidden", !t.hasBreak);
    };
    syncBreakRows();

    hasBreak.onchange=()=>{
      t.hasBreak=hasBreak.checked;
      syncBreakRows();
      updateComputed();
    };

    toggleBtn.onclick=()=>{
      const hidden=editor.classList.toggle("hidden");
      toggleBtn.textContent=hidden ? "Modifica orari" : "Chiudi orari";
    };

    node.querySelector(".trash-btn").onclick=()=>{
      technicians=technicians.filter(x=>x.id!==t.id);
      renderTechnicians();
    };

    wrap.appendChild(node);
  });
  updateComputed();
}

function updateComputed() {
  $("totalHours").textContent = `${totalHours().toFixed(2)} ore`;
  document.querySelectorAll(".tech-card").forEach(card=>{
    const t=technicians.find(x=>x.id===card.dataset.id);
    if (t) card.querySelector(".tech-hours").textContent=`${techHours(t).toFixed(1)} h`;
  });
  syncButtons();
  persistDraft();
}

function persistDraft() {
  const draft = {
    clientName:$("clientName").value,
    date:$("date").value,
    technicians,
    workDone:$("workDone").value,
    materialsUsed:$("materialsUsed").value,
    materialsRepaired:$("materialsRepaired").value,
    signatureDataUrl
  };
  localStorage.setItem("rapportino.draft", JSON.stringify(draft));
}

function restoreDraft() {
  try {
    const d=JSON.parse(localStorage.getItem("rapportino.draft")||"null");
    if (!d) return false;
    $("clientName").value=d.clientName||"";
    $("date").value=d.date||todayISO();
    technicians=Array.isArray(d.technicians)?d.technicians:[];
    $("workDone").value=d.workDone||"";
    $("materialsUsed").value=d.materialsUsed||"";
    $("materialsRepaired").value=d.materialsRepaired||"";
    signatureDataUrl=d.signatureDataUrl||null;
    updateSignatureUi();
    renderTechnicians();
    return true;
  } catch { return false; }
}

function resetAll() {
  $("clientName").value="";
  $("date").value=todayISO();
  technicians=[];
  $("newTechnician").value="";
  $("workDone").value="";
  $("materialsUsed").value="";
  $("materialsRepaired").value="";
  signatureDataUrl=null;
  currentPdfBlob=null;
  if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
  currentPdfUrl=null;
  updateSignatureUi();
  renderTechnicians();
  localStorage.removeItem("rapportino.draft");
  syncButtons();
}

function showModal(id) { $(id).classList.remove("hidden"); }
function hideModal(id) { $(id).classList.add("hidden"); }

$("addTechBtn").onclick=()=>{
  addTechnician($("newTechnician").value);
  $("newTechnician").value="";
};
$("newTechnician").addEventListener("keydown", e=>{
  if(e.key==="Enter") $("addTechBtn").click();
});
$("clientName").addEventListener("input", ()=>{syncButtons();persistDraft();});
$("date").addEventListener("change", persistDraft);
["workDone","materialsUsed","materialsRepaired"].forEach(id=>$(id).addEventListener("input",persistDraft));

$("detailsBtn").onclick=()=>showModal("detailsModal");
document.querySelector(".close-details").onclick=()=>hideModal("detailsModal");

$("signatureBtn").onclick=()=>showModal("signatureModal");
document.querySelector(".close-signature").onclick=()=>hideModal("signatureModal");

$("newReportBtn").onclick=()=>{
  if(!confirm("Vuoi iniziare un nuovo rapportino? Tutti i dati non salvati nel modulo verranno cancellati.")) return;
  resetAll();
  generatedReportSnapshot=null;
  ctx.clearRect(0,0,canvas.width,canvas.height);drawing=false;dirty=false;last=null;
  $("reportNotice").textContent="Nuovo rapportino pronto.";
};

// Firma
const canvas=$("signatureCanvas");
const ctx=canvas.getContext("2d");
let drawing=false, dirty=false, last=null;

function cpoint(e){
  const r=canvas.getBoundingClientRect();
  return {
    x:(e.clientX-r.left)*(canvas.width/r.width),
    y:(e.clientY-r.top)*(canvas.height/r.height)
  };
}
canvas.addEventListener("pointerdown", e=>{
  drawing=true; dirty=true; last=cpoint(e); canvas.setPointerCapture(e.pointerId);
  $("saveSignatureBtn").disabled=false;
});
canvas.addEventListener("pointermove", e=>{
  if(!drawing) return;
  const p=cpoint(e);
  ctx.strokeStyle="#000"; ctx.lineWidth=6; ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
  last=p;
});
canvas.addEventListener("pointerup", ()=>{drawing=false;});
canvas.addEventListener("pointercancel", ()=>{drawing=false;});

$("clearSignatureBtn").onclick=()=>{
  ctx.clearRect(0,0,canvas.width,canvas.height);
  dirty=false;
  $("saveSignatureBtn").disabled=true;
};
$("saveSignatureBtn").onclick=()=>{
  if(!dirty) return;
  signatureDataUrl=canvas.toDataURL("image/png");
  updateSignatureUi();
  persistDraft();
  hideModal("signatureModal");
};

function updateSignatureUi(){
  $("signatureText").textContent=signatureDataUrl?"Modifica Firma Tecnico":"Aggiungi Firma Tecnico";
  $("signatureStatus").textContent=signatureDataUrl?"✓":"✎";
  $("signatureStatus").className="status-icon "+(signatureDataUrl?"green":"orange");
  if(signatureDataUrl){
    const img=new Image();
    img.onload=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      dirty=true;
      $("saveSignatureBtn").disabled=false;
    };
    img.src=signatureDataUrl;
  } else {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    dirty=false;
    $("saveSignatureBtn").disabled=true;
  }
}

// PDF
function getCounter(){
  return Number(localStorage.getItem("rapportino.counter")||"1");
}
function incrementCounter(){
  localStorage.setItem("rapportino.counter", String(getCounter()+1));
}
function safeName(s){
  return (s||"Rapportino").trim().replace(/\s+/g,"_").replace(/[\/\:*?"<>|]/g,"-");
}
function filenameForReport(){
  const date=($("date").value||todayISO()).replaceAll("-","");
  return `${date}_${safeName(canonicalLocale($("clientName").value))}.pdf`;
}

async function generatePdf(){
  if(!window.jspdf){
    alert("La libreria PDF non è disponibile. Controlla la connessione internet.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"pt", format:"a4"});
  const W = 595, H = 842;
  for(const style of ["normal","bold"]){
    doc.addFileToVFS(`Rapportino-${style}.ttf`,window.RAPPORTINO_PDF_FONTS[style]);
    doc.addFont(`Rapportino-${style}.ttf`,"Rapportino",style);
  }

  doc.setFillColor(255,255,255);
  doc.rect(0,0,W,H,"F");

  if(!appSettings.logo){
    doc.setTextColor(55,65,81);
    doc.setFont("Rapportino","bold");
    doc.setFontSize(16);
    doc.text("RAPPORTINO DI LAVORO", 24, 65);
  } else try {
    const logo = await loadLogoImage();
    const scale = Math.min(302 / logo.naturalWidth, 72 / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * scale;
    const logoHeight = logo.naturalHeight * scale;
    doc.addImage(logo, "PNG", 22 + (302-logoWidth)/2, 26 + (72-logoHeight)/2, logoWidth, logoHeight);
  } catch(e) {
    alert("Impossibile caricare il logo scelto. Riprova a generare il PDF.");
    return;
  }

  doc.setTextColor(0,0,0);
  doc.setFont("Rapportino","bold");
  doc.setFontSize(14);
  doc.text("Cliente", 355, 56);
  doc.text("Data", 355, 88);

  doc.setFont("Rapportino","bold");
  doc.setFontSize(14);
  doc.text(($("clientName").value || "").trim(), 426, 56, {maxWidth:150});

  const [yy,mm,dd] = ($("date").value || todayISO()).split("-");
  doc.setFont("Rapportino","normal");
  doc.setFontSize(12);
  doc.text(`${dd}/${mm}/${yy}`, 426, 88);

  doc.setDrawColor(224,224,224);
  doc.setLineWidth(6);
  doc.line(24, 117, 571, 117);

  function title(txt, y){
    doc.setFont("Rapportino","bold");
    doc.setFontSize(16);
    doc.setTextColor(0,0,0);
    doc.text(txt, 24, y);
  }
  function greyBox(x,y,w,h){
    doc.setFillColor(231,231,231);
    doc.rect(x,y,w,h,"F");
  }

  title("Mano d'opera", 182);
  greyBox(24, 191, 548, 75);

  title("Materiale utilizzato", 301);
  greyBox(24, 309, 548, 115);

  title("Materiale riparato", 459);
  greyBox(24, 469, 548, 115);

  title("Lavoro eseguito", 618);
  greyBox(24, 629, 548, 115);

  let y = 208;
  technicians.forEach(t=>{
    doc.setTextColor(35,35,35);
    doc.setFont("Rapportino","bold");
    doc.setFontSize(11);
    doc.text(t.name.trim(), 33, y, {maxWidth:132});

    doc.setFont("Rapportino","normal");
    const firstEnd = t.hasBreak ? t.times.pause : t.times.end;
    doc.text(`${timeString(t.times.arrival)} - ${timeString(firstEnd)}`, 180, y);
    if(t.hasBreak){
      doc.setDrawColor(90,90,90);
      doc.setLineWidth(0.8);
      doc.line(280, y-3.5, 296, y-3.5);
      doc.line(292, y-6.5, 296, y-3.5);
      doc.line(292, y-0.5, 296, y-3.5);
      doc.text(`${timeString(t.times.resume)} - ${timeString(t.times.end)}`, 310, y);
    }

    doc.setFont("Rapportino","bold");
    doc.setTextColor(0,102,170);
    doc.text(`${techHours(t).toFixed(2).replace(".",",")} ore`, 555, y, {align:"right"});
    y += 21;
  });

  doc.setTextColor(0,0,0);
  doc.setFont("Rapportino","normal");
  doc.setFontSize(11);

  const used = doc.splitTextToSize($("materialsUsed").value || "", 520);
  doc.text(used, 33, 326);

  const repaired = doc.splitTextToSize($("materialsRepaired").value || "", 520);
  doc.text(repaired, 33, 486);

  const work = doc.splitTextToSize($("workDone").value || "", 520);
  doc.text(work, 33, 646);

  doc.setFont("Rapportino","normal");
  doc.setFontSize(12);
  doc.text("Firma del Tecnico", 350, 762);

  if(signatureDataUrl){
    doc.addImage(signatureDataUrl, "PNG", 350, 770, 200, 60);
  }

  currentPdfBlob = doc.output("blob");
  generatedReportSnapshot = reportSnapshot();
  if(currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
  currentPdfUrl = URL.createObjectURL(currentPdfBlob);
  $("pdfPreview").src = currentPdfUrl;
  $("saveShareBtn").disabled = false;
  showModal("pdfModal");
  incrementCounter();
}

async function saveSharePdf(){
  if(!currentPdfBlob) return;
  if(generatedReportSnapshot!==reportSnapshot()){alert("Il rapportino è cambiato: genera di nuovo il PDF prima di condividerlo.");return;}
  const filename=filenameForReport();
  const file=new File([currentPdfBlob],filename,{type:"application/pdf"});

  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file],title:"Rapportino PDF"});
      return;
    }catch(e){
      if(e.name==="AbortError") return;
    }
  }
  const a=document.createElement("a");
  a.href=currentPdfUrl;
  a.download=filename;
  a.click();
}

$("generatePdfBtn").onclick=generatePdf;
$("saveShareBtn").onclick=saveSharePdf;
$("downloadPdfTop").onclick=saveSharePdf;
document.querySelector(".close-pdf").onclick=()=>hideModal("pdfModal");

if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

if(!restoreDraft()){
  $("date").value=todayISO();
  renderTechnicians();
}
syncButtons();

applyAppLogo();
$("settingsBtn").onclick=()=>{
  pendingLogo=appSettings.logo||null;
  $("settingsLogoPreview").src=pendingLogo||"assets/default_logo.svg";
  $("settingsStatus").textContent="";
  showModal("settingsModal");
};
$("closeSettingsBtn").onclick=()=>hideModal("settingsModal");
$("resetLogoBtn").onclick=()=>{pendingLogo=null;$("settingsLogoPreview").src="assets/default_logo.svg";};
$("settingsLogoFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>10*1024*1024)throw new Error("Scegli un’immagine di massimo 10 MB.");
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    pendingLogo=canvas.toDataURL("image/png");$("settingsLogoPreview").src=pendingLogo;$("settingsStatus").textContent="Logo pronto. Premi Salva per applicarlo.";
  }catch(err){$("settingsStatus").textContent="Immagine non caricata: "+err.message;}
  e.target.value="";
};
$("saveSettingsBtn").onclick=()=>{
  try{
    const next={...appSettings,logo:pendingLogo};
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(next));
    appSettings=next;pdfLogoImage=null;applyAppLogo();
    hideModal("settingsModal");
  }catch(err){$("settingsStatus").textContent="Impostazioni non salvate: "+err.message;}
};

function validateLocalReport(d){
  if(!d||d.schemaVersion!==1||typeof d.clientName!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Array.isArray(d.technicians))throw new Error("Il file non è un rapportino valido.");
  for(const t of d.technicians){
    if(typeof t.name!=="string"||!t.times)throw new Error("Dati tecnici non validi.");
    for(const slot of ["arrival","end",...(t.hasBreak?["pause","resume"]:[])]){
      const time=t.times[slot];if(!time||!Number.isInteger(time.hour)||time.hour<0||time.hour>23||!Number.isInteger(time.minute)||time.minute<0||time.minute>59)throw new Error("Orari non validi nel file.");
    }
  }
  for(const field of ["workDone","materialsUsed","materialsRepaired"])if(d[field]!=null&&typeof d[field]!=="string")throw new Error("Testi del rapportino non validi.");
  if(d.signatureDataUrl&&!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d.signatureDataUrl))throw new Error("Firma non valida.");
  return d;
}

$("openLocalReportBtn").onclick=()=>$("localReportFile").click();
$("localReportFile").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>10*1024*1024)throw new Error("File troppo grande.");
    const parsed=JSON.parse(await file.text());
    const d=validateLocalReport(parsed);
    if(!confirm("Aprire questo rapportino al posto di quello attualmente visualizzato?"))return;
    showReportInMain(d);
  }catch(err){alert("Impossibile aprire il rapportino: "+err.message);}finally{e.target.value="";}
};
