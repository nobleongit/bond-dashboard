import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

// ─── GLOBAL RESPONSIVE CSS ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body, #root { margin: 0; padding: 0; width: 100%; overflow-x: hidden; }

  /* Contenitore principale */
  .ba-page  { min-height: 100vh; }
  .ba-inner { max-width: 1600px; margin: 0 auto; padding: 20px 20px; }

  /* Griglie KPI adattive */
  .ba-grid-3  { display: grid; gap: 14px; grid-template-columns: repeat(3, 1fr); }
  .ba-grid-4  { display: grid; gap: 14px; grid-template-columns: repeat(4, 1fr); }
  .ba-grid-12 { display: grid; gap: 8px;  grid-template-columns: repeat(12, 1fr); }

  /* Layout 2 colonne 3fr/2fr panoramica */
  .ba-chart-row { display: grid; gap: 16px; grid-template-columns: 3fr 2fr; }

  /* Composizione righe */
  .ba-comp-row1 { display: grid; gap: 16px; grid-template-columns: 1fr 1fr 1fr; margin-bottom: 16px; }
  .ba-comp-row2 { display: grid; gap: 16px; grid-template-columns: 2fr 1fr 1fr; margin-bottom: 16px; }
  .ba-metrics   { display: grid; gap: 12px; grid-template-columns: repeat(6, 1fr); }

  /* Header panoramica */
  .ba-overview-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
  .ba-totale-card     { min-width: 240px; }

  /* Scadenze header */
  .ba-scad-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }

  /* Titoli header */
  .ba-bonds-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px; }
  .ba-bonds-filters{ display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  /* Tabella — sempre scrollabile orizzontalmente */
  .ba-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
  .ba-table-wrap table { min-width: 900px; width: 100%; }
  .ba-table-bonds { min-width: 1400px !important; }
  .ba-table-cedole{ min-width: 1100px !important; }

  /* ── TABLET (≤ 1100px) ─────────────────────────────────────────────── */
  @media (max-width: 1100px) {
    .ba-grid-3   { grid-template-columns: 1fr 1fr; }
    .ba-grid-4   { grid-template-columns: 1fr 1fr; }
    .ba-chart-row{ grid-template-columns: 1fr; }
    .ba-comp-row1{ grid-template-columns: 1fr 1fr; }
    .ba-comp-row2{ grid-template-columns: 1fr 1fr; }
    .ba-metrics  { grid-template-columns: repeat(4, 1fr); }
    .ba-grid-12  { grid-template-columns: repeat(6, 1fr); }
  }

  /* ── MOBILE (≤ 720px) ──────────────────────────────────────────────── */
  @media (max-width: 720px) {
    .ba-inner    { padding: 12px 10px; }
    .ba-grid-3   { grid-template-columns: 1fr; }
    .ba-grid-4   { grid-template-columns: 1fr 1fr; }
    .ba-chart-row{ grid-template-columns: 1fr; }
    .ba-comp-row1{ grid-template-columns: 1fr; }
    .ba-comp-row2{ grid-template-columns: 1fr; }
    .ba-metrics  { grid-template-columns: repeat(2, 1fr); }
    .ba-grid-12  { grid-template-columns: repeat(4, 1fr); }
    .ba-totale-card { min-width: 100%; }
  }
`;

// Inietta CSS globale una volta sola nel <head>
function useGlobalCSS() {
  useEffect(() => {
    const id = "ba-global-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(id); if(el) el.remove(); };
  }, []);
}

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg:"#f0efea", card:"#ffffff", dark:"#1a1a1a", gray:"#6b7280",
  lgray:"#f4f4f0", border:"#e8e8e3",
  yellow:"#f5c842", yellowL:"#fef9e7", yellowB:"#fde68a",
  green:"#22c55e", greenL:"#f0fdf4",
  red:"#ef4444", blue:"#3b82f6", blueL:"#eff6ff", purple:"#8b5cf6",
};

// ─── COLORI CATEGORICI ────────────────────────────────────────────────────────
const RATING_COLORS = {
  "AAA":"#059669","AA+":"#10b981","AA":"#34d399","AA-":"#6ee7b7",
  "A+":"#3b82f6","A":"#60a5fa","A-":"#93c5fd",
  "BBB+":"#8b5cf6","BBB":"#a78bfa","BBB-":"#c4b5fd","Baa2":"#ddd6fe",
  "BB+":"#ef4444","BB":"#f87171","BB-":"#fca5a5","ND":"#9ca3af",
};
const TIPO_COLORS  = { "Governativo":"#3b82f6","Corporate":"#8b5cf6","Sovranazionale":"#10b981" };
const TIPO_BG      = { "Governativo":"#eff6ff","Corporate":"#f5f3ff","Sovranazionale":"#ecfdf5" };
const TIPO_BORDER  = { "Governativo":"#bfdbfe","Corporate":"#ddd6fe","Sovranazionale":"#a7f3d0" };

// Seniority: Senior verde, T2 giallo, AT1 arancione, Junior rosso
const SENIORITY_COLORS = {
  "Senior Unsecured":"#22c55e","Senior Secured":"#10b981","Senior":"#22c55e",
  "Tier 2":"#f59e0b","T2":"#f59e0b","Subordinated T2":"#f59e0b","Junior Subordinated":"#ef4444",
  "AT1":"#f97316","Additional Tier 1":"#f97316","CoCo":"#f97316",
};
const SENIORITY_BG = {
  "Senior Unsecured":"#f0fdf4","Senior Secured":"#ecfdf5","Senior":"#f0fdf4",
  "Tier 2":"#fffbeb","T2":"#fffbeb","Subordinated T2":"#fffbeb","Junior Subordinated":"#fef2f2",
  "AT1":"#fff7ed","Additional Tier 1":"#fff7ed","CoCo":"#fff7ed",
};

const SECTOR_COLORS = {
  "Government Activity":"#3b82f6","Utilities":"#10b981","Healthcare":"#8b5cf6",
  "Financials":"#f59e0b","Financial":"#f59e0b","Banks":"#d97706",
  "Industrials":"#6b7280","Consumer Cyclicals":"#f97316","Consumer Staples":"#84cc16",
  "Basic Materials":"#a3e635","Technology":"#06b6d4","Energy":"#ef4444",
  "Real Estate":"#ec4899","Telecommunications":"#14b8a6","Media":"#a78bfa",
};
const CURRENCY_COLORS = {
  "EUR":"#3b82f6","USD":"#22c55e","GBP":"#8b5cf6","CHF":"#f59e0b",
  "JPY":"#ef4444","NOK":"#10b981","SEK":"#60a5fa","DKK":"#93c5fd",
};
const COUPON_TYPE_COLORS = {
  "Fixed":"#22c55e","Variable":"#f59e0b","Floating":"#f59e0b",
  "Zero Coupon":"#9ca3af","Step Up":"#f97316","Inflazione":"#8b5cf6",
};

// Ordine standard rating investment grade → speculative → ND (per grafici)
const RATING_ORDER = [
  "AAA","AA+","AA","AA-","A+","A","A-",
  "BBB+","BBB","BBB-","Baa1","Baa2","Baa3",
  "BB+","BB","BB-","B+","B","B-",
  "CCC+","CCC","CCC-","CC","C","D","ND",
];
const ratingRank = (r) => { const i = RATING_ORDER.indexOf(r); return i === -1 ? 999 : i; };

// ─── DATI INIZIALI (aggiornati dal file Excel reale) ──────────────────────────
const INITIAL_BONDS = [
  { valuta:"EUR", issuer:"ROMANIA (GOVERNMENT)",                        isin:"XS2109812508", name:"ROGV 2.000 01/28/32 MTN",     scadenza:"2032-01-28", callDate:"",           cedola:2.0,   ask:88.668,  yldYtm:4.323556, yldToCall:null,     duration:5.3701, taglioMin:1000, incrMin:1, rating:"BBB-", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1400000000, rateo:0 },
  { valuta:"EUR", issuer:"GREECE, REPUBLIC OF (GOVERNMENT)",            isin:"GR0133010232", name:"GRGV 4.300 02/24/32",           scadenza:"2032-02-24", callDate:"",           cedola:4.3,   ask:103.776, yldYtm:3.626913, yldToCall:null,     duration:5.2209, taglioMin:1, incrMin:1,    rating:"BBB",  peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Variable", couponFreq:1, sector:"Government Activity",  ammEmesso:126192685, rateo:0 },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005094088", name:"ITGV 1.650 03/01/32",           scadenza:"2032-03-01", callDate:"",           cedola:1.65,  ask:94.046,  yldYtm:2.769985, yldToCall:null,     duration:5.5702, taglioMin:1000, incrMin:1, rating:"BBB+", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:2, sector:"Government Activity",  ammEmesso:27451727000, rateo:0 },
  { valuta:"EUR", issuer:"EUROPEAN BANK FOR RECONSTRUCTION AND DEV.",   isin:"XS3030091329", name:"EBRD 2.875 03/22/32 MTN",       scadenza:"2032-03-22", callDate:"",           cedola:2.875, ask:100.982, yldYtm:2.73473,  yldToCall:null,     duration:5.3514, taglioMin:1000, incrMin:1, rating:"AAA",  peso:10,   tipo:"Sovranazionale", seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1025000000, rateo:0 },
  { valuta:"EUR", issuer:"HUNGARY (GOVERNMENT)",                        isin:"XS2161992511", name:"HUGV 1.625 04/28/32",           scadenza:"2032-04-28", callDate:"",           cedola:1.625, ask:89.276,  yldYtm:3.618185, yldToCall:null,     duration:5.5989, taglioMin:1000, incrMin:1, rating:"BBB-", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1000000000, rateo:0 },
  { valuta:"EUR", issuer:"POLAND, REPUBLIC OF (GOVERNMENT)",            isin:"XS2447602793", name:"PLGV 2.750 05/25/32 MTN",       scadenza:"2032-05-25", callDate:"",           cedola:2.75,  ask:99.05,   yldYtm:2.956581, yldToCall:null,     duration:5.525,  taglioMin:1000, incrMin:1, rating:"A-",   peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:2000000000, rateo:0 },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005672024", name:"ITGV 2.600 10/28/32",           scadenza:"2032-10-28", callDate:"",           cedola:2.6,   ask:101.121, yldYtm:3.038123, yldToCall:null,     duration:5.9047, taglioMin:1000, incrMin:1, rating:"BBB+", peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Variable", couponFreq:4, sector:"Government Activity",  ammEmesso:16572074000, rateo:0 },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005668220", name:"ITGV 3.250 11/15/32",           scadenza:"2032-11-15", callDate:"",           cedola:3.25,  ask:102.265, yldYtm:2.896075, yldToCall:null,     duration:null,   taglioMin:1000, incrMin:1, rating:"BBB+", peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:2, sector:"Government Activity",  ammEmesso:18700000000, rateo:0 },
  { valuta:"EUR", issuer:"FRANCE, REPUBLIC OF (GOVERNMENT)",            isin:"FR001400BKZ3", name:"FRGV 2.000 11/25/32",           scadenza:"2032-11-25", callDate:"",           cedola:2.0,   ask:94.937,  yldYtm:2.841852, yldToCall:null,     duration:6.148,  taglioMin:1, incrMin:1,    rating:"A+",   peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:59439000000, rateo:0 },
  { valuta:"EUR", issuer:"RWE AG",                                      isin:"XS2743711298", name:"RWEG 3.625 01/10/32 MTN",       scadenza:"2032-01-10", callDate:"2031-10-10", cedola:3.625, ask:103.663, yldYtm:2.967237, yldToCall:2.942511, duration:5.0103, taglioMin:1000, incrMin:1, rating:"Baa2", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Utilities",             ammEmesso:500000000, rateo:0 },
  { valuta:"EUR", issuer:"BMW FINANCE NV",                              isin:"XS3280519078", name:"BMWG 3.250 01/27/32 MTN",       scadenza:"2032-01-27", callDate:"",           cedola:3.25,  ask:100.736, yldYtm:3.135625, yldToCall:null,     duration:5.2898, taglioMin:1000, incrMin:1, rating:"ND",   peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Consumer Cyclicals",    ammEmesso:650000000, rateo:0 },
  { valuta:"EUR", issuer:"FRESENIUS FINANCE IRELAND PLC",               isin:"XS1554373834", name:"FREG 3.000 01/30/32 MTN",       scadenza:"2032-01-30", callDate:"2031-10-30", cedola:3.0,   ask:100.066, yldYtm:3.058468, yldToCall:3.06226,  duration:5.3311, taglioMin:1000, incrMin:1, rating:"ND",   peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Healthcare",            ammEmesso:500000000, rateo:0 },
  { valuta:"EUR", issuer:"E.ON SE",                                     isin:"XS2791959906", name:"EONG 3.500 03/25/32 MTN",       scadenza:"2032-03-25", callDate:"2031-12-25", cedola:3.5,   ask:102.535, yldYtm:3.068601, yldToCall:3.053273, duration:5.0553, taglioMin:1000, incrMin:1, rating:"BBB+", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Utilities",             ammEmesso:800000000, rateo:0 },
  { valuta:"EUR", issuer:"HEIDELBERG MATERIALS AG",                     isin:"XS2577874782", name:"HEIG 3.750 05/31/32 MTN",       scadenza:"2032-05-31", callDate:"2032-02-29", cedola:3.75,  ask:103.799, yldYtm:3.112654, yldToCall:3.091131, duration:5.187,  taglioMin:1000, incrMin:1, rating:"BBB",  peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Basic Materials",        ammEmesso:750000000, rateo:0 },
  { valuta:"EUR", issuer:"DEUTSCHE LUFTHANSA AG",                       isin:"XS2892988192", name:"LHAG 4.125 09/03/32 MTN",       scadenza:"2032-09-03", callDate:"2032-06-03", cedola:4.125, ask:105.504, yldYtm:3.210796, yldToCall:3.180804, duration:5.3817, taglioMin:1000, incrMin:1, rating:"BBB-", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Industrials",           ammEmesso:500000000, rateo:0 },
];

const MONTHS      = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const MONTHS_FULL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const FREQ_LABEL  = { 0:"Zero Cpn", 1:"Annuale", 2:"Semestrale", 4:"Trimestrale", 12:"Mensile" };

// ─── LOGICA FINANZIARIA ───────────────────────────────────────────────────────
// Calcolo mesi cedola dalla frequenza (couponFreq) e dalla data di scadenza
function getCouponMonths(bond) {
  const freq = bond.couponFreq || 1;
  if (freq === 0) return [];
  const matMonth = new Date(bond.scadenza).getMonth() + 1; // 1-12
  if (freq >= 12) return [1,2,3,4,5,6,7,8,9,10,11,12];
  const interval = Math.round(12 / freq);
  const months = [];
  for (let i = 0; i < freq; i++) {
    let m = matMonth - interval * i;
    while (m <= 0) m += 12;
    months.push(m);
  }
  return [...new Set(months)].sort((a, b) => a - b);
}

// Dirty price = Ask (clean) + Rateo cedola maturato
// Il rateo viene letto dal CSV (colonna "Accrued"), default 0 se assente
const calcDirtyPrice    = (b)   => (b.ask||0) + (b.rateo||0);
// Esborso = importo allocato (peso% × totale investito)
// ARCHITETTURA: t = NOMINALE TOTALE portafoglio (input utente)
// nominale per bond = peso% × nominale portafoglio
const calcNominale      = (b,t) => (b.peso/100)*t;
// esborso per bond = nominale × (dirty price / 100) — OUTPUT calcolato
const calcEsborso       = (b,t) => calcNominale(b,t) * (calcDirtyPrice(b)/100);
const calcEffettivo     = calcEsborso;                              // alias interno
const calcCouponAnnuo   = (b,t) => calcNominale(b,t)*(b.cedola/100);
const calcCouponSingolo = (b,t) => { const m=getCouponMonths(b); return m.length?calcCouponAnnuo(b,t)/m.length:0; };
// Current Yield sempre su clean price (Ask), convenzione di mercato
const calcCurrentYield  = (b)   => b.cedola/(b.ask/100);

const fe  = (n) => "€"+Number(n).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const fn  = (n) => Number(n).toLocaleString("it-IT",{maximumFractionDigits:0});
const fp  = (n,d=3) => Number(n).toFixed(d)+"%";
// ─── HELPERS TAGLIO/INCREMENTO ───────────────────────────────────────────────
// Verifica se un nominale rispetta taglio minimo e multiplo di incremento
const checkNominale = (nom, taglioMin, incrMin) => {
  const tm = Math.max(taglioMin > 0 ? taglioMin : 1000, 1000); // min effettivo sempre ≥ 1000
  const im = incrMin   > 0 ? incrMin   : 1;
  if(nom < tm) return { ok:false, reason:`< taglio min ${tm.toLocaleString("it-IT")}` };
  if(im > 1 && Math.round((nom - tm) % im) !== 0)
    return { ok:false, reason:`non multiplo di ${im.toLocaleString("it-IT")}` };
  return { ok:true };
};

// Converte YYYY-MM-DD → DD/MM/YYYY per la visualizzazione (convenzione europea)
const fmtDate = (s) => {
  if(!s) return "—";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

// Seniority semplificata
function normalizeSeniority(raw="") {
  const r = raw.toLowerCase();
  if (r.includes("at1")||r.includes("additional tier 1")||r.includes("coco")) return "AT1";
  if (r.includes("tier 2")||r.includes("t2")||r.includes("junior sub")) return "Tier 2";
  if (r.includes("senior secured")) return "Senior Secured";
  return "Senior Unsecured";
}
// Tipo cedola semplificato
function normalizeCouponType(raw="") {
  const r = raw.toLowerCase();
  if (r.includes("zero")) return "Zero Coupon";
  if (r.includes("step")) return "Step Up";
  if (r.includes("inflaz")||r.includes("cpi")||r.includes("linker")) return "Inflazione";
  if (r.includes("variable")||r.includes("float")||r.includes("variab")) return "Variable";
  return "Fixed";
}

// ─── CSV PARSER — robusto per il formato reale ───────────────────────────────
//
// Gestisce tutte le quirks del CSV reale:
//  • Encoding latin-1 / UTF-8 / UTF-8-BOM
//  • Riga 0 di metadati opzionale (es. ";;27/02/2026;Dati indicativi...")
//  • Header alla riga 0 o 1 (auto-detect dalla presenza di "ISIN")
//  • Separatore ; o , o \t (auto-detect)
//  • Date formato DD/MM/YYYY  oppure  YYYY-MM-DD  oppure  MM/DD/YYYY
//  • Numeri con virgola decimale: "2,00" "88,67"
//  • Peso con simbolo %: "25,0%" o decimale 0.25
//  • NULL come stringa per valori assenti
//  • Ammontare emesso con $, punti migliaia, virgola decimale: " $1.400.000.000,00 "
//  • Righe finali spurie (totali, righe vuote) — ignorate automaticamente
//
function parseCSV(text) {
  // 1. Strip BOM (UTF-8: \uFEFF, Latin-1 può avere altri artefatti)
  let raw = text.replace(/^\uFEFF/, "").replace(/^\xFF\xFE/, "").trim();

  // 2. Split righe (CRLF o LF)
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return { error: "CSV non valido: meno di 2 righe." };

  // 3. Auto-detect separatore
  const firstFull = lines[0] + (lines[1] || "");
  const sep = firstFull.includes(";") ? ";" : firstFull.includes("\t") ? "\t" : ",";

  // 4. Auto-detect riga header: cerca la riga che contiene "isin" (case-insensitive)
  //    Salta righe di metadati iniziali (es. la riga con la data del file)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].toLowerCase().includes("isin")) { headerIdx = i; break; }
  }
  if (headerIdx < 0) return { error: "Header non trovato: nessuna colonna 'ISIN' nelle prime 5 righe." };

  // 5. Parsing header — normalizza: minuscolo, trim, rimuovi quotes e spazi interni multipli
  const hdrs = lines[headerIdx]
    .split(sep)
    .map(h => h.trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " "));

  const ix = (...aliases) => {
    for (const a of aliases) {
      const i = hdrs.indexOf(a.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const c = {
    valuta:    ix("valuta","currency","ccy","curr"),
    issuer:    ix("issuer name","issuer","emittente","issuer_name"),
    isin:      ix("isin"),
    name:      ix("security name","security_name","name","nome","titolo"),
    scadenza:  ix("scadenza","maturity","scad","maturity date"),
    callDate:  ix("call date","calldate","call_date","call"),
    cedola:    ix("cedola","coupon","cedola%","coupon%","tasso cedola"),
    ask:       ix("ask","ask price","prezzo","price"),
    yldYtm:    ix("yld ytm ask","yldytm","ytm","yield","rendimento","yld_ytm_ask","yld to mat"),
    yldToCall: ix("yld to call","yldtocall","ytc","yld_to_call","yield to call"),
    duration:  ix("duration","dur","durata","modified duration","mod duration"),
    taglioMin: ix("taglio minimo","tagliomin","taglio_min","taglio","min denomination","min. denom"),
    incrMin:   ix("incremento minimo","incremento_minimo","min increment","min. increment","incr min","increment"),
    rating:    ix("rating"),
    peso:      ix("peso","peso%","weight","controvalore","allocation","alloc%"),
    tipo:      ix("tipo","type","categoria","asset type"),
    seniority: ix("seniority","subordinazione","seniorita","debt type"),
    tipoCedola:ix("tipo cedola","tipocedola","coupon type","tipo_cedola","coupon frequency type"),
    couponFreq:ix("coupon fred","couponfreq","coupon freq","frequenza","freq","coupon frequency"),
    sector:    ix("economic sector","economic_sector","sector","settore","industry"),
    ammEmesso: ix("ammontare emesso","ammemesso","amm emesso","issued amount","ammontare_emesso","issue size"),
    rateo:     ix("accrued","rateo","accrued interest","rateo cedola","accrued_interest"),
  };

  // 6. Helper: pulisce stringa raw di una cella
  const g = (row, k) => {
    if (c[k] < 0) return "";
    const v = row[c[k]];
    return v !== undefined ? v.trim().replace(/^["']|["']$/g, "") : "";
  };

  // 7. Helper: parse numero da formato IT/EN con $, %, punti migliaia, virgola decimale
  const parseNum = (s, def = 0) => {
    if (!s) return def;
    let v = s.trim()
      .replace(/\$/g, "")    // rimuovi simbolo $
      .replace(/€/g, "")     // rimuovi simbolo €
      .replace(/\s/g, "")    // rimuovi spazi
      .replace(/%$/, "");    // rimuovi % finale
    // Gestisci separatori migliaia/decimali
    // Caso IT: "1.400.000,00" → punti=migliaia, virgola=decimale
    // Caso EN: "1,400,000.00" → virgole=migliaia, punto=decimale
    if (v.includes(",") && v.includes(".")) {
      // Entrambi presenti: l'ultimo è il decimale
      const lastComma = v.lastIndexOf(",");
      const lastDot   = v.lastIndexOf(".");
      if (lastComma > lastDot) {
        // virgola è decimale → rimuovi punti, sostituisci virgola con punto
        v = v.replace(/\./g, "").replace(",", ".");
      } else {
        // punto è decimale → rimuovi virgole
        v = v.replace(/,/g, "");
      }
    } else if (v.includes(",")) {
      // Solo virgola: può essere decimale (IT) o migliaia (EN con >1 virgola)
      const commaCount = (v.match(/,/g) || []).length;
      if (commaCount > 1) v = v.replace(/,/g, ""); // migliaia
      else v = v.replace(",", ".");                  // decimale
    }
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  };

  // 8. Helper: parse peso gestendo % e formato decimale
  const parsePeso = (s) => {
    if (!s) return 0;
    const hasPct = s.includes("%");
    const n = parseNum(s);
    if (hasPct) return n;           // "25,0%" → 25.0
    if (n > 0 && n <= 1) return n * 100; // 0.25 → 25.0
    return n;                       // già percentuale intera
  };

  // 9. Helper: converte data DD/MM/YYYY o MM/DD/YYYY o YYYY-MM-DD → YYYY-MM-DD
  const parseDate = (s) => {
    if (!s || s.trim().toUpperCase() === "NULL" || s.trim() === "") return "";
    s = s.trim();
    // ISO già corretto
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    // DD/MM/YYYY  (formato europeo — il più comune nei file IT)
    const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) {
      const [, a, b, year] = m;
      // Se primo campo > 12 è sicuramente il giorno
      if (parseInt(a) > 12) return `${year}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
      // Altrimenti assumiamo DD/MM (europeo)
      return `${year}-${b.padStart(2,"0")}-${a.padStart(2,"0")}`;
    }
    return "";
  };

  // 10. Helper: null check
  const isNull = (s) => !s || s.trim().toUpperCase() === "NULL" || s.trim() === "NULL;";

  // 11. Scansiona righe dati (dopo l'header, fino alla fine)
  const bonds = [], errs = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // riga vuota

    const row = line.split(sep);

    // Salta righe prive di ISIN valido (righe totale, footer, ecc.)
    const isinRaw = c.isin >= 0 ? (row[c.isin] || "").trim().replace(/['"]/g, "") : "";
    if (!isinRaw || isinRaw.length < 8 || /^;+$/.test(line)) continue;

    // Salta righe che sembrano subtotali (solo Peso popolato, resto vuoto)
    const nonEmptyCells = row.filter(x => x.trim() && x.trim().toUpperCase() !== "NULL").length;
    if (nonEmptyCells < 4) continue;

    const callRaw  = g(row, "callDate");
    const ytcRaw   = g(row, "yldToCall");
    const durRaw   = g(row, "duration");

    // Inferisci tipo da issuer/nome se non presente
    const tipoRaw = g(row, "tipo");
    let tipo = tipoRaw || "Corporate";
    if (!tipoRaw) {
      const issLow = g(row, "issuer").toLowerCase() + g(row, "name").toLowerCase();
      if (issLow.includes("government") || issLow.includes("republic") ||
          issLow.includes("kingdom")    || issLow.includes("gv ") ||
          issLow.includes("bund")       || issLow.includes("treasury")) {
        tipo = "Governativo";
      } else if (issLow.includes("bank") || issLow.includes("reconstruction") ||
                 issLow.includes("invest") || issLow.includes("ebrd") ||
                 issLow.includes("eib")    || issLow.includes("world bank") ||
                 issLow.includes("cassa depositi")) {
        tipo = "Sovranazionale";
      }
    }

    bonds.push({
      valuta:     g(row, "valuta")  || "EUR",
      issuer:     g(row, "issuer")  || "—",
      isin:       isinRaw,
      name:       g(row, "name")    || isinRaw,
      scadenza:   parseDate(g(row, "scadenza")),
      callDate:   isNull(callRaw)   ? "" : parseDate(callRaw),
      cedola:     parseNum(g(row, "cedola")),
      ask:        parseNum(g(row, "ask"), 100),
      yldYtm:     parseNum(g(row, "yldYtm")),
      yldToCall:  isNull(ytcRaw)    ? null : parseNum(ytcRaw) || null,
      duration:   isNull(durRaw)    ? null : parseNum(durRaw) || null,
      taglioMin:  parseNum(g(row, "taglioMin"), 1000),
      incrMin:    c.incrMin >= 0 ? parseNum(g(row, "incrMin"), 1) : 1,
      rating:     g(row, "rating")  || "ND",
      peso:       parsePeso(g(row, "peso")),
      tipo,
      seniority:  normalizeSeniority(g(row, "seniority")),
      tipoCedola: normalizeCouponType(g(row, "tipoCedola")),
      couponFreq: parseNum(g(row, "couponFreq"), 1) || 1,
      sector:     g(row, "sector")  || "—",
      ammEmesso:  parseNum(g(row, "ammEmesso")),
      rateo:      c.rateo >= 0 ? parseNum(g(row, "rateo"), 0) : 0,
    });
  }

  if (!bonds.length) return { error: "Nessun titolo valido trovato. Verifica che il file abbia una colonna ISIN." };
  return { bonds, errs };
}

function downloadCSVTemplate() {
  // 18 colonne — formato esatto del file di caricamento ufficiale
  // Separatore: ; | Date: GG/MM/AAAA | Decimali: virgola | Peso: con % | NULL per valori assenti
  const HDR = "Valuta;Issuer Name;ISIN;Security Name;Scadenza;Call Date;Cedola;Ask;Yld Ytm Ask;Yld to Call;Duration;Taglio Minimo;Incremento minimo;Rating;Peso;Tipo Cedola;Seniority;Coupon Fred;Economic Sector;Accrued";
  const EX1 = "EUR;EXAMPLE CORP SPA;XS1234567890;EXCORP 3.500 15/01/30;15/01/2030;15/10/2029;3,50;101,50;3,20;3,10;4,80;1000;BBB+;10,00%;Fixed:Plain Vanilla Fixed Coupon;Senior Unsecured;1;Utilities;0,35";
  const EX2 = "EUR;EXAMPLE ISSUER GOV;IT0000000001;ITGV 2.000 01/03/31;01/03/2031;NULL;2,00;98,50;2,35;NULL;5,20;1000;BBB+;15,00%;Fixed:Plain Vanilla Fixed Coupon;Senior Unsecured;2;Government Activity;0,45";
  const EX3 = "EUR;EXAMPLE BANK AT1;XS9999999999;EXBK 5.000 01/06/32;01/06/2032;01/03/2032;5,00;99,00;5,15;5,10;4,20;200000;BB+;5,00%;Fixed:Plain Vanilla Fixed Coupon;AT1;1;Financials;1,20";
  const rows = [HDR, EX1, EX2, EX3].join("\r\n");

  const legend = [
    ["Valuta",        "Codice ISO: EUR, USD, GBP…"],
    ["Issuer Name",   "Nome emittente (testo libero)"],
    ["ISIN",          "Codice ISIN 12 caratteri"],
    ["Security Name", "Nome del titolo"],
    ["Scadenza",      "GG/MM/AAAA"],
    ["Call Date",     "GG/MM/AAAA oppure NULL"],
    ["Cedola",        "Tasso % con virgola: 3,50"],
    ["Ask",           "Prezzo con virgola: 101,50"],
    ["Yld Ytm Ask",   "YTM con virgola: 3,20"],
    ["Yld to Call",   "YTC con virgola, oppure NULL"],
    ["Duration",      "Modified duration, oppure NULL"],
    ["Taglio Minimo",     "Intero: 1000, 200000, 1…"],
    ["Incremento minimo", "Intero: multiplo minimo acquistabile sopra il taglio. Es: 10 → 1000, 1010, 1020…"],
    ["Rating",        "AAA / AA+ / BBB- / ND …"],
    ["Peso",          "Percentuale con %: 10,00%"],
    ["Tipo Cedola",   "Fixed:Plain Vanilla Fixed Coupon | Variable: Step Up/Step Down | …"],
    ["Seniority",     "Senior Unsecured | Senior Secured | Tier 2 | AT1 | Junior Subordinated"],
    ["Coupon Fred",   "Frequenza annua: 1=annuale 2=semestrale 4=trimestrale 12=mensile"],
    ["Economic Sector","Government Activity | Utilities | Financials | Healthcare | …"],
    ["Accrued",       "Rateo cedola maturato in % — es. 0,35. Da Bloomberg: campo AI. Default: 0"],
  ].map(([col,desc]) =>
    `<tr><td style="padding:4px 10px;font-weight:700;white-space:nowrap;font-family:monospace;font-size:11px">${col}</td>` +
    `<td style="padding:4px 10px;font-size:11px;color:#374151">${desc}</td></tr>`
  ).join("");

  const w = window.open("", "_blank", "width=960,height=600");
  if (w) {
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Template CSV — BondAnalyst</title>
    <style>body{font-family:-apple-system,sans-serif;padding:28px;background:#fafafa;color:#111}
    h2{font-size:16px;font-weight:800;margin:0 0 4px}
    .sub{font-size:12px;color:#6b7280;margin-bottom:18px}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px}
    .card h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin:0 0 10px}
    pre{background:#f4f4f0;border-radius:6px;padding:12px;font-size:10.5px;overflow-x:auto;white-space:pre;line-height:1.6;border:1px solid #e5e7eb}
    table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #f3f4f6;vertical-align:top}
    tr:last-child td{border:none}
    .badge{display:inline-block;background:#f5c842;color:#111;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-right:6px}
    .btn{display:inline-block;background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;margin-bottom:16px}
    </style></head><body>
    <h2>Template CSV — BondAnalyst</h2>
    <div class="sub">
      <span class="badge">;</span> Separatore punto e virgola &nbsp;|&nbsp;
      <span class="badge">GG/MM/AAAA</span> Formato date &nbsp;|&nbsp;
      <span class="badge">,</span> Decimale virgola &nbsp;|&nbsp;
      <span class="badge">%</span> Peso con simbolo percentuale
    </div>
    <button class="btn" onclick="
      const pre = document.querySelector('pre');
      navigator.clipboard.writeText(pre.textContent).then(()=>{this.textContent='✓ Copiato!';setTimeout(()=>this.textContent='📋 Copia CSV',1500)});
    ">📋 Copia CSV</button>
    <div class="card">
      <h3>CSV da copiare e salvare come .csv</h3>
      <pre>${rows}</pre>
    </div>
    <div class="card">
      <h3>Guida alle colonne (18 colonne, separatore ;)</h3>
      <table><tbody>${legend}</tbody></table>
    </div>
    </body></html>`);
    w.document.close();
  }
}

// ─── REPORT CONFIG — personalizza qui logo, font e disclaimer ────────────────
//
// PRODUZIONE: per aggiornare logo o font senza toccare il codice,
// metti i file in /public/ del progetto Vercel e aggiorna i path qui sotto.
//
// LOGO
//   • In sviluppo: embedded come base64 (zero dipendenze esterne)
//   • In produzione: sostituisci LOGO_SRC con il path pubblico, es:
//       const LOGO_SRC = "/assets/logo.png";
//   • Formato consigliato: PNG con sfondo trasparente, versione bianca
//     (il logo appare su header scuro #1a1a1a)
//
// FONT
//   • In sviluppo: usa font di sistema (san-serif stack)
//   • In produzione: carica da /public/fonts/ con @font-face, es:
//       const CUSTOM_FONT_URL = "/fonts/Inter.woff2";
//   • Oppure usa Google Fonts CDN (richiede connessione internet al momento della stampa)
//
// DISCLAIMER
//   • Modifica il testo in DISCLAIMER_TEXT — supporta HTML
//   • La pagina disclaimer viene aggiunta automaticamente in fondo al report
//
const REPORT_CONFIG = {
  // ── Branding ──────────────────────────────────────────────────────────
  firmName:    "Banca Patrimoni",
  reportTitle: "Analisi Portafoglio Obbligazionario",

  // Logo: base64 embedded (sostituire con path /public/... in produzione)
  // Per aggiornare: convertire il PNG in base64 con:
  //   node -e "console.log(require('fs').readFileSync('logo.png').toString('base64'))"
  // e incollare qui sotto tra le virgolette
  logoBase64: "iVBORw0KGgoAAAANSUhEUgAAB9AAAAG3CAYAAADsGc6hAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAARQ0lEQVR4nO3ZQQ0AIBDAsIF/z4cMSGgV7L81MxMAAAAAAAAAfG7fDgAAAAAAAACAFxjoAAAAAAAAAJCBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAACVgQ4AAAAAAAAAlYEOAAAAAAAAAJWBDgAAAAAAAABVHWarB2riI2a+AAAAAElFTkSuQmCC",
  logoPublicPath: "/assets/LOGO_positivo.png",  // file in /public/assets/

  // ── Font personalizzato ───────────────────────────────────────────────
  // In sviluppo: lascia fontFaceCSS vuoto per usare il font di sistema
  // In produzione: incolla qui il @font-face CSS, es:
  // fontFaceCSS: `@font-face { font-family:'MyFont'; src:url('/fonts/MyFont.woff2') format('woff2'); }`
  fontFaceCSS:   "@font-face{font-family:'SellaStencil';src:url('/assets/FONT SELLA WOFF/Sella Stencil/SellaStencil-RegularWEB.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap;}",
  fontFamily:    "'SellaStencil',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",

  // ── Disclaimer ────────────────────────────────────────────────────────
  // disc.txt: testo plain in /public/assets/disc.txt
  // Paragrafi separati da riga vuota → convertiti in <p> automaticamente
  // Se il file non esiste viene usato disclaimerText sotto come fallback
  disclaimerTitle: "Note Legali e Disclaimer",
  disclaimerText: `
    <p>Il presente documento è stato redatto da <b>Banca Patrimoni</b> a puro scopo informativo
    e non costituisce offerta, sollecitazione o raccomandazione di investimento ai sensi
    del D.Lgs. 58/1998 (TUF) e della Direttiva MiFID II (2014/65/UE).</p>

    <p>Le informazioni contenute nel report si basano su dati di mercato indicativi alla data
    di generazione del documento. I prezzi, i rendimenti e le valutazioni riportati sono
    forniti a titolo indicativo e potrebbero non riflettere le condizioni effettive di mercato
    al momento dell'esecuzione di eventuali operazioni.</p>

    <p>I rendimenti passati non sono indicativi di quelli futuri. Il valore degli strumenti
    finanziari e il reddito da essi derivante possono aumentare così come diminuire, con
    la possibilità che l'investitore non recuperi l'intero capitale investito.</p>

    <p>Le obbligazioni sono soggette a rischio di credito (default dell'emittente), rischio
    di tasso di interesse, rischio di liquidità e, per gli strumenti denominati in valuta
    estera, rischio di cambio. I titoli con rating inferiore a investment grade comportano
    un rischio di credito significativamente più elevato.</p>

    <p>Il presente documento non tiene conto della situazione finanziaria, degli obiettivi
    di investimento, della propensione al rischio o dell'orizzonte temporale specifici del
    singolo investitore. Prima di effettuare qualsiasi decisione di investimento si raccomanda
    di consultare il proprio consulente finanziario.</p>

    <p>Banca Patrimoni non si assume alcuna responsabilità per eventuali perdite o danni
    derivanti dall'utilizzo delle informazioni contenute nel presente documento.
    Questo report è destinato esclusivamente al destinatario indicato e non può essere
    riprodotto, distribuito o trasmesso a terzi senza il preventivo consenso scritto di
    Banca Patrimoni.</p>

    <p style="margin-top:16px;font-size:9px;color:#9ca3af">
    Banca Patrimoni S.p.A. — Soggetta a vigilanza di Banca d'Italia e CONSOB.
    Iscritta all'Albo delle Banche n. XXXX. Capitale sociale € XXXXXXX i.v.
    Sede legale: Via XXXX, XX — XXXXX Milano (MI).
    </p>
  `,
};

// Helper per ottenere la src del logo (path pubblico o base64)
function getLogoSrc() {
  if (REPORT_CONFIG.logoPublicPath) return REPORT_CONFIG.logoPublicPath;
  if (REPORT_CONFIG.logoBase64)
    return `data:image/png;base64,${REPORT_CONFIG.logoBase64}`;
  return "";
}

// ─── EXPORT EXCEL ────────────────────────────────────────────────────────────
//
// 4 fogli:
//   1. Riepilogo    — KPI aggregati del portafoglio
//   2. Titoli       — dettaglio per bond con tutti i campi
//   3. Flusso Ced.  — matrice mesi × bond (come tab Cedole)
//   4. Flussi Anno  — cash flow pluriennali (cedole + rimborsi)
//
async function exportExcel(bonds, totale, stats, monthlyData) {
  // Carica SheetJS via CDN solo al primo utilizzo (lazy load)
  let XLSX;
  if(window._XLSX) {
    XLSX = window._XLSX;
  } else {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => { XLSX = window.XLSX; window._XLSX = window.XLSX; resolve(); };
      s.onerror = () => reject(new Error('Impossibile caricare SheetJS'));
      document.head.appendChild(s);
    });
    XLSX = window.XLSX;
  }
  if(!XLSX) { alert('Errore caricamento libreria Excel. Verifica la connessione.'); return; }
  const wb   = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString("it-IT");

  const num2 = (n)=>Math.round(n*100)/100;
  const num4 = (n)=>Math.round(n*10000)/10000;

  // ── Foglio 1: Riepilogo ────────────────────────────────────────────────────
  const totNom = bonds.reduce((s,b)=>s+calcNominale(b,totale),0);
  const totEff = bonds.reduce((s,b)=>s+calcEsborso(b,totale),0);
  const totCed = bonds.reduce((s,b)=>s+calcCouponAnnuo(b,totale),0);
  const riepilogo = [
    ["RIEPILOGO PORTAFOGLIO", ""],
    ["Data generazione", today],
    [""],
    ["Metrica",              "Valore"],
    ["N° Titoli",            bonds.length],
    ["Nominale Portafoglio (€)",num2(totNom)],
    ["Esborso Effettivo (€)",  num2(totEff)],
    ["Disaggio/Premio (€)",  num2(totNom-totEff)],
    ["YTM Ponderato (%)",    num4(stats.wtdYtm)],
    ["Cedola Media (%)",     num4(stats.wtdCedola)],
    ["Duration Ponderata",   num2(stats.wtdDuration)],
    ["Rating Medio",         stats.wtdRating],
    ["Cedola Annua (€)",     num2(totCed)],
    ["Titoli con Call",      bonds.filter(b=>b.callDate).length],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(riepilogo);
  ws1["!cols"] = [{wch:28},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws1, "Riepilogo");

  // ── Foglio 2: Titoli ───────────────────────────────────────────────────────
  const hdrs2 = ["ISIN","Emittente","Tipo","Seniority","Settore","Scadenza","Call",
    "CCY","Cedola%","Ask","Rateo","Dirty","YTM%","YTC%","Duration","Rating",
    "Peso%","Nominale €","Esborso €","Ced.Ann €","CY%"];
  const rows2 = bonds.map(b=>[
    b.isin, b.issuer||b.name, b.tipo, b.seniority, b.sector,
    b.scadenza, b.callDate||"", b.valuta,
    num4(b.cedola), num2(b.ask), num4(b.rateo||0), num2(calcDirtyPrice(b)),
    num4(b.yldYtm), b.yldToCall?num4(b.yldToCall):"",
    b.duration?num2(b.duration):"", b.rating,
    num4(b.peso), num2(calcNominale(b,totale)),
    num2(calcEsborso(b,totale)), num2(calcCouponAnnuo(b,totale)),
    num2(calcCurrentYield(b)),
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([hdrs2,...rows2]);
  ws2["!cols"] = [14,26,12,16,20,12,12,6,8,8,8,8,8,8,8,8,8,14,14,12,8].map(w=>({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws2, "Titoli");

  // ── Foglio 3: Flusso Cedolare mensile ─────────────────────────────────────
  const MESI = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
  const hdrs3 = ["ISIN","Emittente","Freq",...MESI,"Tot. Annuo"];
  const rows3 = bonds.map(b=>{
    const mesi = getCouponMonths(b);
    const sing = mesi.length ? calcCouponAnnuo(b,totale)/mesi.length : 0;
    const cells = MESI.map((_,mi)=>mesi.includes(mi+1)?num2(sing):0);
    return [b.isin, b.issuer||b.name, b.couponFreq||1, ...cells, num2(calcCouponAnnuo(b,totale))];
  });
  // Riga totale
  const totRow3 = ["","TOTALE","",...MESI.map((_,mi)=>
    num2(bonds.reduce((s,b)=>{
      const mesi=getCouponMonths(b);
      return mesi.includes(mi+1)?s+calcCouponSingolo(b,totale):s;
    },0))
  ), num2(totCed)];
  const ws3 = XLSX.utils.aoa_to_sheet([hdrs3,...rows3,totRow3]);
  ws3["!cols"] = [{wch:14},{wch:26},{wch:6},...MESI.map(()=>({wch:10})),{wch:12}];
  XLSX.utils.book_append_sheet(wb, ws3, "Flusso Cedolare");

  // ── Foglio 4: Flussi pluriennali ──────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({length:16},(_,i)=>currentYear+i);
  const hdrs4 = ["Anno","Cedole €","Rimb. Scadenza €","Rimb. Call €","Tot. Rimborsi €","Totale Anno €","% Portafoglio"];
  // Stessa logica della dashboard: exit = min(call, scadenza)
  const bondExitXl = (b) => {
    const d = b.callDate ? new Date(b.callDate) : (b.scadenza ? new Date(b.scadenza) : null);
    return d ? {yr:d.getFullYear(), mo:d.getMonth()+1} : {yr:9999, mo:12};
  };
  const rows4 = YEARS.map(yr=>{
    const cedole = bonds.reduce((s,b)=>{
      const exit=bondExitXl(b);
      if(exit.yr<yr) return s;
      const freq=b.couponFreq||1; if(!freq) return s;
      const cedS=calcCouponSingolo(b,totale);
      if(exit.yr===yr){
        const pays=getCouponMonths(b).filter(m=>m<=exit.mo).length;
        return s+cedS*pays;
      }
      return s+cedS*freq;
    },0);
    const rimCall=bonds.reduce((s,b)=>b.callDate&&new Date(b.callDate).getFullYear()===yr?s+calcNominale(b,totale):s,0);
    const rimMat=bonds.reduce((s,b)=>{
      if(b.callDate) return s;
      return b.scadenza&&new Date(b.scadenza).getFullYear()===yr?s+calcNominale(b,totale):s;
    },0);
    const rim=rimCall+rimMat, tot=cedole+rim;
    return [yr, num2(cedole), num2(rimMat), num2(rimCall), num2(rim), num2(tot),
            totale>0?num2((tot/totale)*100):0];
  }).filter(r=>r[5]>0);
  const ws4 = XLSX.utils.aoa_to_sheet([hdrs4,...rows4]);
  ws4["!cols"] = [{wch:6},{wch:14},{wch:18},{wch:14},{wch:16},{wch:14},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws4, "Flussi Pluriennali");

  // Download
  const fname = `portafoglio_${today.replace(/\//g,"-")}.xlsx`;
  XLSX.writeFile(wb, fname);
}

// ─── HELPERS REPORT ──────────────────────────────────────────────────────────
// Genera una sezione di composizione HTML con barre CSS colorate
function buildCompositionSection(title, data, colorMap) {
  const max = Math.max(...data.map(d=>d.peso), 1);
  const rows = data.map(d=>{
    const col = colorMap[d.name] || "#94a3b8";
    const pct = Number(d.peso).toFixed(1);
    const bar = Math.round((d.peso/max)*100);
    return `<tr>
      <td style="padding:5px 8px;font-size:10px;white-space:nowrap;width:130px;color:#374151;font-weight:600">${d.name}</td>
      <td style="padding:5px 8px;width:100%">
        <div style="background:#f3f4f6;border-radius:4px;overflow:hidden;height:14px">
          <div style="background:${col};width:${bar}%;height:14px;border-radius:4px;transition:width 0.3s"></div>
        </div>
      </td>
      <td style="padding:5px 8px;font-size:10px;font-weight:700;color:${col};white-space:nowrap;text-align:right">${pct}%</td>
    </tr>`;
  }).join("");
  return `<div style="break-inside:avoid;margin-bottom:14px">
    <div style="font-size:9px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">${title}</div>
    <table style="width:100%;border-collapse:collapse;margin:0"><tbody>${rows}</tbody></table>
  </div>`;
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
async function openReport(bonds,totale,stats,monthlyData) {
  const today    = new Date().toLocaleDateString("it-IT");
  // Carica disclaimer da /public/assets/disc.txt (nel repo Vercel)
  // Fallback automatico al testo in REPORT_CONFIG.disclaimerText
  let disclaimerHTML = REPORT_CONFIG.disclaimerText;
  try {
    const resp = await fetch("/assets/disc.txt");
    if (resp.ok) {
      const raw = await resp.text();
      // Testo plain → HTML: paragrafi separati da riga vuota
      disclaimerHTML = raw
        .split(/\n{2,}/)
        .map(p => p.trim()).filter(Boolean)
        .map(p => `<p style="margin-bottom:10px">${p.replace(/\n/g,"<br/>")}</p>`)
        .join("");
    }
  } catch(e) { console.warn("disc.txt non trovato, uso disclaimer di default"); }

  const totNom   = bonds.reduce((s,b)=>s+calcNominale(b,totale),0);
  const totEff   = bonds.reduce((s,b)=>s+calcEffettivo(b,totale),0);
  const totCed   = bonds.reduce((s,b)=>s+calcCouponAnnuo(b,totale),0);
  const ytmMin   = bonds.length ? Math.min(...bonds.map(b=>b.yldYtm)) : 0;
  const ytmMax   = bonds.length ? Math.max(...bonds.map(b=>b.yldYtm)) : 0;
  const logoSrc  = getLogoSrc();
  const fontFace = REPORT_CONFIG.fontFaceCSS || "";
  const fontFam  = REPORT_CONFIG.fontFamily  || "-apple-system,sans-serif";

  // ── Tabella dettaglio titoli ──────────────────────────────────────────────
  const rows = bonds.map(b=>`<tr>
    <td style="font-size:9px;font-family:monospace;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.isin}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.issuer||b.name}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.tipo}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.seniority||""}</td>
    <td style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.sector||""}</td>
    <td>${fmtDate(b.scadenza)}</td><td style="color:${b.callDate?"#d97706":"#ccc"}">${fmtDate(b.callDate)}</td>
    <td align="right">${fp(b.cedola)}</td><td align="right">${Number(b.ask).toFixed(3)}</td>
    <td align="right"><b style="color:#1a5276">${fp(b.yldYtm)}</b></td>
    <td align="right" style="color:#d97706">${b.yldToCall?fp(b.yldToCall):"—"}</td>
    <td align="right">${fp(b.peso,2)}</td>
    <td align="right" style="color:#15803d"><b>${fe(calcNominale(b,totale))}</b></td>
    <td align="right" style="color:#1e40af">${fe(calcEffettivo(b,totale))}</td>
    <td align="right" style="color:#92400e">${fe(calcCouponAnnuo(b,totale))}</td>
  </tr>`).join("");

  // ── Flusso cedolare ───────────────────────────────────────────────────────
  const cedRow = monthlyData.map(m=>
    `<td align="right" style="${m.cedola>0?"background:#fffbeb;color:#92400e;font-weight:700":"color:#ccc"}">${m.cedola>0?fe(m.cedola):"—"}</td>`
  ).join("");

  // ── Grafico scadenze/call in SVG puro ─────────────────────────────────────
  // Aggrega pesi per mese/anno, separando scadenza e call
  const scadMap = {}, callMap = {};
  bonds.forEach(b=>{
    if(b.scadenza){
      const k = b.scadenza.substring(0,7); // "YYYY-MM"
      scadMap[k] = (scadMap[k]||0) + b.peso;
    }
    if(b.callDate){
      const k = b.callDate.substring(0,7);
      callMap[k] = (callMap[k]||0) + b.peso;
    }
  });
  const allKeys = [...new Set([...Object.keys(scadMap),...Object.keys(callMap)])].sort();
  const svgW=680, svgH=160, padL=38, padR=12, padT=12, padB=36;
  const chartW = svgW-padL-padR, chartH = svgH-padT-padB;
  const maxPeso = Math.max(...allKeys.map(k=>(scadMap[k]||0)+(callMap[k]||0)), 1);
  const barW = Math.min(Math.floor(chartW/allKeys.length)-4, 36);
  const slot = chartW/allKeys.length;

  // Y axis ticks
  const yTicks = [0, Math.ceil(maxPeso/2), Math.ceil(maxPeso)];
  const yGrid  = yTicks.map(v=>{
    const y = padT + chartH - (v/maxPeso)*chartH;
    return `<line x1="${padL}" x2="${svgW-padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#f3f4f6" stroke-width="1"/>
            <text x="${(padL-4).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="8" fill="#9ca3af">${v.toFixed(0)}%</text>`;
  }).join("");

  const bars = allKeys.map((k,i)=>{
    const pM = scadMap[k]||0, pC = callMap[k]||0;
    const x  = padL + i*slot + (slot-barW)/2;
    // Label mese/anno abbreviato: "MM/YY"
    const [yr,mo] = k.split("-");
    const lbl = `${mo}/${yr.slice(2)}`;
    const bM  = (pM/maxPeso)*chartH, bC = (pC/maxPeso)*chartH;
    const yM  = padT+chartH-bM, yC = padT+chartH-bC;
    const bW2 = Math.max(Math.floor(barW/2)-1, 4);
    const xM  = x, xC = x+bW2+2;
    let out = `<text x="${(xM+barW/2).toFixed(1)}" y="${(padT+chartH+14).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#6b7280">${lbl}</text>`;
    if(pM>0) out += `<rect x="${xM.toFixed(1)}" y="${yM.toFixed(1)}" width="${bW2}" height="${bM.toFixed(1)}" fill="#3b82f6" rx="2"/>
      <text x="${(xM+bW2/2).toFixed(1)}" y="${(yM-3).toFixed(1)}" text-anchor="middle" font-size="7" fill="#3b82f6">${pM.toFixed(0)}%</text>`;
    if(pC>0) out += `<rect x="${xC.toFixed(1)}" y="${yC.toFixed(1)}" width="${bW2}" height="${bC.toFixed(1)}" fill="#f5c842" rx="2"/>
      <text x="${(xC+bW2/2).toFixed(1)}" y="${(yC-3).toFixed(1)}" text-anchor="middle" font-size="7" fill="#d97706">${pC.toFixed(0)}%</text>`;
    return out;
  }).join("");

  const legend = `<rect x="${padL}" y="${(svgH-10).toFixed(1)}" width="10" height="7" fill="#3b82f6" rx="1"/>
    <text x="${(padL+13).toFixed(1)}" y="${(svgH-4).toFixed(1)}" font-size="8" fill="#6b7280">A scadenza</text>
    <rect x="${(padL+80).toFixed(1)}" y="${(svgH-10).toFixed(1)}" width="10" height="7" fill="#f5c842" rx="1"/>
    <text x="${(padL+93).toFixed(1)}" y="${(svgH-4).toFixed(1)}" font-size="8" fill="#6b7280">A call</text>`;

  const svgChart = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="width:100%;max-width:${svgW}px">
    ${yGrid}${bars}${legend}
    <line x1="${padL}" x2="${padL}" y1="${padT}" y2="${padT+chartH}" stroke="#e5e7eb" stroke-width="1"/>
    <line x1="${padL}" x2="${svgW-padR}" y1="${(padT+chartH).toFixed(1)}" y2="${(padT+chartH).toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>
  </svg>`;

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Report Portafoglio · ${today}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
${fontFace}
body{font-family:${fontFam};font-size:11px;background:#fff;color:#111;padding:32px 36px}

/* ── Print rules ─────────────────────────────────────────────────────── */
/* Formato pagina — landscape per le tabelle larghe */
@page{size:A4 landscape;margin:12mm 10mm}

@media print{
  body{padding:10px 14px;font-size:10px}
  button{display:none!important}
  /* evita che le sezioni chiave vengano spezzate tra pagine */
  .no-break{break-inside:avoid;page-break-inside:avoid}
  /* forza nuova pagina prima delle sezioni principali (eccetto la prima) */
  .page-section{break-before:auto;page-break-before:auto}
  .page-section+.page-section{break-before:page;page-break-before:page}
  /* tabelle: header si ripete su ogni pagina, righe non si spezzano */
  thead{display:table-header-group}
  tr{break-inside:avoid;page-break-inside:avoid}
  /* grafici e card composizione non si spezzano */
  .chart-box{break-inside:avoid;page-break-inside:avoid}
  .comp-grid{break-inside:avoid;page-break-inside:avoid}
  .kpis{break-inside:avoid;page-break-inside:avoid}
  .hdr{break-inside:avoid;page-break-inside:avoid}
}

.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #f5c842;padding-bottom:14px;margin-bottom:20px}
h1{font-size:22px;font-weight:800;color:#1a1a1a}.sub{font-size:10px;color:#9ca3af;margin-top:3px}
.meta{font-size:10px;color:#6b7280;text-align:right;line-height:2}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:20px}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px}
.kpi.y{background:#fffbeb;border-color:#fde68a}
.kpi.g{background:#f0fdf4;border-color:#bbf7d0}
.kpi.r{background:#fff1f2;border-color:#fecdd3}
.kpi .l{font-size:7.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;font-weight:700}
.kpi .v{font-size:15px;font-weight:800;color:#1a1a1a}
.kpi.y .v{color:#92400e}.kpi.g .v{color:#15803d}.kpi.r .v{color:#dc2626}
.sec{font-size:9px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.1em;
  border-bottom:2px solid #f3f4f6;padding-bottom:5px;margin:18px 0 10px;display:flex;align-items:center;gap:8px;
  break-inside:avoid;page-break-inside:avoid}
.sec-note{font-size:9px;font-weight:400;color:#9ca3af;text-transform:none;letter-spacing:0}
/* Tabelle generali */
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th{background:#1a1a1a;color:#fff;padding:5px 5px;font-size:7.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
td{padding:4px 5px;border-bottom:1px solid #f3f4f6;font-size:9.5px}
tr:nth-child(even) td{background:#fafafa}
.tot td{font-weight:800;background:#fffbeb;border-top:2px solid #f5c842}
/* Tabella flusso cedolare per bond — compatta, scroll orizzontale su schermo */
.ced-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:16px}
.ced-table{border-collapse:collapse;font-size:9px;min-width:900px;width:100%}
.ced-table th{background:#1a1a1a;color:#fff;padding:5px 6px;font-size:7.5px;font-weight:700;text-transform:uppercase;white-space:nowrap;text-align:right}
.ced-table th:first-child,.ced-table th:nth-child(2){text-align:left}
.ced-table td{padding:5px 6px;border-bottom:1px solid #f3f4f6;text-align:right;font-family:monospace;white-space:nowrap}
.ced-table td:first-child{text-align:left;font-family:monospace;font-size:8.5px;color:#6b7280}
.ced-table td:nth-child(2){text-align:left;font-size:8.5px;color:#374151}
.ced-table td.pay{background:#fffbeb;color:#92400e;font-weight:700}
.ced-table td.empty{color:#d1d5db}
.ced-table .tot-row td{font-weight:800;background:#fffbeb;border-top:2px solid #f5c842;color:#92400e}
.ced-table .tot-row td:first-child,.ced-table .tot-row td:nth-child(2){background:#fffbeb}
.chart-box{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:16px;background:#fafafa;break-inside:avoid;page-break-inside:avoid}
.chart-title{font-size:8px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.comp-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;break-inside:avoid;page-break-inside:avoid}
.foot{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between;break-inside:avoid;page-break-inside:avoid}
/* Disclaimer paragraph spacing */
.disc-body p{margin-bottom:8px;orphans:3;widows:3}
.pbtn{display:inline-block;margin-bottom:16px;background:#f5c842;color:#1a1a1a;border:none;border-radius:8px;
  padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer}
</style></head><body>
<button class="pbtn" onclick="window.print()">🖨 Stampa / Salva PDF</button>

<div class="hdr">
  <div>
    <div style="font-size:9px;color:#9ca3af;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px">${REPORT_CONFIG.firmName.toUpperCase()} · ANALISI PORTAFOGLIO</div>
    <h1>${REPORT_CONFIG.reportTitle}</h1>
    <div class="sub">Generato il ${today} &nbsp;·&nbsp; ${bonds.length} titoli &nbsp;·&nbsp; ${bonds.filter(b=>b.callDate).length} con opzione call</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px">
    ${logoSrc ? `<div style="background:#1a1a1a;border-radius:8px;padding:8px 16px;display:inline-flex;align-items:center">
      <img src="${logoSrc}" alt="${REPORT_CONFIG.firmName}" style="height:28px;width:auto;display:block"/>
    </div>` : ""}
    <div class="meta">
      <div>Nominale portafoglio: <b style="color:#15803d">${fe(totNom)}</b></div>
      <div>Esborso effettivo: <b>${fe(totEff)}</b></div>
      <div>Disaggio/Premio: <b style="color:${totNom-totEff>=0?"#15803d":"#dc2626"}">${totNom-totEff>=0?"+":""}${fe(totNom-totEff)}</b></div>
    </div>
  </div>
</div>

<!-- KPI: 6 card su una riga -->
<div class="kpis no-break">
  <div class="kpi y"><div class="l">YTM Ponderato</div><div class="v">${fp(stats.wtdYtm)}</div></div>
  <div class="kpi"><div class="l">Cedola Media</div><div class="v">${fp(stats.wtdCedola)}</div></div>
  <div class="kpi"><div class="l">Duration Media</div><div class="v">${Number(stats.wtdDuration).toFixed(2)} a</div></div>
  <div class="kpi"><div class="l">Rating Medio</div><div class="v" style="color:${({"AAA":"#059669","AA+":"#10b981","AA":"#34d399","AA-":"#6ee7b7","A+":"#3b82f6","A":"#60a5fa","A-":"#93c5fd","BBB+":"#8b5cf6","BBB":"#a78bfa","BBB-":"#c4b5fd","BB+":"#ef4444","BB":"#f87171","ND":"#9ca3af"})[stats.wtdRating]||"#6b7280"}">${stats.wtdRating}</div></div>
  <div class="kpi y"><div class="l">Nominale (input)</div><div class="v">${fe(totNom)}</div></div>
  <div class="kpi y"><div class="l">Cedola Annua</div><div class="v">${fe(totCed)}</div></div>
</div>

<!-- Dettaglio Titoli -->
<div class="page-section">
<div class="sec">Dettaglio Titoli</div>
<table style="table-layout:fixed;width:100%"><thead><tr>
  <th style="width:9%">ISIN</th>
  <th style="width:14%">Emittente</th>
  <th style="width:8%">Tipo</th>
  <th style="width:10%">Seniority</th>
  <th style="width:9%">Settore</th>
  <th style="width:7%">Scadenza</th>
  <th style="width:7%">Call</th>
  <th style="width:5%">Ced%</th>
  <th style="width:5%">Ask</th>
  <th style="width:5%">YTM%</th>
  <th style="width:5%">YTC%</th>
  <th style="width:5%">Peso%</th>
  <th style="width:7%">Nominale €</th>
  <th style="width:7%">Esborso €</th>
  <th style="width:7%">Ced.Ann €</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot class="tot"><tr>
  <td colspan="11">TOTALE</td>
  <td align="right">${fp(bonds.reduce((s,b)=>s+b.peso,0),2)}</td>
  <td align="right" style="color:#15803d">${fe(totNom)}</td>
  <td align="right" style="color:#1e40af">${fe(totEff)}</td>
  <td align="right" style="color:#92400e">${fe(totCed)}</td>
</tr></tfoot></table>
</div><!-- /page-section Titoli -->

<!-- Flusso Cedolare -->
<div class="page-section">
<div class="sec">Flusso Cedolare Mensile <span class="sec-note">sul nominale — per titolo</span></div>
<div class="ced-wrap">
<table class="ced-table">
<thead><tr>
  <th>ISIN</th><th>Emittente</th><th>Freq</th>
  ${MONTHS_FULL.map(m=>`<th>${m.substring(0,3).toUpperCase()}</th>`).join("")}
  <th style="background:#333;color:#f5c842">TOT. ANNUO</th>
</tr></thead>
<tbody>
${(()=>{
  const FREQ_LBL={0:"ZC",1:"Annuale",2:"Semestrale",4:"Trimestrale",12:"Mensile"};
  return bonds.map(b=>{
    const mesi = getCouponMonths(b);
    const singolo = mesi.length ? calcCouponAnnuo(b,totale)/mesi.length : 0;
    const totAnnuo = calcCouponAnnuo(b,totale);
    const cells = MONTHS_FULL.map((_,mi)=>{
      const hasPay = mesi.includes(mi+1);
      const val = hasPay ? singolo : 0;
      return hasPay
        ? `<td class="pay">€${val.toFixed(2)}</td>`
        : `<td class="empty">—</td>`;
    }).join("");
    const issuerShort = (b.issuer||b.name).length>28 ? (b.issuer||b.name).substring(0,26)+"…" : (b.issuer||b.name);
    return `<tr>
      <td style="font-family:monospace;font-size:8px;color:#6b7280">${b.isin}</td>
      <td style="font-size:8.5px">${issuerShort}</td>
      <td style="text-align:center;font-size:8px;color:#6b7280">${FREQ_LBL[b.couponFreq||1]||"Ann."}</td>
      ${cells}
      <td style="font-weight:800;color:#92400e;background:#fffbeb">€${totAnnuo.toFixed(2)}</td>
    </tr>`;
  }).join("");
})()}
</tbody>
<tfoot>
<tr class="tot-row">
  <td colspan="3">TOTALE</td>
  ${MONTHS_FULL.map((_,mi)=>{
    const tot = bonds.reduce((s,b)=>{
      const mesi=getCouponMonths(b);
      if(!mesi.includes(mi+1)) return s;
      return s+(mesi.length?calcCouponAnnuo(b,totale)/mesi.length:0);
    },0);
    return tot>0
      ? `<td>€${tot.toFixed(2)}</td>`
      : `<td style="color:#d1d5db">—</td>`;
  }).join("")}
  <td>€${bonds.reduce((s,b)=>s+calcCouponAnnuo(b,totale),0).toFixed(2)}</td>
</tr>
</tfoot>
</table>
</div>
</div><!-- /page-section Cedolare -->

<!-- Grafico Scadenze / Call -->
<div class="page-section">
<div class="sec">Profilo di Scadenza &amp; Call
  <span class="sec-note">Barre affiancate: <span style="color:#3b82f6;font-weight:700">■ a scadenza</span> &nbsp; <span style="color:#d97706;font-weight:700">■ a call</span> &nbsp;— valori in % del portafoglio</span>
</div>
<div class="chart-box">
  <div class="chart-title">Rimborso per data (% portafoglio)</div>
  ${allKeys.length > 0 ? svgChart : '<p style="color:#9ca3af;font-size:11px;padding:12px 0">Nessuna scadenza disponibile.</p>'}
</div>
</div><!-- /page-section Scadenze -->

<!-- Composizione -->
<div class="sec">Composizione Portafoglio</div>
<div class="comp-grid">
  ${(()=>{
    const ratingMap={"AAA":"#059669","AA+":"#10b981","AA":"#34d399","AA-":"#6ee7b7","A+":"#3b82f6","A":"#60a5fa","A-":"#93c5fd","BBB+":"#8b5cf6","BBB":"#a78bfa","BBB-":"#c4b5fd","Baa2":"#ddd6fe","BB+":"#ef4444","BB":"#f87171","ND":"#9ca3af"};
    const tipoMap={"Governativo":"#3b82f6","Corporate":"#8b5cf6","Sovranazionale":"#10b981"};
    const seniMap={"Senior Unsecured":"#22c55e","Senior Secured":"#10b981","Tier 2":"#f59e0b","AT1":"#f97316","Junior Subordinated":"#ef4444"};
    const sectMap={"Government Activity":"#3b82f6","Utilities":"#10b981","Healthcare":"#8b5cf6","Financials":"#f59e0b","Industrials":"#6b7280","Consumer Cyclicals":"#f97316","Basic Materials":"#a3e635","Technology":"#06b6d4","Energy":"#ef4444"};
    const ccyMap={"EUR":"#3b82f6","USD":"#22c55e","GBP":"#8b5cf6","CHF":"#f59e0b"};
    const cpnMap={"Fixed":"#22c55e","Variable":"#f59e0b","Zero Coupon":"#9ca3af","Step Up":"#f97316"};
    const agg=(fn)=>{const r={};bonds.forEach(b=>{const k=fn(b)||"ND";r[k]=(r[k]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v})).sort((a,b)=>b.peso-a.peso);};
    const RATING_ORD=["AAA","AA+","AA","AA-","A+","A","A-","BBB+","BBB","BBB-","Baa1","Baa2","Baa3","BB+","BB","BB-","ND"];
    const ratingD=agg(b=>b.rating).sort((a,b)=>RATING_ORD.indexOf(a.name)-RATING_ORD.indexOf(b.name));
    return [
      buildCompositionSection("Per Rating",    ratingD,               ratingMap),
      buildCompositionSection("Per Tipologia", agg(b=>b.tipo),        tipoMap),
      buildCompositionSection("Per Seniority", agg(b=>b.seniority),   seniMap),
      buildCompositionSection("Per Settore",   agg(b=>b.sector),      sectMap),
      buildCompositionSection("Per Valuta",    agg(b=>b.valuta),      ccyMap),
      buildCompositionSection("Per Tipo Cedola",agg(b=>b.tipoCedola), cpnMap),
    ].join("");
  })()}
</div>

<div class="foot">
  <span>${REPORT_CONFIG.firmName} · Report generato automaticamente</span>
  <span>Solo a fini informativi — dati indicativi.</span>
</div>

<!-- DISCLAIMER PAGE — pagina dedicata, sempre ultima -->
<div style="break-before:page;page-break-before:always;padding-top:32px;display:flex;flex-direction:column">

  <!-- Header disclaimer -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #f5c842;padding-bottom:14px;margin-bottom:24px">
    <div>
      <div style="font-size:9px;color:#9ca3af;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px">${REPORT_CONFIG.firmName.toUpperCase()}</div>
      <h2 style="font-size:18px;font-weight:800;color:#1a1a1a">${REPORT_CONFIG.disclaimerTitle}</h2>
    </div>
    ${logoSrc ? `<div style="background:#1a1a1a;border-radius:8px;padding:8px 16px">
      <img src="${logoSrc}" alt="${REPORT_CONFIG.firmName}" style="height:24px;width:auto;display:block"/>
    </div>` : ""}
  </div>

  <!-- Testo disclaimer — occupa tutta la larghezza della pagina -->
  <div style="flex:1;font-size:10px;line-height:1.8;color:#374151;text-align:justify;width:100%" class="disc-body">
    ${disclaimerHTML}
  </div>

  <!-- Footer disclaimer -->
  <div style="margin-top:32px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;display:flex;justify-content:space-between;align-items:center">
    <span>Documento riservato · generato il ${today}</span>
    <span>${REPORT_CONFIG.firmName}</span>
  </div>
</div>

</body></html>`;

  const w = window.open("","_blank");
  if(w){ w.document.write(html); w.document.close(); }
  else alert("Popup bloccato dal browser. Consenti i popup per questo sito.");
}

// ─── FX RATES — tassi di cambio in tempo reale (Frankfurter / BCE) ──────────
// API: https://api.frankfurter.app — fonte BCE, open source, zero registrazione
function FxRates() {
  const PAIRS = ["USD","GBP","CHF","JPY","CNY"];
  const [rates, setRates] = useState(null);   // {USD:1.08, GBP:0.85, ...}
  const [ts,    setTs]    = useState(null);   // timestamp ultimo aggiornamento
  const [err,   setErr]   = useState(false);
  const [open,  setOpen]  = useState(false);  // dropdown aperto/chiuso
  const [loading, setLoading] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true); setErr(false);
    try {
      const r = await fetch(
        `https://api.frankfurter.app/latest?from=EUR&to=${PAIRS.join(",")}`
      );
      if(!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      setRates(d.rates);
      setTs(new Date().toLocaleTimeString("it-IT", {hour:"2-digit",minute:"2-digit"}));
    } catch(e) {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carica al mount
  useEffect(() => { fetchRates(); }, [fetchRates]);

  // Chiudi dropdown cliccando fuori
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const FLAG = {USD:"🇺🇸",GBP:"🇬🇧",CHF:"🇨🇭",JPY:"🇯🇵",CNY:"🇨🇳"};
  const DEC  = {USD:4,GBP:4,CHF:4,JPY:2,CNY:4};

  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      {/* Pill trigger */}
      <button onClick={()=>setOpen(o=>!o)}
        style={{background:"#2a2a2a",border:"1px solid #3a3a3a",borderRadius:8,
          padding:"5px 11px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,
          color:"#fff",fontSize:12,fontWeight:700,letterSpacing:"-.2px",
          transition:"background 0.15s"}}>
        <span style={{fontSize:13}}>€$£</span>
        {loading && <span style={{fontSize:10,color:"#9ca3af"}}>…</span>}
        {!loading && rates && !err && (
          <span style={{fontSize:10,color:"#9ca3af",fontWeight:400}}>
            {(rates.USD||0).toFixed(2)}
          </span>
        )}
        {err && <span style={{fontSize:10,color:"#f87171"}}>!</span>}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:200,
          background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:12,
          padding:"14px 16px",minWidth:220,
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <p style={{fontSize:9,fontWeight:700,textTransform:"uppercase",
                letterSpacing:"0.1em",color:"#6b7280",margin:0}}>TASSI DI CAMBIO</p>
              <p style={{fontSize:9,color:"#6b7280",marginTop:2}}>
                Fonte BCE · {ts ? `agg. ${ts}` : "caricamento…"}
              </p>
            </div>
            <button onClick={fetchRates} title="Aggiorna"
              style={{background:"transparent",border:"none",cursor:"pointer",
                fontSize:14,color:"#6b7280",padding:4,lineHeight:1,
                transition:"transform 0.3s",transform:loading?"rotate(360deg)":"none"}}>
              ↻
            </button>
          </div>
          {/* Base */}
          <div style={{fontSize:10,color:"#6b7280",marginBottom:10,paddingBottom:8,
            borderBottom:"1px solid #2a2a2a"}}>
            Base: <span style={{color:"#f5c842",fontWeight:700}}>EUR (€)</span>
          </div>
          {/* Rates list */}
          {err ? (
            <p style={{fontSize:11,color:"#f87171",margin:0}}>
              Errore caricamento. Verifica la connessione.
            </p>
          ) : !rates ? (
            <p style={{fontSize:11,color:"#6b7280",margin:0}}>Caricamento…</p>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {PAIRS.map(ccy=>(
                <div key={ccy} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16,lineHeight:1}}>{FLAG[ccy]}</span>
                    <div>
                      <p style={{fontSize:11,fontWeight:700,color:"#fff",margin:0}}>
                        {ccy}
                      </p>
                      <p style={{fontSize:9,color:"#6b7280",margin:0}}>
                        EUR/{ccy}
                      </p>
                    </div>
                  </div>
                  <p style={{fontSize:14,fontWeight:800,color:"#f5c842",
                    fontFamily:"monospace",margin:0}}>
                    {rates[ccy]
                      ? rates[ccy].toFixed(DEC[ccy]||4)
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
          {/* Footer */}
          <div style={{marginTop:12,paddingTop:8,borderTop:"1px solid #2a2a2a"}}>
            <p style={{fontSize:8,color:"#4b5563",margin:0,textAlign:"center"}}>
              api.frankfurter.app · Banca Centrale Europea
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CASH FLOW PLURIENNALE ───────────────────────────────────────────────────
function CashFlowPluriennale({ bonds, totale }) {
  const [viewMode, setViewMode] = useState("chart");
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({length:16}, (_,i)=>currentYear+i);

  const cashflows = useMemo(()=>{
    // Helper: anno e mese dell'evento di uscita del bond dal portafoglio
    // exitDate = callDate se presente, altrimenti scadenza
    // Le cedole si calcolano solo fino all'anno di uscita (incluso, proporzionalmente)
    const bondExit = (b) => {
      const d = b.callDate ? new Date(b.callDate) : (b.scadenza ? new Date(b.scadenza) : null);
      if(!d) return {yr:9999, mo:12};
      return {yr:d.getFullYear(), mo:d.getMonth()+1}; // mo: 1-12
    };

    return YEARS.map(yr=>{
      const cedole = bonds.reduce((s,b)=>{
        const exit = bondExit(b);
        // Bond già uscito dal portafoglio prima di quest'anno → 0
        if(exit.yr < yr) return s;
        const freq = b.couponFreq||1;
        if(freq===0) return s;
        const cedSingola = calcCouponSingolo(b,totale);
        // Anno di uscita: conta solo i pagamenti cedolari PRIMA o NEL mese di uscita
        if(exit.yr === yr) {
          const mesiCedola = getCouponMonths(b); // es. [3,9] per semestrale
          const paymentsThisYr = mesiCedola.filter(m => m <= exit.mo).length;
          return s + cedSingola * paymentsThisYr;
        }
        // Anni precedenti all'uscita: tutti i pagamenti nell'anno
        return s + cedSingola * freq;
      },0);

      // Rimborso a call: solo se callDate cade in questo anno
      const rimborsoCall = bonds.reduce((s,b)=>{
        if(!b.callDate) return s;
        const callYr = new Date(b.callDate).getFullYear();
        return callYr===yr ? s+calcNominale(b,totale) : s;
      },0);

      // Rimborso a scadenza: solo bond SENZA call (o con call non esercitata)
      // Per convenzione: se il bond ha callDate, il rimborso è già contato in rimborsoCall
      const rimborsoMat = bonds.reduce((s,b)=>{
        if(b.callDate) return s; // con call → rimborso già in rimborsoCall
        if(!b.scadenza) return s;
        return new Date(b.scadenza).getFullYear()===yr ? s+calcNominale(b,totale) : s;
      },0);

      const rimborso = rimborsoMat+rimborsoCall;
      return {yr,cedole,rimborsoMat,rimborsoCall,rimborso,totale:cedole+rimborso};
    });
  },[bonds,totale]);

  const totCedolePlurien = cashflows.reduce((s,r)=>s+r.cedole,0);
  const totRimborsi      = cashflows.reduce((s,r)=>s+r.rimborso,0);
  const maxBar           = Math.max(...cashflows.map(r=>r.totale),1);
  const fe2 = (n)=> n===0?"—":"€"+Number(n).toLocaleString("it-IT",{maximumFractionDigits:0});
  const card2 = {background:"#fff",borderRadius:14,padding:"22px 24px",border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"};

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:0}}>Flussi di Cassa Pluriennali</h2>
          <p style={{fontSize:12,color:"#9ca3af",marginTop:4}}>Cedole + rimborsi capitali · {currentYear}–{currentYear+15} · sul nominale</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 16px",textAlign:"right"}}>
            <p style={{fontSize:8,fontWeight:700,textTransform:"uppercase",color:"#15803d",marginBottom:2}}>Tot. Cedole</p>
            <p style={{fontSize:15,fontWeight:800,color:"#15803d",fontFamily:"monospace",margin:0}}>{fe2(totCedolePlurien)}</p>
          </div>
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 16px",textAlign:"right"}}>
            <p style={{fontSize:8,fontWeight:700,textTransform:"uppercase",color:"#2563eb",marginBottom:2}}>Tot. Rimborsi</p>
            <p style={{fontSize:15,fontWeight:800,color:"#2563eb",fontFamily:"monospace",margin:0}}>{fe2(totRimborsi)}</p>
          </div>
          <div style={{display:"flex",border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
            {[["chart","📊 Grafico"],["table","📋 Tabella"]].map(([v,l])=>(
              <button key={v} onClick={()=>setViewMode(v)}
                style={{padding:"7px 14px",fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                  background:viewMode===v?"#1a1a1a":"#fff",color:viewMode===v?"#f5c842":"#6b7280"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {viewMode==="chart"&&(
        <div style={card2}>
          <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
            {[["#86efac","Cedole"],["#93c5fd","Rimborso a scadenza"],["#fde68a","Rimborso a call"]].map(([col,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:12,height:12,borderRadius:3,background:col,display:"inline-block"}}/>
                <span style={{fontSize:11,color:"#6b7280"}}>{l}</span>
              </div>
            ))}
          </div>
          <div style={{overflowX:"auto"}}>
            <div style={{display:"flex",gap:4,alignItems:"flex-end",height:220,minWidth:700,paddingBottom:24}}>
              {cashflows.map(({yr,cedole,rimborsoMat,rimborsoCall,totale:tot})=>{
                const hCed=tot>0?(cedole/maxBar)*180:0;
                const hMat=tot>0?(rimborsoMat/maxBar)*180:0;
                const hCall=tot>0?(rimborsoCall/maxBar)*180:0;
                return(
                  <div key={yr} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}
                    title={`${yr} — Cedole: ${fe2(cedole)} | Rimb.: ${fe2(rimborsoMat+rimborsoCall)} | Tot: ${fe2(tot)}`}>
                    {tot>0&&<span style={{fontSize:8,color:"#374151",fontWeight:700,marginBottom:2,whiteSpace:"nowrap"}}>
                      {tot>=1000?(tot/1000).toFixed(1)+"k":tot.toFixed(0)}
                    </span>}
                    <div style={{width:"100%",display:"flex",flexDirection:"column",borderRadius:4,overflow:"hidden",minHeight:tot>0?undefined:2}}>
                      {hCall>0&&<div style={{height:hCall,background:"#fde68a"}}/>}
                      {hMat>0&&<div style={{height:hMat,background:"#93c5fd"}}/>}
                      {hCed>0&&<div style={{height:hCed,background:"#86efac"}}/>}
                      {tot===0&&<div style={{height:2,background:"#f3f4f6"}}/>}
                    </div>
                    <span style={{fontSize:8,color:"#6b7280",marginTop:4,whiteSpace:"nowrap"}}>{yr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewMode==="table"&&(
        <div style={{...card2,padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:700}}>
              <thead>
                <tr style={{background:"#1a1a1a"}}>
                  {[["Anno","left","#fff"],["Cedole €","right","#86efac"],["Rimb. Scad.","right","#93c5fd"],
                    ["Rimb. Call","right","#fde68a"],["Tot. Rimborsi","right","#bfdbfe"],
                    ["Totale Anno","right","#f5c842"],["% Portafoglio","right","#9ca3af"]].map(([h,a,col])=>(
                    <th key={h} style={{color:col,padding:"8px 10px",fontSize:8,fontWeight:700,
                      textTransform:"uppercase",textAlign:a,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cashflows.filter(r=>r.totale>0).map(({yr,cedole,rimborsoMat,rimborsoCall,rimborso,totale:tot},i)=>(
                  <tr key={yr} style={{background:i%2===0?"#fafafa":"#fff",borderBottom:"1px solid #f3f4f6"}}>
                    <td style={{padding:"7px 10px",fontWeight:700,color:"#374151"}}>{yr}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#15803d",fontWeight:600}}>{fe2(cedole)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#2563eb"}}>{fe2(rimborsoMat)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#d97706"}}>{fe2(rimborsoCall)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",color:"#1d4ed8",fontWeight:600}}>{fe2(rimborso)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:"#1a1a1a"}}>{fe2(tot)}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",color:"#6b7280"}}>{totale>0?((tot/totale)*100).toFixed(1):0}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:"#fffbeb",borderTop:"2px solid #f5c842"}}>
                  <td style={{padding:"8px 10px",fontWeight:800}}>TOTALE</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#15803d",fontWeight:800}}>{fe2(totCedolePlurien)}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#2563eb",fontWeight:800}}>{fe2(cashflows.reduce((s,r)=>s+r.rimborsoMat,0))}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#d97706",fontWeight:800}}>{fe2(cashflows.reduce((s,r)=>s+r.rimborsoCall,0))}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",color:"#1d4ed8",fontWeight:800}}>{fe2(totRimborsi)}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:"#92400e"}}>{fe2(totCedolePlurien+totRimborsi)}</td>
                  <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700}}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCENARIO RATES — analisi sensitività ai tassi ──────────────────────────
//
// Logica: ΔP ≈ -ModifiedDuration × ΔRate × Valore
// Per ogni titolo: P&L stimato = -duration × (shock/100) × esborso
// A livello portafoglio: somma pesata dei P&L individuali
//
function ScenarioRates({ bonds, totale, stats }) {
  const [shock, setShock] = useState(0); // bp: -300 … +300

  const scenarios = useMemo(()=>{
    // Calcola P&L stimato per ogni shock da -300 a +300 bp step 50
    const shocks = [-300,-250,-200,-150,-100,-50,-25,0,25,50,100,150,200,250,300];
    return shocks.map(bp=>{
      const dRate = bp/100; // in percentuale
      const plEur = bonds.reduce((s,b)=>{
        const dur   = b.duration||stats.wtdDuration||0;
        const esb   = calcEsborso(b,totale);
        // Approssimazione lineare: ΔP/P ≈ -ModDur × ΔRate
        return s + (-dur * (dRate/100) * esb);
      },0);
      const plPct = totale > 0 ? (plEur/totale)*100 : 0;
      return { bp, plEur, plPct };
    });
  },[bonds,totale,stats]);

  // P&L per lo shock corrente (slider)
  const currentPL = useMemo(()=>{
    const dRate = shock/100;
    const plEur = bonds.reduce((s,b)=>{
      const dur = b.duration||stats.wtdDuration||0;
      const esb = calcEsborso(b,totale);
      return s + (-dur*(dRate/100)*esb);
    },0);
    return { plEur, plPct: totale>0?(plEur/totale)*100:0 };
  },[bonds,totale,stats,shock]);

  const C2 = { pos:"#15803d", neg:"#dc2626", posL:"#f0fdf4", negL:"#fff1f2",
               posB:"#bbf7d0", negB:"#fecdd3" };
  const isPos = currentPL.plEur >= 0;
  const accentC = isPos ? C2.pos : C2.neg;
  const accentL = isPos ? C2.posL : C2.negL;
  const accentB = isPos ? C2.posB : C2.negB;

  return(
    <div style={{...{background:"#fff",borderRadius:14,padding:"22px 24px",
      border:"1px solid #e5e7eb",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"},marginTop:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
        <div>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#9ca3af",marginBottom:4}}>
            ANALISI SCENARIO
          </p>
          <h3 style={{fontSize:17,fontWeight:800,color:"#1a1a1a",margin:0}}>Sensitività ai Tassi di Interesse</h3>
          <p style={{fontSize:11,color:"#9ca3af",marginTop:3}}>
            Approssimazione lineare · ΔP ≈ −Duration × ΔRate × Esborso · Duration pond. {stats.wtdDuration.toFixed(2)} anni
          </p>
        </div>
        {/* Badge P&L corrente */}
        <div style={{background:accentL,border:`1px solid ${accentB}`,borderRadius:10,padding:"12px 18px",textAlign:"right",minWidth:160}}>
          <p style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:accentC,marginBottom:4}}>
            {shock===0?"Scenario neutro":`Shock ${shock>0?"+":""}${shock} bp`}
          </p>
          <p style={{fontSize:22,fontWeight:800,color:accentC,fontFamily:"monospace",margin:0}}>
            {currentPL.plEur>=0?"+":""}{Number(currentPL.plEur).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0})} €
          </p>
          <p style={{fontSize:11,color:accentC,marginTop:2}}>
            {currentPL.plPct>=0?"+":""}{currentPL.plPct.toFixed(2)}% sul portafoglio
          </p>
        </div>
      </div>

      {/* Slider */}
      <div style={{marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",marginBottom:6}}>
          <span>−300 bp</span>
          <span style={{fontWeight:700,color:"#374151"}}>
            Shock tassi: <b style={{color:shock===0?"#9ca3af":shock>0?"#dc2626":"#15803d"}}>
              {shock===0?"Neutro (0 bp)":`${shock>0?"+":""}${shock} bp`}
            </b>
          </span>
          <span>+300 bp</span>
        </div>
        <input type="range" min={-300} max={300} step={25} value={shock}
          onChange={e=>setShock(Number(e.target.value))}
          style={{width:"100%",accentColor:"#f5c842",cursor:"pointer",height:6}}/>
        {/* Marcatori */}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          {[-300,-200,-100,0,100,200,300].map(v=>(
            <button key={v} onClick={()=>setShock(v)}
              style={{fontSize:9,padding:"2px 6px",borderRadius:6,cursor:"pointer",fontWeight:700,
                background:shock===v?"#1a1a1a":"transparent",
                color:shock===v?"#f5c842":v===0?"#9ca3af":v>0?"#ef444488":"#22c55e88",
                border:`1px solid ${shock===v?"#1a1a1a":v===0?"#e5e7eb":v>0?"#fecdd3":"#bbf7d0"}`}}>
              {v===0?"Neutro":`${v>0?"+":""}${v}`}
            </button>
          ))}
        </div>
      </div>

      {/* Barre scenario per bp preimpostati */}
      <div style={{overflowX:"auto"}}>
        <div style={{display:"flex",gap:6,minWidth:600,alignItems:"flex-end",height:100}}>
          {scenarios.map(({bp,plEur,plPct})=>{
            const maxAbs = Math.max(...scenarios.map(s=>Math.abs(s.plEur)),1);
            const barH   = Math.max(Math.abs(plEur)/maxAbs*80,2);
            const isP    = plEur>=0;
            const isCur  = bp===shock;
            return(
              <div key={bp} onClick={()=>setShock(bp)}
                style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer"}}>
                <span style={{fontSize:8,color:isP?"#15803d":"#dc2626",fontWeight:700,marginBottom:2,whiteSpace:"nowrap"}}>
                  {plEur>=0?"+":""}{(plEur/1000).toFixed(1)}k
                </span>
                <div style={{width:"100%",background:isP?"#bbf7d0":"#fecdd3",
                  border:`2px solid ${isCur?(isP?"#15803d":"#dc2626"):"transparent"}`,
                  borderRadius:4,height:barH,
                  backgroundColor:isP?(isCur?"#15803d":"#86efac"):(isCur?"#dc2626":"#fca5a5"),
                  transition:"all 0.2s"}}/>
                <span style={{fontSize:8,color:isCur?"#1a1a1a":"#9ca3af",fontWeight:isCur?700:400,
                  marginTop:3,whiteSpace:"nowrap"}}>
                  {bp===0?"0":`${bp>0?"+":""}${bp}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabella per titolo — collassabile */}
      <details style={{marginTop:14}}>
        <summary style={{fontSize:10,fontWeight:700,color:"#6b7280",cursor:"pointer",
          textTransform:"uppercase",letterSpacing:"0.08em",userSelect:"none"}}>
          Dettaglio per titolo {shock===0?"(seleziona uno shock)":`— Shock ${shock>0?"+":""}${shock} bp`}
        </summary>
        {shock!==0&&(
          <div style={{overflowX:"auto",marginTop:10}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:600}}>
              <thead>
                <tr style={{background:"#1a1a1a"}}>
                  {["Emittente","ISIN","Duration","Esborso €","ΔP stimato €","ΔP%"].map(h=>(
                    <th key={h} style={{color:"#fff",padding:"6px 8px",fontSize:8,fontWeight:700,
                      textTransform:"uppercase",textAlign:h.startsWith("ΔP")||h==="Esborso €"||h==="Duration"?"right":"left",
                      whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...bonds].sort((a,b)=>{
                  const pa=-((a.duration||0)*(shock/10000)*calcEsborso(a,totale));
                  const pb=-((b.duration||0)*(shock/10000)*calcEsborso(b,totale));
                  return shock>0?pa-pb:pb-pa;
                }).map((b,i)=>{
                  const dur=b.duration||stats.wtdDuration||0;
                  const esb=calcEsborso(b,totale);
                  const pl=-dur*(shock/10000)*esb;
                  const plPct=esb>0?(pl/esb)*100:0;
                  const isP=pl>=0;
                  return(
                    <tr key={b.isin} style={{background:i%2===0?"#fafafa":"#fff",
                      borderBottom:"1px solid #f3f4f6"}}>
                      <td style={{padding:"5px 8px",fontSize:10,color:"#6b7280",whiteSpace:"nowrap"}}>{(b.issuer||b.name).substring(0,28)}</td>
                      <td style={{padding:"5px 8px",fontFamily:"monospace",fontSize:9,color:"#9ca3af"}}>{b.isin}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"monospace"}}>{dur.toFixed(2)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"monospace",color:"#2563eb"}}>
                        {Number(esb).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0})}
                      </td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"monospace",fontWeight:700,
                        color:isP?"#15803d":"#dc2626"}}>
                        {pl>=0?"+":""}{Number(pl).toLocaleString("it-IT",{minimumFractionDigits:0,maximumFractionDigits:0})}
                      </td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,
                        color:isP?"#15803d":"#dc2626"}}>
                        {plPct>=0?"+":""}{plPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}

// ─── IFIELD — componente esterno per evitare rimount ad ogni render ──────────
// Mantiene stato locale (rawVal) mentre si digita; propaga al parent solo onBlur.
// Questo risolve il problema di perdita focus/cursore nelle celle editabili.
function IField({ v, onCommit, w=60, color="#1a1a1a", type="number", align="right", mono=false, step=null, onStep=null }) {
  const [rawVal, setRawVal] = useState(String(v ?? ""));
  const [focused, setFocused] = useState(false);

  // Sync external value only when not focused (es. cambio portafoglio via CSV)
  const prevV = useRef(v);
  if (!focused && v !== prevV.current) {
    prevV.current = v;
    setRawVal(String(v ?? ""));
  }

  const handleFocus = (e) => {
    setFocused(true);
    e.target.style.borderBottomColor = "#f5c842";
    e.target.style.background = "#fef9e7";
  };
  const handleBlur = (e) => {
    setFocused(false);
    e.target.style.borderBottomColor = "transparent";
    e.target.style.background = "transparent";
    onCommit(rawVal);                // propaga al parent solo al blur
    prevV.current = v;               // aggiorna ref dopo commit
  };
  const handleChange = (e) => {
    setRawVal(e.target.value);       // aggiorna solo stato locale → nessun re-render parent
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.target.blur(); return; }
    if (e.key === "Escape") { setRawVal(String(v ?? "")); e.target.blur(); return; }
    // Frecce: se c'è un callback onStep dedicato (es. Nominale) usalo direttamente
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && onStep) {
      e.preventDefault();
      const s = Number(step) || 1;
      onStep(e.key === "ArrowUp" ? s : -s);
      return;
    }
    // Frecce: fallback generico con step su rawVal locale
    if ((e.key === "ArrowUp" || e.key === "ArrowDown") && step !== null) {
      e.preventDefault();
      const cur  = parseFloat(rawVal) || 0;
      const s    = Number(step) || 1;
      const next = e.key === "ArrowUp" ? cur + s : Math.max(0, cur - s);
      const val  = String(next);
      setRawVal(val);
      onCommit(val);
    }
  };

  return (
    <input
      type={type}
      value={rawVal}
      step={step !== null ? step : (type === "number" ? "any" : undefined)}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: "1.5px solid transparent",
        color,
        fontSize: 12,
        width: w,
        outline: "none",
        textAlign: align,
        padding: "2px 0",
        fontFamily: mono ? "monospace" : "inherit",
        transition: "border-color 0.15s, background 0.15s",
      }}
    />
  );
}

// ─── RATING SCALE ────────────────────────────────────────────────────────────
const RATING_SCALE = [
  "AAA","AA+","AA","AA-","A+","A","A-",
  "BBB+","BBB","BBB-","BB+","BB","BB-",
  "B+","B","B-","CCC","CC","C","D","ND"
];
const ratingToNum = (r) => { const i=RATING_SCALE.indexOf(r); return i>=0?i+1:RATING_SCALE.length; };
const numToRating = (n) => RATING_SCALE[Math.min(Math.max(Math.round(n)-1,0),RATING_SCALE.length-1)];

// ─── APP ──────────────────────────────────────────────────────────────────────
const EMPTY_BOND = {
  valuta:"EUR",issuer:"",isin:"",name:"",scadenza:"",callDate:"",
  cedola:0,ask:100,yldYtm:0,yldToCall:"",duration:0,taglioMin:1000, incrMin:1,
  rating:"BBB",peso:5,tipo:"Governativo",seniority:"Senior Unsecured",
  tipoCedola:"Fixed",couponFreq:1,sector:"",ammEmesso:0,rateo:0,incrMin:1,
};

export default function App() {
  useGlobalCSS();
  const [bonds,setBonds]               = useState(INITIAL_BONDS);
  const [totale,setTotale]             = useState(100000);
  const [rawTotale,setRawTotale]       = useState("100000"); // stringa per input controllato
  const [activeTab,setActiveTab]       = useState("overview");
  const [showAddForm,setShowAddForm]   = useState(false);
  const [addForm,setAddForm]           = useState(EMPTY_BOND);
  const [csvMsg,setCsvMsg]             = useState(null);
  const [tipoFilter,setTipoFilter]     = useState("Tutti");
  const [showMaturity,setShowMaturity] = useState(true);
  const [showCall,setShowCall]         = useState(true);
  const [sortCol,setSortCol]           = useState(null);   // colonna attiva
  const [sortDir,setSortDir]           = useState("asc");   // 'asc' | 'desc'
  const fileRef = useRef(null);

  // ── Calcoli ────────────────────────────────────────────────────────────────
  const totalePeso = useMemo(()=>bonds.reduce((s,b)=>s+b.peso,0),[bonds]);

  const stats = useMemo(()=>{
    const wt       = (f)=>bonds.reduce((s,b)=>s+f(b)*b.peso/100,0);
    const wtdYtm      = wt(b=>b.yldYtm);
    const wtdCedola   = wt(b=>b.cedola);
    const wtdDuration = wt(b=>b.duration||0);
    const totNominale  = bonds.reduce((s,b)=>s+calcNominale(b,totale),0);
    const totEffettivo = bonds.reduce((s,b)=>s+calcEffettivo(b,totale),0);
    const totCoupon    = bonds.reduce((s,b)=>s+calcCouponAnnuo(b,totale),0);
    const totPeso      = bonds.reduce((s,b)=>s+b.peso,0)||1;
    const wtdRatingNum = bonds.reduce((s,b)=>s+ratingToNum(b.rating)*b.peso,0)/totPeso;
    const wtdRating    = numToRating(wtdRatingNum);
    return {wtdYtm,wtdCedola,wtdDuration,totNominale,totEffettivo,totCoupon,
            disaggio:totNominale-totEffettivo,wtdRating,wtdRatingNum};
  },[bonds,totale]);

  const monthlyData = useMemo(()=>MONTHS.map((m,mi)=>{
    let tot=0;
    bonds.forEach(b=>{if(getCouponMonths(b).includes(mi+1)) tot+=calcCouponSingolo(b,totale);});
    return {month:m,cedola:tot};
  }),[bonds,totale]);

  const cedoleTable = useMemo(()=>bonds.map(b=>{
    const mesi=getCouponMonths(b), row={};
    MONTHS_FULL.forEach((mn,mi)=>{row[mn]=mesi.includes(mi+1)?calcCouponSingolo(b,totale):null;});
    return {isin:b.isin,name:b.name,...row};
  }),[bonds,totale]);

  const scadenzeData = useMemo(()=>{
    const keys=new Set();
    bonds.forEach(b=>{
      const d=new Date(b.scadenza);
      keys.add(`${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}__${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
      if(b.callDate){const d2=new Date(b.callDate);keys.add(`${String(d2.getMonth()+1).padStart(2,"0")}/${d2.getFullYear()}__${d2.getFullYear()}-${String(d2.getMonth()+1).padStart(2,"0")}`);}
    });
    return [...keys].sort((a,b)=>a.split("__")[1].localeCompare(b.split("__")[1])).map(k=>{
      const[label]=k.split("__");let pM=0,pC=0;
      bonds.forEach(b=>{
        const dm=new Date(b.scadenza);
        if(`${String(dm.getMonth()+1).padStart(2,"0")}/${dm.getFullYear()}`===label) pM+=b.peso;
        if(b.callDate){const dc=new Date(b.callDate);if(`${String(dc.getMonth()+1).padStart(2,"0")}/${dc.getFullYear()}`===label) pC+=b.peso;}
      });
      return {label,pM,pC};
    });
  },[bonds]);

  // Dati composizione
  // Rating ordinati per qualità: AAA in cima, ND in fondo
  // In recharts layout="vertical" l'array viene renderizzato dal basso verso l'alto,
  // quindi per avere AAA in cima dobbiamo invertire l'ordine (worst first → AAA last)
  const ratingData = useMemo(()=>{
    const r={};
    bonds.forEach(b=>{r[b.rating]=(r[b.rating]||0)+b.peso;});
    return Object.entries(r)
      .map(([k,v])=>({name:k,peso:v}))
      .sort((a,b)=>ratingRank(b.name)-ratingRank(a.name)); // inverted: ND first → AAA last = AAA on top
  },[bonds]);
  const tipoData     = useMemo(()=>{const r={};bonds.forEach(b=>{r[b.tipo]=(r[b.tipo]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const seniData     = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.seniority||"Senior Unsecured";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const sectorData   = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.sector||"—";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v})).sort((a,b)=>b.peso-a.peso);},[bonds]);
  const currencyData = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.valuta||"EUR";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const couponTypeData=useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.tipoCedola||"Fixed";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);

  const filtered = useMemo(()=>{
    let arr = tipoFilter==="Tutti" ? bonds : bonds.filter(b=>b.tipo===tipoFilter);
    if(!sortCol) return arr;
    return [...arr].sort((a,b)=>{
      let va=a[sortCol], vb=b[sortCol];
      // Colonne calcolate
      if(sortCol==="cy")      { va=calcCurrentYield(a); vb=calcCurrentYield(b); }
      if(sortCol==="rateo")   { va=a.rateo||0; vb=b.rateo||0; }
      if(sortCol==="nominale"){ va=calcNominale(a,totale); vb=calcNominale(b,totale); }
      if(sortCol==="effettivo"){va=calcEffettivo(a,totale);vb=calcEffettivo(b,totale);}
      if(sortCol==="cedAnnua"){ va=calcCouponAnnuo(a,totale);vb=calcCouponAnnuo(b,totale);}
      // Null/undefined sempre in fondo
      if(va==null||va==="") return 1;
      if(vb==null||vb==="") return -1;
      const cmp = typeof va==="number" && typeof vb==="number"
        ? va-vb
        : String(va).localeCompare(String(vb),"it",{sensitivity:"base"});
      return sortDir==="asc" ? cmp : -cmp;
    });
  },[bonds,tipoFilter,sortCol,sortDir,totale]);

  const toggleSort = (col) => {
    if(sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const updateBond=(idx,field,raw)=>{
    const u=[...bonds];
    if(field==="nominale"){
      // Nominale inserito → ricava peso: peso% = (nominale / nominalePortafoglio) * 100
      const nom = parseFloat(raw) || 0;
      const newPeso = totale > 0 ? (nom / totale) * 100 : u[idx].peso;
      u[idx] = {...u[idx], peso: parseFloat(newPeso.toFixed(6))};
    }
    else if(["cedola","ask","rateo","yldYtm","yldToCall","duration","taglioMin","incrMin","peso","couponFreq","ammEmesso"].includes(field)) u[idx]={...u[idx],[field]:parseFloat(raw)||0};
    else u[idx]={...u[idx],[field]:raw};
    setBonds(u);
  };
  const delBond=idx=>setBonds(bonds.filter((_,i)=>i!==idx));
  const addBond=()=>{
    setBonds([...bonds,{...addForm,cedola:+addForm.cedola,ask:+addForm.ask,yldYtm:+addForm.yldYtm,duration:+addForm.duration,peso:+addForm.peso,taglioMin:+addForm.taglioMin,couponFreq:+addForm.couponFreq}]);
    setShowAddForm(false);setAddForm(EMPTY_BOND);
  };
  const onCSV=useCallback(e=>{
    const f=e.target.files[0];if(!f)return;setCsvMsg(null);
    // Tenta prima UTF-8, poi latin-1 come fallback (file Excel italiani)
    const tryParse=(text)=>{
      const res=parseCSV(text);
      if(res.error) return res;
      if(!res.bonds.length) return {error:"Nessun titolo trovato dopo il parsing."};
      return res;
    };
    const r=new FileReader();
    r.onload=ev=>{
      let res=tryParse(ev.target.result);
      if(res.error){
        // Fallback: rileggi come latin-1
        const r2=new FileReader();
        r2.onload=ev2=>{
          res=tryParse(ev2.target.result);
          if(res.error){setCsvMsg({ok:false,text:res.error});return;}
          setBonds(res.bonds);
          const warn=res.errs?.length?` · ${res.errs.length} righe ignorate`:"";
          setCsvMsg({ok:true,text:`✓ Caricati ${res.bonds.length} titoli${warn}.`});
        };
        r2.readAsText(f,"latin-1");
        return;
      }
      setBonds(res.bonds);
      const warn=res.errs?.length?` · ${res.errs.length} righe ignorate`:"";
      setCsvMsg({ok:true,text:`✓ Caricati ${res.bonds.length} titoli${warn}.`});
    };
    r.readAsText(f,"utf-8");e.target.value="";
  },[]);

  // ── Stili condivisi ────────────────────────────────────────────────────────
  const card={background:C.card,borderRadius:18,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${C.border}`};
  const TH  ={padding:"10px 11px",color:C.gray,textAlign:"left",fontWeight:700,fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,background:C.lgray};
  const TD  ={padding:"9px 11px",borderBottom:`1px solid ${C.lgray}`,verticalAlign:"middle"};
  const TTIP={contentStyle:{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,fontSize:12,boxShadow:"0 4px 16px rgba(0,0,0,0.08)"}};
  const pct = (n) => `${Number(n).toFixed(1)}%`;

  // IField è definito fuori da App per evitare ricreazione ad ogni render
  // (causa perdita focus/cursore su ogni keystroke)
  const Pill=({children,bg,color,border})=>(
    <span style={{background:bg,color,border:`1px solid ${border||color+"44"}`,padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,display:"inline-block",whiteSpace:"nowrap"}}>{children}</span>
  );
  const Btn=({children,onClick,primary=false,sm=false})=>(
    <button onClick={onClick} style={{background:primary?C.yellow:C.card,color:C.dark,border:`1px solid ${primary?C.yellow:C.border}`,
      borderRadius:22,padding:sm?"5px 13px":"9px 20px",cursor:"pointer",fontWeight:700,fontSize:sm?11:12,
      display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",boxShadow:primary?"0 2px 8px rgba(245,200,66,0.35)":"0 1px 3px rgba(0,0,0,0.07)",transition:"all 0.15s"}}>{children}</button>
  );
  const TabBtn=({id,label})=>{const a=activeTab===id;return(
    <button onClick={()=>setActiveTab(id)} style={{padding:"8px 18px",borderRadius:22,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,
      background:a?C.dark:"transparent",color:a?"#fff":C.gray,transition:"all 0.18s"}}>{label}</button>
  );};
  const Check=({checked,onToggle,color=C.yellow})=>(
    <div onClick={onToggle} style={{width:18,height:18,borderRadius:5,border:`2px solid ${color}`,background:checked?color:"transparent",
      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,transition:"background 0.15s"}}>
      {checked&&<span style={{color:"#fff",fontSize:11,lineHeight:1,fontWeight:800}}>✓</span>}
    </div>
  );
  const SL=({children})=><div style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:14}}>{children}</div>;

  // Mini donut helper - usa legenda sotto invece di label esterne per evitare troncamenti
  const MiniPie=({data,colorMap,title})=>{
    // Label custom inline sul pie (breve)
    const renderLabel=({cx,cy,midAngle,innerRadius,outerRadius,percent,name})=>{
      if(percent<0.05) return null; // nasconde slice troppo piccole
      const RADIAN=Math.PI/180;
      const r=innerRadius+(outerRadius-innerRadius)*0.5;
      const x=cx+r*Math.cos(-midAngle*RADIAN);
      const y=cy+r*Math.sin(-midAngle*RADIAN);
      return(<text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
        {`${(percent*100).toFixed(0)}%`}
      </text>);
    };
    return(
      <div style={{...card,padding:"18px 20px"}}>
        <SL>{title}</SL>
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie data={data} dataKey="peso" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={32}
              labelLine={false} label={renderLabel}>
              {data.map((e,i)=><Cell key={i} fill={colorMap[e.name]||`hsl(${i*47},65%,55%)`}/>)}
            </Pie>
            <Tooltip {...TTIP} formatter={(v,name)=>[`${Number(v).toFixed(2)}%`,name]}/>
          </PieChart>
        </ResponsiveContainer>
        {/* Legenda testuale sotto - sempre visibile, nessun troncamento */}
        <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px",marginTop:8}}>
          {data.map((e,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:colorMap[e.name]||`hsl(${i*47},65%,55%)`,flexShrink:0,display:"inline-block"}}/>
              <span style={{fontSize:10,color:C.gray,whiteSpace:"nowrap"}}>{e.name} <b style={{color:C.dark}}>{pct(e.peso)}</b></span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="ba-page" style={{background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",color:C.dark}}>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        {/* Riga brand + azioni */}
        <div style={{maxWidth:1600,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,gap:10}}>
          <div style={{background:C.dark,borderRadius:9,padding:"5px 12px",display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
            <span style={{color:C.yellow,fontSize:14,fontWeight:900}}>⬡</span>
            <span style={{color:"#fff",fontWeight:800,fontSize:13,letterSpacing:"-.2px"}}>BondAnalyst</span>
          </div>
          <FxRates/>
          <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
            <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={onCSV}/>
            <Btn sm onClick={()=>fileRef.current.click()}>⬆ CSV</Btn>
            <Btn sm onClick={downloadCSVTemplate}>⬇ Template</Btn>
            <Btn sm onClick={()=>exportExcel(bonds,totale,stats,monthlyData)}>📊 Excel</Btn>
            <Btn primary sm onClick={()=>openReport(bonds,totale,stats,monthlyData)}>📄 Report</Btn>
          </div>
        </div>
        {/* Tabs — scrollabili su schermi stretti */}
        <div style={{borderTop:`1px solid ${C.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
          <div style={{display:"flex",gap:0,padding:"0 16px",minWidth:"max-content"}}>
            {[["overview","Panoramica"],["bonds","Titoli"],["cedole","Cedole"],["scadenze","Scadenze"],["flussi","Flussi"],["composizione","Composizione"]].map(([id,l])=>(
              <TabBtn key={id} id={id} label={l}/>
            ))}
          </div>
        </div>
      </nav>

      {csvMsg&&(
        <div style={{maxWidth:1600,margin:"12px auto 0",padding:"0 20px"}}>
          <div style={{background:csvMsg.ok?"#f0fdf4":"#fef2f2",border:`1px solid ${csvMsg.ok?"#86efac":"#fecaca"}`,borderRadius:10,padding:"10px 16px",color:csvMsg.ok?"#166534":"#991b1b",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>{csvMsg.text}</span>
            <button onClick={()=>setCsvMsg(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit"}}>×</button>
          </div>
        </div>
      )}

      <div className="ba-inner">

        {/* ═══════════════ PANORAMICA ══════════════════════════════════════ */}
        {activeTab==="overview"&&(
          <div>
            <div className="ba-overview-header">
              <div>
                <p style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Portafoglio</p>
                <h1 style={{fontSize:30,fontWeight:800,letterSpacing:"-.6px"}}>Dashboard Obbligazionario</h1>
                <p style={{color:C.gray,fontSize:13,marginTop:4}}>{bonds.length} titoli · duration ponderata {stats.wtdDuration.toFixed(2)} anni</p>
              </div>
              <div className="ba-totale-card" style={{...card,padding:"16px 22px",display:"flex",alignItems:"center",gap:16}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:10,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Nominale Portafoglio</p>
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    <span style={{color:C.gray,fontWeight:600}}>€</span>
                    <input
                      value={rawTotale}
                      onChange={e=>{
                        const raw = e.target.value.replace(/[^0-9.]/g,"");
                        setRawTotale(raw);
                        const n = parseFloat(raw);
                        if(!isNaN(n) && n>0) setTotale(n);
                      }}
                      onBlur={()=>{
                        // al blur: se campo vuoto o non valido ripristina
                        const n=parseFloat(rawTotale);
                        if(isNaN(n)||n<=0){ setRawTotale(String(totale)); }
                        else { setRawTotale(String(n)); setTotale(n); }
                      }}
                      style={{background:"transparent",border:"none",borderBottom:`2px solid ${C.yellow}`,color:C.dark,fontSize:24,fontWeight:800,width:160,textAlign:"right",outline:"none"}}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI importi */}
            <div className="ba-grid-3" style={{marginBottom:14}}>
              {[
                {icon:"🏦",l:"Nominale Portafoglio",v:fe(stats.totNominale),    s:"Valore facciale (input)",             vc:C.blue, bg:C.blueL},
                {icon:"💰",l:"Esborso Effettivo",   v:fe(stats.totEffettivo),   s:"Esborso al dirty price (output)",    vc:C.green,bg:C.greenL},
                {icon:stats.disaggio>=0?"📈":"📉",
                 l:stats.disaggio>=0?"Disaggio (sotto pari)":"Premio (sopra pari)",
                 v:fe(Math.abs(stats.disaggio)),
                 s:stats.disaggio>0?"Gain atteso a maturity":stats.disaggio<0?"Costo aggiuntivo vs par":"Alla pari",
                 vc:stats.disaggio>=0?C.green:C.red,bg:C.card},
              ].map((k,i)=>(
                <div key={i} style={{...card,background:k.bg,padding:"20px 24px",display:"flex",gap:16,alignItems:"flex-start"}}>
                  <span style={{fontSize:32,lineHeight:1}}>{k.icon}</span>
                  <div style={{flex:1}}>
                    <p style={{fontSize:10,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{k.l}</p>
                    <p style={{fontSize:26,fontWeight:800,color:k.vc,letterSpacing:"-.5px",marginBottom:2}}>{k.v}</p>
                    <p style={{fontSize:11,color:C.gray}}>{k.s}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* KPI metriche — 5 card */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:22}}>
              {[
                {l:"YTM Ponderato",  v:fp(stats.wtdYtm),                      s:"Yield to Maturity",      y:true},
                {l:"Cedola Media",   v:fp(stats.wtdCedola),                    s:"Tasso cedolare medio",   y:false},
                {l:"Duration Media", v:`${stats.wtdDuration.toFixed(2)} anni`, s:"Sensitività al tasso",   y:false},
                {l:"Rating Medio",   v:stats.wtdRating,                        s:`Score: ${stats.wtdRatingNum.toFixed(1)}`, y:false, r:true},
                {l:"Cedola Annua",   v:fe(stats.totCoupon),                    s:"Cash flow sul nominale", y:true},
              ].map((k,i)=>{
                const rc=k.r?(RATING_COLORS[stats.wtdRating]||C.blue):null;
                return(
                  <div key={i} style={{...card,padding:"20px 24px",
                    background:k.y?C.yellowL:k.r?rc+"11":C.card,
                    border:`1px solid ${k.y?C.yellowB:k.r?rc+"44":C.border}`}}>
                    <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8,color:k.y?"#92400e":k.r?rc:C.gray}}>{k.l}</p>
                    <p style={{fontSize:28,fontWeight:800,letterSpacing:"-.5px",marginBottom:2,color:k.y?"#78350f":k.r?rc:C.dark}}>{k.v}</p>
                    <p style={{fontSize:11,color:k.y?"#a16207":k.r?rc:C.gray}}>{k.s}</p>
                  </div>
                );
              })}
            </div>

            <div className="ba-chart-row">
              <div style={{...card,padding:"22px 24px"}}>
                <SL>Flusso Cedolare Mensile — sul nominale (€)</SL>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} vertical={false}/>
                    <XAxis dataKey="month" tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`€${v.toFixed(0)}`}/>
                    <Tooltip {...TTIP} formatter={v=>[`€${Number(v).toFixed(2)}`,"Cedola"]}/>
                    <Bar dataKey="cedola" radius={[6,6,0,0]}>
                      {monthlyData.map((e,i)=><Cell key={i} fill={e.cedola>0?C.yellow:C.lgray}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{...card,padding:"22px 24px"}}>
                <SL>Rating Distribution (%)</SL>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ratingData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} horizontal={false}/>
                    <XAxis type="number" tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`}/>
                    <YAxis dataKey="name" type="category" tick={{fill:C.dark,fontSize:11,fontWeight:600}} axisLine={false} tickLine={false} width={50}/>
                    <Tooltip {...TTIP} formatter={v=>[`${Number(v).toFixed(2)}%`,"Peso"]}/>
                    <Bar dataKey="peso" radius={[0,6,6,0]}>
                      {ratingData.map((e,i)=><Cell key={i} fill={RATING_COLORS[e.name]||C.blue}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {Math.abs(totalePeso-100)>0.05&&(
              <div style={{marginTop:14,background:C.yellowL,border:`1px solid ${C.yellowB}`,borderRadius:12,padding:"12px 18px",color:"#92400e",fontSize:13,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>⚠️</span>
                <span>I pesi sommano <b>{totalePeso.toFixed(4)}%</b> — portafoglio non bilanciato al 100%.</span>
              </div>
            )}

            {/* ── SCENARIO TASSI ─────────────────────────────────────────── */}
            <ScenarioRates bonds={bonds} totale={totale} stats={stats}/>

          </div>
        )}

        {/* ═══════════════ TITOLI ══════════════════════════════════════════ */}
        {activeTab==="bonds"&&(
          <div>
            <div className="ba-bonds-header">
              <div className="ba-bonds-filters">
                <h2 style={{fontSize:22,fontWeight:800}}>Titoli</h2>
                <span style={{background:C.lgray,color:C.gray,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{filtered.length}/{bonds.length}</span>
                {["Tutti","Governativo","Corporate","Sovranazionale"].map(t=>(
                  <button key={t} onClick={()=>setTipoFilter(t)} style={{
                    padding:"5px 14px",borderRadius:20,border:`1.5px solid ${tipoFilter===t?(TIPO_COLORS[t]||C.dark):C.border}`,
                    cursor:"pointer",fontSize:11,fontWeight:700,transition:"all 0.15s",
                    background:tipoFilter===t?(TIPO_BG[t]||C.lgray):"transparent",
                    color:tipoFilter===t?(TIPO_COLORS[t]||C.dark):C.gray,
                  }}>{t}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:12,color:C.gray}}>Nom: <b style={{color:C.green}}>{fe(stats.totNominale)}</b> · Esb: <b style={{color:C.blue}}>{fe(stats.totEffettivo)}</b></span>
                <Btn primary sm onClick={()=>setShowAddForm(v=>!v)}>+ Aggiungi</Btn>
              </div>
            </div>

            {showAddForm&&(
              <div style={{...card,border:`1.5px solid ${C.yellow}`,background:C.yellowL,padding:"20px 24px",marginBottom:16}}>
                <p style={{fontSize:14,fontWeight:800,color:"#78350f",marginBottom:14}}>Nuovo Titolo</p>
                <AddForm form={addForm} setForm={setAddForm}/>
                <div style={{display:"flex",gap:8,marginTop:14}}><Btn primary onClick={addBond}>Aggiungi</Btn><Btn onClick={()=>setShowAddForm(false)}>Annulla</Btn></div>
              </div>
            )}

            <div style={{...card,background:C.yellowL,border:`1px solid ${C.yellowB}`,padding:"9px 16px",marginBottom:10,fontSize:11,color:"#92400e",display:"flex",gap:20,flexWrap:"wrap"}}>
              <span>✏️ Clicca su un campo per modificarlo.</span>
              <span><b>CY%</b> = Cedola%/(Ask/100) — rendimento cedolare effettivo.</span>
              <span style={{fontStyle:"italic",color:C.gray}}>Esborso € e Ced.Ann.€ sono formule.</span>
            </div>

            <div style={{...card,padding:0,overflow:"hidden"}}>
              <div className="ba-table-wrap">
                <table className="ba-table-bonds" style={{borderCollapse:"collapse",fontSize:11.5,width:"max-content",minWidth:"100%"}}>
                  <thead>
                    <tr>
                      {/* col: field key | label | sort | w: minWidth per colonne numeriche, null = auto per testuali */}
                      {[
                        {col:"valuta",   label:"CCY",      sort:true,  w:null},
                        {col:"issuer",   label:"Emittente",sort:true,  w:null},
                        {col:"isin",     label:"ISIN",     sort:true,  w:null},
                        {col:"name",     label:"Nome",     sort:true,  w:null},
                        {col:"tipo",     label:"Tipo",     sort:true,  w:null},
                        {col:"seniority",label:"Seniority",sort:true,  w:null},
                        {col:"sector",   label:"Settore",  sort:true,  w:null},
                        {col:"scadenza", label:"Scad.",    sort:true,  w:null},
                        {col:"callDate", label:"Call",     sort:true,  w:null},
                        {col:"cedola",   label:"Ced%",     sort:true,  w:70},
                        {col:"ask",      label:"Ask",      sort:true,  w:76},
                        {col:"rateo",    label:"Rateo",    sort:true,  w:62},
                        {col:null,       label:"Dirty",    sort:false, w:70},
                        {col:"cy",       label:"CY%",      sort:true,  w:72},
                        {col:"yldYtm",   label:"YTM%",     sort:true,  w:72},
                        {col:"yldToCall",label:"YTC%",     sort:true,  w:72},
                        {col:"duration", label:"Dur",      sort:true,  w:60},
                        {col:null,       label:"Freq",     sort:false, w:62},
                        {col:"rating",   label:"Rating",   sort:true,  w:62},
                        {col:"peso",     label:"Peso%",    sort:true,  w:72},
                        {col:"nominale", label:"Nom.€",    sort:true,  w:100},
                        {col:"effettivo",label:"Esb.€",    sort:true,  w:100, italic:true},
                        {col:"cedAnnua", label:"Ced.€",    sort:true,  w:90,  italic:true},
                        {col:null,       label:"",         sort:false, w:40},
                      ].map(({col,label,sort,w,italic})=>{
                        const active = sortCol===col;
                        const arrow  = active ? (sortDir==="asc"?"↑":"↓") : "";
                        return(
                          <th key={label} onClick={sort&&col?()=>toggleSort(col):undefined}
                            style={{...TH,
                              // w:null = larghezza automatica dal contenuto
                              // w:number = minWidth fisso per colonne numeriche
                              ...(w ? {minWidth:w} : {}),
                              whiteSpace:"nowrap",
                              cursor:sort&&col?"pointer":"default",
                              userSelect:"none",
                              color: italic?"#9ca3af": col==="cy"?"#d97706": active?C.yellow: C.gray,
                              fontStyle: italic?"italic":"normal",
                              background: active?"#2a2a2a":C.lgray,
                              transition:"background 0.15s, color 0.15s",
                            }}>
                            {label}{arrow&&<span style={{marginLeft:3,fontSize:9,opacity:0.9}}>{arrow}</span>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(b=>{
                      const idx=bonds.indexOf(b),cy=calcCurrentYield(b),cyd=cy-b.cedola;
                      const senCol=SENIORITY_COLORS[b.seniority]||C.green;
                      const senBg =SENIORITY_BG[b.seniority]||C.greenL;
                      return(
                        <tr key={b.isin} onMouseEnter={e=>e.currentTarget.style.background=C.lgray}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          {/* CCY */}
                          <td style={{...TD,padding:"6px 8px"}}>
                            <Pill bg={`${CURRENCY_COLORS[b.valuta]||C.blue}22`} color={CURRENCY_COLORS[b.valuta]||C.blue} border={`${CURRENCY_COLORS[b.valuta]||C.blue}55`}>{b.valuta}</Pill>
                          </td>
                          {/* Emittente */}
                          <td style={{...TD,whiteSpace:"nowrap",fontSize:11,color:C.gray}}>{b.issuer}</td>
                          {/* ISIN */}
                          <td style={{...TD,fontFamily:"monospace",fontSize:10,color:C.gray,whiteSpace:"nowrap"}}>{b.isin}</td>
                          {/* Nome */}
                          <td style={{...TD,whiteSpace:"nowrap",fontWeight:600}}>{b.name}</td>
                          {/* Tipo */}
                          <td style={{...TD,padding:"6px 8px"}}>
                            <select value={b.tipo} onChange={e=>updateBond(idx,"tipo",e.target.value)}
                              style={{background:TIPO_BG[b.tipo],border:`1px solid ${TIPO_COLORS[b.tipo]||C.border}44`,color:TIPO_COLORS[b.tipo]||C.dark,borderRadius:20,fontSize:10,fontWeight:700,padding:"3px 7px",cursor:"pointer",outline:"none"}}>
                              <option>Governativo</option><option>Corporate</option><option>Sovranazionale</option>
                            </select>
                          </td>
                          {/* Seniority */}
                          <td style={{...TD,padding:"6px 8px"}}>
                            <select value={b.seniority||"Senior Unsecured"} onChange={e=>updateBond(idx,"seniority",e.target.value)}
                              style={{background:senBg,border:`1px solid ${senCol}44`,color:senCol,borderRadius:20,fontSize:10,fontWeight:700,padding:"3px 7px",cursor:"pointer",outline:"none",maxWidth:130}}>
                              <option>Senior Unsecured</option><option>Senior Secured</option>
                              <option>Tier 2</option><option>AT1</option><option>Junior Subordinated</option>
                            </select>
                          </td>
                          {/* Settore */}
                          <td style={{...TD,whiteSpace:"nowrap",fontSize:10,color:C.gray}}>
                            <IField type="text" v={b.sector||""} onCommit={v=>updateBond(idx,"sector",v)} w={130} color={SECTOR_COLORS[b.sector]||C.gray} align="left"/>
                          </td>
                          {/* Scadenza — mostra DD/MM/YYYY, converte a ISO on commit */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField type="text" v={fmtDate(b.scadenza)} onCommit={v=>{
                              const m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
                              updateBond(idx,"scadenza",m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:v);
                            }} w={82} align="left" mono/>
                          </td>
                          {/* Call — mostra DD/MM/YYYY, converte a ISO on commit */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField type="text" v={fmtDate(b.callDate)} onCommit={v=>{
                              if(!v||v==="—"||v.trim()===""){updateBond(idx,"callDate","");return;}
                              const m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
                              updateBond(idx,"callDate",m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:v);
                            }} w={82} color="#d97706" align="left" mono/>
                          </td>
                          {/* Cedola */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={b.cedola} onCommit={v=>updateBond(idx,"cedola",v)} w={52}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* Ask */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={b.ask} onCommit={v=>updateBond(idx,"ask",v)} w={68} color={b.ask>100?C.red:b.ask<100?C.green:C.dark}/>
                          </td>
                          {/* Rateo cedola (Accrued %) */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField v={b.rateo||0} onCommit={v=>updateBond(idx,"rateo",v)} w={54} color="#7c3aed"/>
                          </td>
                          {/* Dirty Price = Ask + Rateo */}
                          <td style={{...TD,textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#7c3aed",fontWeight:600,fontStyle:"italic",whiteSpace:"nowrap"}}>
                            {calcDirtyPrice(b).toFixed(3)}
                          </td>
                          {/* CY% */}
                          <td style={{...TD,textAlign:"right",whiteSpace:"nowrap"}}>
                            <b style={{color:cyd<-0.01?C.red:cyd>0.01?C.green:C.dark,fontSize:11}}>{cy.toFixed(3)}%</b>
                            <span style={{fontSize:9,marginLeft:2,color:cyd<-0.01?C.red:cyd>0.01?C.green:C.gray}}>{cyd<-0.01?"▼":cyd>0.01?"▲":"="}</span>
                          </td>
                          {/* YTM */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={b.yldYtm} onCommit={v=>updateBond(idx,"yldYtm",v)} w={58} color={C.green}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* YTC */}
                          <td style={{...TD,textAlign:"right",fontSize:11,whiteSpace:"nowrap",color:b.yldToCall?"#d97706":C.border}}>
                            {b.yldToCall?`${Number(b.yldToCall).toFixed(3)}%`:"—"}
                          </td>
                          {/* Duration */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField v={b.duration||""} onCommit={v=>updateBond(idx,"duration",v)} w={52}/>
                          </td>
                          {/* Freq */}
                          <td style={{...TD,padding:"5px 6px",textAlign:"center",fontSize:11,color:C.gray}}>
                            <select value={b.couponFreq||1} onChange={e=>updateBond(idx,"couponFreq",e.target.value)}
                              style={{background:"transparent",border:"none",color:C.gray,fontSize:11,cursor:"pointer",outline:"none"}}>
                              <option value={0}>ZC</option><option value={1}>Ann.</option>
                              <option value={2}>Sem.</option><option value={4}>Trim.</option><option value={12}>Mens.</option>
                            </select>
                          </td>
                          {/* Rating */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField type="text" v={b.rating} onCommit={v=>updateBond(idx,"rating",v)} w={52} color={RATING_COLORS[b.rating]||C.blue} align="center"/>
                          </td>
                          {/* Peso */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={parseFloat(b.peso.toFixed(4))} onCommit={v=>updateBond(idx,"peso",v)} w={52}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* Nominale — step=incrMin per frecce browser, warning se fuori taglio */}
                          {(()=>{
                            const nom = calcNominale(b,totale);
                            const tm  = Math.max(b.taglioMin > 0 ? b.taglioMin : 1000, 1000); // min ≥ 1000
                            const im  = b.incrMin   > 0 ? b.incrMin   : 1;
                            const chk = checkNominale(Math.round(nom), tm, im);
                            return(
                              <td style={{...TD,padding:"5px 6px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <IField
                                    v={parseFloat(nom.toFixed(2))}
                                    step={im}
                                    onCommit={v=>updateBond(idx,"nominale",parseFloat(v)||0)}
                                    onStep={delta=>{
                                      // Frecce: incrementa/decrementa direttamente il nominale
                                      const cur = Math.round(nom / im) * im; // allinea al multiplo
                                      const next = Math.max(0, cur + delta);
                                      updateBond(idx,"nominale", next);
                                    }}
                                    w={90} color={chk.ok ? C.green : C.red}
                                  />
                                  {!chk.ok&&(
                                    <span title={`${chk.reason}`}
                                      style={{fontSize:14,cursor:"help",lineHeight:1,flexShrink:0}}>⚠️</span>
                                  )}
                                </div>
                                {!chk.ok&&(
                                  <div style={{fontSize:9,color:C.red,marginTop:2,whiteSpace:"nowrap"}}>
                                    {chk.reason}
                                  </div>
                                )}
                              </td>
                            );
                          })()}
                          {/* Esborso */}
                          <td style={{...TD,textAlign:"right",fontFamily:"monospace",fontStyle:"italic",color:C.blue,fontSize:11,fontWeight:600}}>{fe(calcEffettivo(b,totale))}</td>
                          {/* Cedola annua */}
                          <td style={{...TD,textAlign:"right",fontFamily:"monospace",fontStyle:"italic",color:"#d97706",fontSize:11}}>{fe(calcCouponAnnuo(b,totale))}</td>
                          {/* Delete */}
                          <td style={{...TD,padding:"6px 8px"}}>
                            <button onClick={()=>delBond(idx)} style={{background:"#fef2f2",color:C.red,border:"1px solid #fecaca",borderRadius:8,padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {bonds.length>0&&tipoFilter==="Tutti"&&(
                    <tfoot>
                      <tr style={{background:C.yellowL,borderTop:`2px solid ${C.yellow}`}}>
                        <td colSpan={19} style={{padding:"10px 11px",color:"#78350f",fontWeight:800,fontSize:12}}>TOTALE</td>
                        <td style={{padding:"10px 11px",textAlign:"right",fontWeight:800}}>{totalePeso.toFixed(4)}%</td>
                        <td style={{padding:"10px 11px",textAlign:"right",color:C.green,fontWeight:800,fontFamily:"monospace"}}>{fe(stats.totNominale)}</td>
                        <td style={{padding:"10px 11px",textAlign:"right",color:C.blue,fontWeight:800,fontFamily:"monospace"}}>{fe(stats.totEffettivo)}</td>
                        <td style={{padding:"10px 11px",textAlign:"right",color:"#d97706",fontWeight:800,fontFamily:"monospace"}}>{fe(stats.totCoupon)}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ CEDOLE ══════════════════════════════════════════ */}
        {activeTab==="cedole"&&(
          <div>
            <h2 style={{fontSize:22,fontWeight:800,marginBottom:18}}>Flusso Cedolare</h2>
            <div className="ba-grid-12" style={{marginBottom:18}}>
              {monthlyData.map((m,i)=>(
                <div key={i} style={{...card,padding:"12px 8px",textAlign:"center",background:m.cedola>0?C.yellowL:C.card,border:`1px solid ${m.cedola>0?C.yellowB:C.border}`}}>
                  <p style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5,color:m.cedola>0?"#92400e":C.gray}}>{m.month}</p>
                  <p style={{fontSize:15,fontWeight:800,color:m.cedola>0?"#78350f":C.lgray}}>{m.cedola>0?`€${m.cedola.toFixed(0)}`:"—"}</p>
                </div>
              ))}
            </div>
            <div style={{...card,padding:"22px 24px",marginBottom:16}}>
              <SL>Distribuzione mensile (€ sul nominale)</SL>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} barCategoryGap="40%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:C.gray,fontSize:12}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`€${v.toFixed(0)}`}/>
                  <Tooltip {...TTIP} formatter={v=>[`€${Number(v).toFixed(2)}`,"Cedola"]}/>
                  <Bar dataKey="cedola" radius={[6,6,0,0]}>
                    {monthlyData.map((e,i)=><Cell key={i} fill={e.cedola>0?C.yellow:C.lgray}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <div className="ba-table-wrap">
                <table className="ba-table-cedole" style={{borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr>
                      <th style={{...TH,position:"sticky",left:0,zIndex:10}}>ISIN</th>
                      <th style={{...TH,position:"sticky",left:120,zIndex:10}}>Freq</th>
                      {MONTHS_FULL.map(m=><th key={m} style={{...TH,textAlign:"right"}}>{m.substring(0,3)}</th>)}
                      <th style={{...TH,textAlign:"right",background:C.yellowL,color:"#92400e"}}>TOT. ANNUO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cedoleTable.map((row,ri)=>{
                      const b=bonds[ri];
                      return(
                        <tr key={row.isin} style={{borderBottom:`1px solid ${C.lgray}`}}>
                          <td style={{...TD,color:C.gray,fontFamily:"monospace",fontSize:10,position:"sticky",left:0,background:C.card,zIndex:5,whiteSpace:"nowrap"}}>{row.isin}</td>
                          <td style={{...TD,position:"sticky",left:120,background:C.card,zIndex:5,fontSize:10,color:C.gray}}>
                            <span style={{background:C.lgray,borderRadius:10,padding:"2px 7px",fontSize:9,fontWeight:600}}>{FREQ_LABEL[b?.couponFreq||1]||"Ann."}</span>
                          </td>
                          {MONTHS_FULL.map(m=>(
                            <td key={m} style={{...TD,textAlign:"right",fontFamily:"monospace",color:row[m]?"#78350f":C.border,fontWeight:row[m]?700:400,background:row[m]?C.yellowL:C.card}}>
                              {row[m]?`€${row[m].toFixed(2)}`:"—"}
                            </td>
                          ))}
                          <td style={{...TD,textAlign:"right",color:"#78350f",fontFamily:"monospace",fontWeight:800,background:C.yellowL}}>
                            {fe(MONTHS_FULL.reduce((s,m)=>s+(row[m]||0),0))}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{borderTop:`2px solid ${C.yellow}`,background:C.yellowL}}>
                      <td style={{padding:"10px 11px",color:"#78350f",fontWeight:800,position:"sticky",left:0,background:C.yellowL,zIndex:5}}>TOTALE</td>
                      <td style={{padding:"10px 11px",position:"sticky",left:120,background:C.yellowL,zIndex:5}}/>
                      {monthlyData.map((m,i)=>(
                        <td key={i} style={{padding:"10px 11px",textAlign:"right",color:"#78350f",fontWeight:800,fontFamily:"monospace"}}>
                          {m.cedola>0?`€${m.cedola.toFixed(2)}`:"—"}
                        </td>
                      ))}
                      <td style={{padding:"10px 11px",textAlign:"right",color:"#78350f",fontWeight:800,fontFamily:"monospace"}}>
                        {fe(monthlyData.reduce((s,m)=>s+m.cedola,0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ SCADENZE ════════════════════════════════════════ */}
        {activeTab==="scadenze"&&(
          <div>
            <div className="ba-scad-header">
              <h2 style={{fontSize:22,fontWeight:800}}>Profilo di Scadenza</h2>
              <div style={{...card,padding:"12px 20px",display:"flex",alignItems:"center",gap:20}}>
                <span style={{fontSize:11,color:C.gray,fontWeight:700}}>Scenario:</span>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <Check checked={showMaturity} onToggle={()=>setShowMaturity(v=>!v)} color={C.blue}/>
                  <span style={{fontSize:12,fontWeight:600}}>A Scadenza</span>
                  <span style={{width:18,height:4,background:C.blue,borderRadius:2,display:"inline-block"}}/>
                </label>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <Check checked={showCall} onToggle={()=>setShowCall(v=>!v)} color={C.yellow}/>
                  <span style={{fontSize:12,fontWeight:600}}>A Call</span>
                  <span style={{width:18,height:4,background:C.yellow,borderRadius:2,display:"inline-block"}}/>
                </label>
                <span style={{fontSize:11,color:C.gray}}>{bonds.filter(b=>b.callDate).length} titoli con call</span>
              </div>
            </div>
            <div style={{...card,padding:"22px 24px",marginBottom:16}}>
              <SL>Rimborso per data (% portafoglio) — barre sovrapposte</SL>
              <ResponsiveContainer width="100%" height={230}>
                {/* barCategoryGap e barGap controllano spazio tra gruppi e tra barre nello stesso gruppo */}
                <BarChart data={scadenzeData} barCategoryGap="30%" barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`}/>
                  <Tooltip {...TTIP} formatter={(v,n)=>[v>0?`${Number(v).toFixed(4)}%`:"—",n==="pM"?"A Scadenza":"A Call"]}/>
                  {/* NESSUN stackId: barre affiancate. Quando una è nascosta l'altra occupa tutto lo spazio senza sovrapposizioni */}
                  {showMaturity&&<Bar dataKey="pM" name="pM" fill={C.blue} radius={[4,4,0,0]} maxBarSize={40}/>}
                  {showCall    &&<Bar dataKey="pC" name="pC" fill={C.yellow} radius={[4,4,0,0]} maxBarSize={40}/>}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <div className="ba-table-wrap">
                <table style={{minWidth:1100,width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                  <thead>
                    <tr>
                      {/* Colonne con larghezza minima esplicita per evitare sfasamento */}
                      {[
                        {h:"ISIN",     w:108, align:"left"},
                        {h:"Emittente",w:160, align:"left"},
                        {h:"Tipo",     w:100, align:"left"},
                        {h:"Seniority",w:90,  align:"left"},
                        {h:"Scadenza", w:92,  align:"left"},
                        {h:"Call",     w:92,  align:"left"},
                        {h:"Rating",   w:62,  align:"left"},
                        {h:"Peso%",    w:65,  align:"right"},
                        {h:"Nom.€",    w:90,  align:"right"},
                        {h:"Esb.€",    w:90,  align:"right"},
                        {h:"CY%",      w:62,  align:"right", yellow:true},
                        {h:"YTM%",     w:62,  align:"right"},
                        {h:"YTC%",     w:62,  align:"right"},
                      ].map(({h,w,align,yellow})=>(
                        <th key={h} style={{...TH, minWidth:w, textAlign:align,
                          ...(yellow?{color:"#d97706"}:{})}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...bonds].sort((a,b)=>new Date(a.scadenza)-new Date(b.scadenza)).map(b=>{
                      const cy=calcCurrentYield(b);
                      return(
                        <tr key={b.isin} onMouseEnter={e=>e.currentTarget.style.background=C.lgray}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{...TD,fontFamily:"monospace",fontSize:10,color:C.gray,whiteSpace:"nowrap"}}>{b.isin}</td>
                          <td style={{...TD,whiteSpace:"nowrap",fontSize:11,color:C.gray}}>{b.issuer}</td>
                          <td style={{...TD,padding:"7px 8px",whiteSpace:"nowrap"}}><Pill bg={TIPO_BG[b.tipo]} color={TIPO_COLORS[b.tipo]} border={TIPO_COLORS[b.tipo]+"44"}>{b.tipo}</Pill></td>
                          <td style={{...TD,padding:"7px 8px",whiteSpace:"nowrap"}}>
                            <Pill bg={SENIORITY_BG[b.seniority]||C.greenL} color={SENIORITY_COLORS[b.seniority]||C.green} border={(SENIORITY_COLORS[b.seniority]||C.green)+"44"}>
                              {(b.seniority||"Senior").replace("Unsecured","").replace("Secured","Sec.").trim()}
                            </Pill>
                          </td>
                          <td style={{...TD,fontFamily:"monospace",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{fmtDate(b.scadenza)}</td>
                          <td style={{...TD,fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap",color:b.callDate?"#d97706":C.gray,fontWeight:b.callDate?700:400}}>{fmtDate(b.callDate)}</td>
                          <td style={{...TD,padding:"7px 8px",whiteSpace:"nowrap"}}><Pill bg={`${RATING_COLORS[b.rating]||C.blue}22`} color={RATING_COLORS[b.rating]||C.blue} border={`${RATING_COLORS[b.rating]||C.blue}44`}>{b.rating}</Pill></td>
                          <td style={{...TD,textAlign:"right",fontWeight:600,whiteSpace:"nowrap"}}>{b.peso.toFixed(2)}%</td>
                          <td style={{...TD,textAlign:"right",color:C.green,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}>{fe(calcNominale(b,totale))}</td>
                          <td style={{...TD,textAlign:"right",color:C.blue,fontFamily:"monospace",fontWeight:600,whiteSpace:"nowrap"}}>{fe(calcEsborso(b,totale))}</td>
                          <td style={{...TD,textAlign:"right",fontWeight:700,whiteSpace:"nowrap",color:cy<b.cedola?C.red:cy>b.cedola?C.green:C.dark}}>{cy.toFixed(3)}%</td>
                          <td style={{...TD,textAlign:"right",fontWeight:700,color:C.green,whiteSpace:"nowrap"}}>{b.yldYtm.toFixed(3)}%</td>
                          <td style={{...TD,textAlign:"right",whiteSpace:"nowrap",color:b.yldToCall?"#d97706":C.border}}>{b.yldToCall?`${Number(b.yldToCall).toFixed(3)}%`:"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ FLUSSI PLURIENNALI ════════════════════════════ */}
        {activeTab==="flussi"&&(
          <CashFlowPluriennale bonds={bonds} totale={totale}/>
        )}

        {/* ═══════════════ COMPOSIZIONE ════════════════════════════════════ */}
        {activeTab==="composizione"&&(
          <div>
            <h2 style={{fontSize:22,fontWeight:800,marginBottom:20}}>Composizione Portafoglio</h2>

            {/* Riga 1: Rating + Tipo + Seniority */}
            <div className="ba-comp-row1">
              <MiniPie data={ratingData}    colorMap={RATING_COLORS}    title="Per Rating"/>
              <MiniPie data={tipoData}      colorMap={TIPO_COLORS}      title="Per Tipologia"/>
              <MiniPie data={seniData}      colorMap={SENIORITY_COLORS} title="Per Seniority / Subordinazione"/>
            </div>

            {/* Riga 2: Settore + Valuta + Tipo Cedola */}
            <div className="ba-comp-row2">

              {/* Settore — barchart orizzontale (più leggibile con tanti settori) */}
              <div style={{...card,padding:"22px 24px"}}>
                <SL>Per Settore Economico</SL>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={sectorData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} horizontal={false}/>
                    <XAxis type="number" tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`}/>
                    <YAxis dataKey="name" type="category" tick={{fill:C.dark,fontSize:11,fontWeight:600}} axisLine={false} tickLine={false} width={130}/>
                    <Tooltip {...TTIP} formatter={v=>[`${Number(v).toFixed(2)}%`,"Peso"]}/>
                    <Bar dataKey="peso" radius={[0,6,6,0]}>
                      {sectorData.map((e,i)=><Cell key={i} fill={SECTOR_COLORS[e.name]||`hsl(${i*53},60%,52%)`}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <MiniPie data={currencyData}  colorMap={CURRENCY_COLORS}  title="Per Valuta (Currency)"/>
              <MiniPie data={couponTypeData} colorMap={COUPON_TYPE_COLORS} title="Per Tipo Cedola"/>
            </div>

            {/* Riga 3: Metriche aggregate */}
            <div style={{...card,padding:"22px 24px"}}>
              <SL>Metriche Aggregate</SL>
              <div className="ba-metrics">
                {[
                  ["YTM Ponderato",   fp(stats.wtdYtm),               C.green],
                  ["Rating Medio",    stats.wtdRating,                 RATING_COLORS[stats.wtdRating]||C.blue],
                  ["CY Media Pond.",  fp(bonds.reduce((s,b)=>s+calcCurrentYield(b)*b.peso/100,0)), "#d97706"],
                  ["Cedola Media",    fp(stats.wtdCedola),             C.dark],
                  ["Duration Pond.",  `${stats.wtdDuration.toFixed(2)} anni`, C.dark],
                  ["Nominale Totale", fe(stats.totNominale),           C.blue],
                  ["Esborso Totale",  fe(stats.totEffettivo),          C.green],
                  ["Disaggio/Premio", (stats.disaggio>=0?"+":"")+fe(stats.disaggio), stats.disaggio>=0?C.green:C.red],
                  ["Cedola Annua",    fe(stats.totCoupon),             "#d97706"],
                  ["N° Titoli",       String(bonds.length),            C.dark],
                  ["YTM Min",         fp(bonds.length?Math.min(...bonds.map(b=>b.yldYtm)):0), C.dark],
                  ["YTM Max",         fp(bonds.length?Math.max(...bonds.map(b=>b.yldYtm)):0), C.dark],
                  ["Titoli con Call", `${bonds.filter(b=>b.callDate).length}/${bonds.length}`, "#d97706"],
                ].map(([l,v,col],i)=>(
                  <div key={i} style={{...card,padding:"14px 16px",background:C.lgray,border:`1px solid ${C.border}`}}>
                    <p style={{fontSize:9,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>{l}</p>
                    <p style={{fontSize:17,fontWeight:800,color:col||C.dark,fontFamily:"monospace"}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FORM AGGIUNTA ────────────────────────────────────────────────────────────
function AddForm({form,setForm}) {
  const IS={background:"#fff",border:`1px solid ${C.border}`,color:C.dark,borderRadius:8,padding:"7px 10px",fontSize:12,width:"100%",outline:"none"};
  const LS={color:C.gray,fontSize:10,marginBottom:4,display:"block",fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase"};
  const F=({k,l,t,opts})=>(
    <div><label style={LS}>{l}</label>
      {opts
        ?<select value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={IS}>{opts.map(o=><option key={o}>{o}</option>)}</select>
        :<input type={t||"text"} value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} style={IS} step={t==="number"?"any":undefined}/>}
    </div>
  );
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",gap:10}}>
      <F k="valuta"     l="Valuta"      opts={["EUR","USD","GBP","CHF","JPY"]}/>
      <F k="isin"       l="ISIN"        t="text"/>
      <F k="name"       l="Nome Titolo" t="text"/>
      <F k="issuer"     l="Emittente"   t="text"/>
      <F k="tipo"       l="Tipologia"   opts={["Governativo","Corporate","Sovranazionale"]}/>
      <F k="seniority"  l="Seniority"   opts={["Senior Unsecured","Senior Secured","Tier 2","AT1","Junior Subordinated"]}/>
      <F k="tipoCedola" l="Tipo Cedola" opts={["Fixed","Variable","Zero Coupon","Step Up","Inflazione"]}/>
      <F k="couponFreq" l="Freq. Cedola" opts={["1","2","4","12","0"]}/>
      <F k="sector"     l="Settore"     t="text"/>
      <F k="scadenza"   l="Scadenza"    t="date"/>
      <F k="callDate"   l="Call Date"   t="date"/>
      <F k="rating"     l="Rating"      t="text"/>
      <F k="cedola"     l="Cedola %"    t="number"/>
      <F k="ask"        l="Ask"         t="number"/>
      <F k="yldYtm"     l="YTM %"       t="number"/>
      <F k="yldToCall"  l="YTC %"       t="number"/>
      <F k="duration"   l="Duration"    t="number"/>
      <F k="taglioMin"  l="Taglio Min." t="number"/>
      <F k="peso"       l="Peso %"      t="number"/>
      <F k="ammEmesso"  l="Amm. Emesso" t="number"/>
      <F k="rateo"      l="Rateo (Accrued %)" t="number"/>
      <F k="incrMin"    l="Incremento Minimo" t="number"/>
    </div>
  );
}
