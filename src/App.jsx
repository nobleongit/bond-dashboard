import { useState, useMemo, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

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

// ─── DATI INIZIALI (aggiornati dal file Excel reale) ──────────────────────────
const INITIAL_BONDS = [
  { valuta:"EUR", issuer:"ROMANIA (GOVERNMENT)",                        isin:"XS2109812508", name:"ROGV 2.000 01/28/32 MTN",     scadenza:"2032-01-28", callDate:"",           cedola:2.0,   ask:88.668,  yldYtm:4.323556, yldToCall:null,     duration:5.3701, taglioMin:1000, rating:"BBB-", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1400000000  },
  { valuta:"EUR", issuer:"GREECE, REPUBLIC OF (GOVERNMENT)",            isin:"GR0133010232", name:"GRGV 4.300 02/24/32",           scadenza:"2032-02-24", callDate:"",           cedola:4.3,   ask:103.776, yldYtm:3.626913, yldToCall:null,     duration:5.2209, taglioMin:1,    rating:"BBB",  peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Variable", couponFreq:1, sector:"Government Activity",  ammEmesso:126192685   },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005094088", name:"ITGV 1.650 03/01/32",           scadenza:"2032-03-01", callDate:"",           cedola:1.65,  ask:94.046,  yldYtm:2.769985, yldToCall:null,     duration:5.5702, taglioMin:1000, rating:"BBB+", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:2, sector:"Government Activity",  ammEmesso:27451727000 },
  { valuta:"EUR", issuer:"EUROPEAN BANK FOR RECONSTRUCTION AND DEV.",   isin:"XS3030091329", name:"EBRD 2.875 03/22/32 MTN",       scadenza:"2032-03-22", callDate:"",           cedola:2.875, ask:100.982, yldYtm:2.73473,  yldToCall:null,     duration:5.3514, taglioMin:1000, rating:"AAA",  peso:10,   tipo:"Sovranazionale", seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1025000000  },
  { valuta:"EUR", issuer:"HUNGARY (GOVERNMENT)",                        isin:"XS2161992511", name:"HUGV 1.625 04/28/32",           scadenza:"2032-04-28", callDate:"",           cedola:1.625, ask:89.276,  yldYtm:3.618185, yldToCall:null,     duration:5.5989, taglioMin:1000, rating:"BBB-", peso:10,   tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:1000000000  },
  { valuta:"EUR", issuer:"POLAND, REPUBLIC OF (GOVERNMENT)",            isin:"XS2447602793", name:"PLGV 2.750 05/25/32 MTN",       scadenza:"2032-05-25", callDate:"",           cedola:2.75,  ask:99.05,   yldYtm:2.956581, yldToCall:null,     duration:5.525,  taglioMin:1000, rating:"A-",   peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:2000000000  },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005672024", name:"ITGV 2.600 10/28/32",           scadenza:"2032-10-28", callDate:"",           cedola:2.6,   ask:101.121, yldYtm:3.038123, yldToCall:null,     duration:5.9047, taglioMin:1000, rating:"BBB+", peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Variable", couponFreq:4, sector:"Government Activity",  ammEmesso:16572074000 },
  { valuta:"EUR", issuer:"ITALY, REPUBLIC OF (GOVERNMENT)",             isin:"IT0005668220", name:"ITGV 3.250 11/15/32",           scadenza:"2032-11-15", callDate:"",           cedola:3.25,  ask:102.265, yldYtm:2.896075, yldToCall:null,     duration:null,   taglioMin:1000, rating:"BBB+", peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:2, sector:"Government Activity",  ammEmesso:18700000000 },
  { valuta:"EUR", issuer:"FRANCE, REPUBLIC OF (GOVERNMENT)",            isin:"FR001400BKZ3", name:"FRGV 2.000 11/25/32",           scadenza:"2032-11-25", callDate:"",           cedola:2.0,   ask:94.937,  yldYtm:2.841852, yldToCall:null,     duration:6.148,  taglioMin:1,    rating:"A+",   peso:5,    tipo:"Governativo",    seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Government Activity",  ammEmesso:59439000000 },
  { valuta:"EUR", issuer:"RWE AG",                                      isin:"XS2743711298", name:"RWEG 3.625 01/10/32 MTN",       scadenza:"2032-01-10", callDate:"2031-10-10", cedola:3.625, ask:103.663, yldYtm:2.967237, yldToCall:2.942511, duration:5.0103, taglioMin:1000, rating:"Baa2", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Utilities",             ammEmesso:500000000   },
  { valuta:"EUR", issuer:"BMW FINANCE NV",                              isin:"XS3280519078", name:"BMWG 3.250 01/27/32 MTN",       scadenza:"2032-01-27", callDate:"",           cedola:3.25,  ask:100.736, yldYtm:3.135625, yldToCall:null,     duration:5.2898, taglioMin:1000, rating:"ND",   peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Consumer Cyclicals",    ammEmesso:650000000   },
  { valuta:"EUR", issuer:"FRESENIUS FINANCE IRELAND PLC",               isin:"XS1554373834", name:"FREG 3.000 01/30/32 MTN",       scadenza:"2032-01-30", callDate:"2031-10-30", cedola:3.0,   ask:100.066, yldYtm:3.058468, yldToCall:3.06226,  duration:5.3311, taglioMin:1000, rating:"ND",   peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Healthcare",            ammEmesso:500000000   },
  { valuta:"EUR", issuer:"E.ON SE",                                     isin:"XS2791959906", name:"EONG 3.500 03/25/32 MTN",       scadenza:"2032-03-25", callDate:"2031-12-25", cedola:3.5,   ask:102.535, yldYtm:3.068601, yldToCall:3.053273, duration:5.0553, taglioMin:1000, rating:"BBB+", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Utilities",             ammEmesso:800000000   },
  { valuta:"EUR", issuer:"HEIDELBERG MATERIALS AG",                     isin:"XS2577874782", name:"HEIG 3.750 05/31/32 MTN",       scadenza:"2032-05-31", callDate:"2032-02-29", cedola:3.75,  ask:103.799, yldYtm:3.112654, yldToCall:3.091131, duration:5.187,  taglioMin:1000, rating:"BBB",  peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Basic Materials",        ammEmesso:750000000   },
  { valuta:"EUR", issuer:"DEUTSCHE LUFTHANSA AG",                       isin:"XS2892988192", name:"LHAG 4.125 09/03/32 MTN",       scadenza:"2032-09-03", callDate:"2032-06-03", cedola:4.125, ask:105.504, yldYtm:3.210796, yldToCall:3.180804, duration:5.3817, taglioMin:1000, rating:"BBB-", peso:5,    tipo:"Corporate",      seniority:"Senior Unsecured", tipoCedola:"Fixed",    couponFreq:1, sector:"Industrials",           ammEmesso:500000000   },
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

const calcEffettivo     = (b,t) => (b.peso/100)*t;
const calcNominale      = (b,t) => calcEffettivo(b,t)/(b.ask/100);
const calcCouponAnnuo   = (b,t) => calcNominale(b,t)*(b.cedola/100);
const calcCouponSingolo = (b,t) => { const m=getCouponMonths(b); return m.length?calcCouponAnnuo(b,t)/m.length:0; };
const calcCurrentYield  = (b)   => b.cedola/(b.ask/100);

const fe  = (n) => "€"+Number(n).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2});
const fn  = (n) => Number(n).toLocaleString("it-IT",{maximumFractionDigits:0});
const fp  = (n,d=3) => Number(n).toFixed(d)+"%";

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

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { error:"CSV non valido." };
  const sep  = lines[0].includes(";") ? ";" : ",";
  const hdrs = lines[0].split(sep).map(h=>h.trim().toLowerCase().replace(/['"]/g,""));
  const ix   = (...al) => { for(const a of al){const i=hdrs.indexOf(a);if(i>=0)return i;} return -1; };
  const c = {
    valuta:   ix("valuta","currency","ccy"),
    issuer:   ix("issuer","issuer name","emittente","issuer_name"),
    isin:     ix("isin"),
    name:     ix("name","nome","security name","security_name"),
    scadenza: ix("scadenza","maturity","scad"),
    callDate: ix("calldate","call_date","call date"),
    cedola:   ix("cedola","coupon","cedola%","coupon%"),
    ask:      ix("ask","ask price","prezzo"),
    yldYtm:   ix("yldytm","ytm","yield","rendimento","yld ytm ask","yld_ytm_ask"),
    yldToCall:ix("yldtocall","yld to call","ytc","yld_to_call"),
    duration: ix("duration","dur","durata","modified duration"),
    taglioMin:ix("tagliomin","taglio_min","taglio minimo","taglio","min denomination"),
    rating:   ix("rating"),
    peso:     ix("peso","peso%","weight","controvalore"),
    tipo:     ix("tipo","type","categoria"),
    seniority:ix("seniority","subordinazione","seniorita"),
    tipoCedola:ix("tipocedola","tipo cedola","coupon type","tipo_cedola"),
    couponFreq:ix("couponfreq","coupon freq","coupon fred","frequenza","freq"),
    sector:   ix("sector","settore","economic sector","economic_sector"),
    ammEmesso:ix("ammemesso","amm emesso","ammontare emesso","issued amount","ammontare_emesso"),
  };
  const bonds=[],errs=[];
  for(let i=1;i<lines.length;i++){
    const row=lines[i].split(sep).map(x=>x.trim().replace(/^["']|["']$/g,""));
    if(row.length<3||row.every(x=>!x)) continue;
    const g  = (k)=>c[k]>=0?(row[c[k]]||""):"";
    const gn = (k,d=0)=>{const v=parseFloat(g(k).replace(",","."));return isNaN(v)?d:v;};
    if(!g("isin")){errs.push(`Riga ${i+1}: ISIN mancante`);continue;}

    // Peso: se <2 è in formato decimale (0.1=10%), altrimenti già percentuale
    let peso = gn("peso");
    if(peso>0 && peso<2) peso=peso*100;

    // NULL come stringa → null
    const cleanNull=(v)=>(!v||v.toLowerCase()==="null"||v==="0")?null:v;
    const callD = cleanNull(g("callDate"));
    const ytc   = cleanNull(g("yldToCall"));

    bonds.push({
      valuta:   g("valuta")||"EUR",
      issuer:   g("issuer")||"—",
      isin:     g("isin"),
      name:     g("name")||g("isin"),
      scadenza: g("scadenza"),
      callDate: callD||"",
      cedola:   gn("cedola"),
      ask:      gn("ask",100),
      yldYtm:   gn("yldYtm"),
      yldToCall:ytc?parseFloat(ytc):null,
      duration: gn("duration")||null,
      taglioMin:gn("taglioMin",1000),
      rating:   g("rating")||"ND",
      peso,
      tipo:     g("tipo")||"Corporate",
      seniority:normalizeSeniority(g("seniority")),
      tipoCedola:normalizeCouponType(g("tipoCedola")),
      couponFreq:gn("couponFreq",1)||1,
      sector:   g("sector")||"—",
      ammEmesso:gn("ammEmesso"),
    });
  }
  if(!bonds.length) return {error:"Nessun titolo valido trovato."};
  return {bonds,errs};
}

function downloadCSVTemplate() {
  const h="valuta;issuer;isin;name;scadenza;callDate;cedola;ask;yldYtm;yldToCall;duration;taglioMin;rating;peso;tipo;seniority;tipoCedola;couponFreq;sector;ammEmesso";
  const e="EUR;EXAMPLE CORP;XS1234567890;EXAMPLE 3.500 01/15/30;2030-01-15;2029-10-15;3.5;101.5;3.2;3.1;4.8;1000;BBB+;5;Corporate;Senior Unsecured;Fixed;1;Utilities;500000000";
  const w=window.open("","_blank","width=700,height=220");
  if(w){w.document.write(`<pre style="font-family:monospace;padding:20px;font-size:12px">${h}\n${e}</pre><p style="padding:0 20px;font-family:sans-serif;font-size:12px;color:#666">Copia e salva come .csv (separatore punto e virgola)</p>`);w.document.title="Template CSV";}
}

// ─── REPORT ───────────────────────────────────────────────────────────────────
function openReport(bonds,totale,stats,monthlyData) {
  const today=new Date().toLocaleDateString("it-IT");
  const totNom=bonds.reduce((s,b)=>s+calcNominale(b,totale),0);
  const totEff=bonds.reduce((s,b)=>s+calcEffettivo(b,totale),0);
  const totCed=bonds.reduce((s,b)=>s+calcCouponAnnuo(b,totale),0);
  const rows=bonds.map(b=>`<tr>
    <td style="font-size:9px;font-family:monospace;color:#555">${b.isin}</td>
    <td>${b.name}</td><td>${b.tipo}</td><td>${b.seniority||""}</td><td>${b.sector||""}</td>
    <td>${b.scadenza}</td><td>${b.callDate||"—"}</td>
    <td align="right">${fp(b.cedola)}</td><td align="right">${Number(b.ask).toFixed(3)}</td>
    <td align="right"><b style="color:#1a5276">${fp(b.yldYtm)}</b></td>
    <td align="right">${b.yldToCall?fp(b.yldToCall):"—"}</td>
    <td align="right">${fp(b.peso,4)}</td>
    <td align="right" style="color:#15803d"><b>${fe(calcNominale(b,totale))}</b></td>
    <td align="right" style="color:#1e40af">${fe(calcEffettivo(b,totale))}</td>
    <td align="right" style="color:#92400e">${fe(calcCouponAnnuo(b,totale))}</td>
  </tr>`).join("");
  const cedRow=monthlyData.map(m=>`<td align="right" style="${m.cedola>0?"background:#fffbeb;color:#92400e;font-weight:700":"color:#ccc"}">${m.cedola>0?fe(m.cedola):"—"}</td>`).join("");
  const html=`<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Report Portafoglio · ${today}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;font-size:11px;background:#fff;color:#111;padding:36px}
@media print{body{padding:12px}button{display:none}}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #f5c842;padding-bottom:14px;margin-bottom:20px}
h1{font-size:22px;font-weight:800;color:#1a1a1a}.sub{font-size:10px;color:#9ca3af;margin-top:3px}
.meta{font-size:10px;color:#6b7280;text-align:right;line-height:1.9}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:22px}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px}.kpi.y{background:#fffbeb;border-color:#fde68a}
.kpi .l{font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px;font-weight:700}
.kpi .v{font-size:17px;font-weight:800;color:#1a1a1a}.kpi.y .v{color:#92400e}
.sec{font-size:9px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.1em;border-bottom:2px solid #f3f4f6;padding-bottom:5px;margin:18px 0 10px}
table{width:100%;border-collapse:collapse;margin-bottom:18px}th{background:#1a1a1a;color:#fff;padding:6px 5px;font-size:8px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
td{padding:5px 5px;border-bottom:1px solid #f3f4f6;font-size:10px}tr:nth-child(even) td{background:#fafafa}
.tot td{font-weight:800;background:#fffbeb;border-top:2px solid #f5c842}
.foot{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between}
.pbtn{display:inline-block;margin-bottom:16px;background:#f5c842;color:#1a1a1a;border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer}
</style></head><body>
<button class="pbtn" onclick="window.print()">🖨 Stampa / Salva PDF</button>
<div class="hdr">
  <div><div style="font-size:9px;color:#9ca3af;letter-spacing:.15em;text-transform:uppercase;margin-bottom:4px">ANALISI PORTAFOGLIO</div>
  <h1>Portafoglio Obbligazionario</h1><div class="sub">Generato il ${today} · ${bonds.length} titoli</div></div>
  <div class="meta"><div>Importo effettivo: <b>${fe(totEff)}</b></div><div>Importo nominale: <b style="color:#15803d">${fe(totNom)}</b></div>
  <div>Disaggio/Premio: <b style="color:${totNom-totEff>=0?"#15803d":"#dc2626"}">${totNom-totEff>=0?"+":""}${fe(totNom-totEff)}</b></div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="l">YTM Ponderato</div><div class="v">${fp(stats.wtdYtm)}</div></div>
  <div class="kpi"><div class="l">Cedola Media</div><div class="v">${fp(stats.wtdCedola)}</div></div>
  <div class="kpi"><div class="l">Duration Media</div><div class="v">${Number(stats.wtdDuration).toFixed(2)} a</div></div>
  <div class="kpi y"><div class="l">Nominale Totale</div><div class="v">${fe(totNom)}</div></div>
  <div class="kpi y"><div class="l">Cedola Annua</div><div class="v">${fe(totCed)}</div></div>
</div>
<div class="sec">Dettaglio Titoli</div>
<table><thead><tr><th>ISIN</th><th>Nome</th><th>Tipo</th><th>Seniority</th><th>Settore</th><th>Scadenza</th><th>Call</th>
<th>Ced%</th><th>Ask</th><th>YTM%</th><th>YTC%</th><th>Peso%</th><th>Nominale €</th><th>Effettivo €</th><th>Ced.Ann €</th>
</tr></thead><tbody>${rows}</tbody>
<tfoot class="tot"><tr><td colspan="11">TOTALE</td>
<td align="right">${fp(bonds.reduce((s,b)=>s+b.peso,0),4)}</td>
<td align="right" style="color:#15803d">${fe(totNom)}</td>
<td align="right" style="color:#1e40af">${fe(totEff)}</td>
<td align="right" style="color:#92400e">${fe(totCed)}</td>
</tr></tfoot></table>
<div class="sec">Flusso Cedolare Mensile (sul nominale)</div>
<table><thead><tr><th>Periodo</th>${MONTHS.map(m=>`<th>${m}</th>`).join("")}<th>Totale</th></tr></thead>
<tbody><tr><td style="font-weight:700">${new Date().getFullYear()+1}</td>${cedRow}
<td align="right" style="font-weight:800;background:#fffbeb;color:#92400e">${fe(monthlyData.reduce((s,m)=>s+m.cedola,0))}</td>
</tr></tbody></table>
<div class="foot"><span>Report generato automaticamente · Dashboard Portafoglio Obbligazionario</span><span>Solo a fini informativi.</span></div>
</body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();}
  else alert("Popup bloccato dal browser. Consenti i popup per questo sito.");
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const EMPTY_BOND = {
  valuta:"EUR",issuer:"",isin:"",name:"",scadenza:"",callDate:"",
  cedola:0,ask:100,yldYtm:0,yldToCall:"",duration:0,taglioMin:1000,
  rating:"BBB",peso:5,tipo:"Governativo",seniority:"Senior Unsecured",
  tipoCedola:"Fixed",couponFreq:1,sector:"",ammEmesso:0,
};

export default function App() {
  const [bonds,setBonds]               = useState(INITIAL_BONDS);
  const [totale,setTotale]             = useState(100000);
  const [activeTab,setActiveTab]       = useState("overview");
  const [showAddForm,setShowAddForm]   = useState(false);
  const [addForm,setAddForm]           = useState(EMPTY_BOND);
  const [csvMsg,setCsvMsg]             = useState(null);
  const [tipoFilter,setTipoFilter]     = useState("Tutti");
  const [showMaturity,setShowMaturity] = useState(true);
  const [showCall,setShowCall]         = useState(true);
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
    return {wtdYtm,wtdCedola,wtdDuration,totNominale,totEffettivo,totCoupon,disaggio:totNominale-totEffettivo};
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
  const ratingData   = useMemo(()=>{const r={};bonds.forEach(b=>{r[b.rating]=(r[b.rating]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const tipoData     = useMemo(()=>{const r={};bonds.forEach(b=>{r[b.tipo]=(r[b.tipo]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const seniData     = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.seniority||"Senior Unsecured";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const sectorData   = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.sector||"—";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v})).sort((a,b)=>b.peso-a.peso);},[bonds]);
  const currencyData = useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.valuta||"EUR";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);
  const couponTypeData=useMemo(()=>{const r={};bonds.forEach(b=>{const s=b.tipoCedola||"Fixed";r[s]=(r[s]||0)+b.peso;});return Object.entries(r).map(([k,v])=>({name:k,peso:v}));},[bonds]);

  const filtered = useMemo(()=>tipoFilter==="Tutti"?bonds:bonds.filter(b=>b.tipo===tipoFilter),[bonds,tipoFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const updateBond=(idx,field,raw)=>{
    const u=[...bonds];
    if(field==="nominale"){const n=parseFloat(raw)||0;u[idx]={...u[idx],peso:(n*(u[idx].ask/100))/totale*100};}
    else if(["cedola","ask","yldYtm","yldToCall","duration","taglioMin","peso","couponFreq","ammEmesso"].includes(field)) u[idx]={...u[idx],[field]:parseFloat(raw)||0};
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
    const r=new FileReader();
    r.onload=ev=>{
      const res=parseCSV(ev.target.result);
      if(res.error){setCsvMsg({ok:false,text:res.error});return;}
      setBonds(res.bonds);
      setCsvMsg({ok:true,text:`✓ Caricati ${res.bonds.length} titoli${res.errs?.length?` (${res.errs.length} righe ignorate)`:""}.`});
    };
    r.readAsText(f);e.target.value="";
  },[]);

  // ── Stili condivisi ────────────────────────────────────────────────────────
  const card={background:C.card,borderRadius:18,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${C.border}`};
  const TH  ={padding:"10px 11px",color:C.gray,textAlign:"left",fontWeight:700,fontSize:10,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:`2px solid ${C.border}`,background:C.lgray};
  const TD  ={padding:"9px 11px",borderBottom:`1px solid ${C.lgray}`,verticalAlign:"middle"};
  const TTIP={contentStyle:{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,fontSize:12,boxShadow:"0 4px 16px rgba(0,0,0,0.08)"}};
  const pct = (n) => `${Number(n).toFixed(1)}%`;

  const IField=({v,onChange,w=60,color=C.dark,type="number",align="right",mono=false})=>(
    <input type={type} value={v} step={type==="number"?"any":undefined} onChange={e=>onChange(e.target.value)}
      onFocus={e=>{e.target.style.borderBottomColor=C.yellow;e.target.style.background=C.yellowL;}}
      onBlur={e=>{e.target.style.borderBottomColor="transparent";e.target.style.background="transparent";}}
      style={{background:"transparent",border:"none",borderBottom:"1.5px solid transparent",color,fontSize:12,
        width:w,outline:"none",textAlign:align,padding:"2px 0",fontFamily:mono?"monospace":"inherit",transition:"all 0.15s"}}/>
  );
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

  // Mini donut helper
  const MiniPie=({data,colorMap,title})=>(
    <div style={{...card,padding:"18px 20px"}}>
      <SL>{title}</SL>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} dataKey="peso" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={34}
            label={({name,peso})=>`${name.length>10?name.substring(0,9)+"…":name} ${pct(peso)}`}
            labelLine={{stroke:C.border}} fontSize={9}>
            {data.map((e,i)=><Cell key={i} fill={colorMap[e.name]||`hsl(${i*47},65%,55%)`}/>)}
          </Pie>
          <Tooltip {...TTIP} formatter={v=>[`${Number(v).toFixed(2)}%`]}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",color:C.dark}}>

      {/* ── NAVBAR ──────────────────────────────────────────────────────────── */}
      <nav style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <div style={{maxWidth:1600,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:62}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{background:C.dark,borderRadius:10,padding:"6px 14px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{color:C.yellow,fontSize:15,fontWeight:900}}>⬡</span>
              <span style={{color:"#fff",fontWeight:800,fontSize:13,letterSpacing:"-.2px"}}>BondAnalyst</span>
            </div>
            <div style={{width:1,height:26,background:C.border}}/>
            <div style={{display:"flex",gap:2}}>
              {[["overview","Panoramica"],["bonds","Titoli"],["cedole","Cedole"],["scadenze","Scadenze"],["composizione","Composizione"]].map(([id,l])=>(
                <TabBtn key={id} id={id} label={l}/>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={onCSV}/>
            <Btn onClick={()=>fileRef.current.click()}>⬆ Carica CSV</Btn>
            <Btn onClick={downloadCSVTemplate}>⬇ Template</Btn>
            <Btn primary onClick={()=>openReport(bonds,totale,stats,monthlyData)}>📄 Apri Report</Btn>
          </div>
        </div>
      </nav>

      {csvMsg&&(
        <div style={{maxWidth:1600,margin:"12px auto 0",padding:"0 28px"}}>
          <div style={{background:csvMsg.ok?"#f0fdf4":"#fef2f2",border:`1px solid ${csvMsg.ok?"#86efac":"#fecaca"}`,borderRadius:10,padding:"10px 16px",color:csvMsg.ok?"#166534":"#991b1b",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>{csvMsg.text}</span>
            <button onClick={()=>setCsvMsg(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit"}}>×</button>
          </div>
        </div>
      )}

      <div style={{maxWidth:1600,margin:"0 auto",padding:"24px 28px"}}>

        {/* ═══════════════ PANORAMICA ══════════════════════════════════════ */}
        {activeTab==="overview"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
              <div>
                <p style={{fontSize:11,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Portafoglio</p>
                <h1 style={{fontSize:30,fontWeight:800,letterSpacing:"-.6px"}}>Dashboard Obbligazionario</h1>
                <p style={{color:C.gray,fontSize:13,marginTop:4}}>{bonds.length} titoli · duration ponderata {stats.wtdDuration.toFixed(2)} anni</p>
              </div>
              <div style={{...card,padding:"16px 22px",display:"flex",alignItems:"center",gap:16,minWidth:280}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:10,color:C.gray,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Importo Effettivo</p>
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    <span style={{color:C.gray,fontWeight:600}}>€</span>
                    <input value={totale} onChange={e=>setTotale(parseFloat(e.target.value)||100000)}
                      style={{background:"transparent",border:"none",borderBottom:`2px solid ${C.yellow}`,color:C.dark,fontSize:24,fontWeight:800,width:140,textAlign:"right",outline:"none"}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI importi */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:14}}>
              {[
                {icon:"💰",l:"Importo Effettivo",  v:fe(stats.totEffettivo),   s:"Totale pagato al mercato",          vc:C.dark, bg:C.card},
                {icon:"📋",l:"Importo Nominale",    v:fe(stats.totNominale),    s:"Valore facciale dei titoli",        vc:C.green,bg:C.greenL},
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

            {/* KPI metriche */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
              {[
                {l:"YTM Ponderato",  v:fp(stats.wtdYtm),              s:"Yield to Maturity",      y:true },
                {l:"Cedola Media",   v:fp(stats.wtdCedola),            s:"Tasso cedolare medio",   y:false},
                {l:"Duration Media", v:`${stats.wtdDuration.toFixed(2)} anni`, s:"Sensitività al tasso", y:false},
                {l:"Cedola Annua",   v:fe(stats.totCoupon),            s:"Cash flow sul nominale", y:true },
              ].map((k,i)=>(
                <div key={i} style={{...card,padding:"20px 24px",background:k.y?C.yellowL:C.card,border:`1px solid ${k.y?C.yellowB:C.border}`}}>
                  <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8,color:k.y?"#92400e":C.gray}}>{k.l}</p>
                  <p style={{fontSize:28,fontWeight:800,color:k.y?"#78350f":C.dark,letterSpacing:"-.5px",marginBottom:2}}>{k.v}</p>
                  <p style={{fontSize:11,color:k.y?"#a16207":C.gray}}>{k.s}</p>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16}}>
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
          </div>
        )}

        {/* ═══════════════ TITOLI ══════════════════════════════════════════ */}
        {activeTab==="bonds"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
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
                <span style={{fontSize:12,color:C.gray}}>Nom: <b style={{color:C.green}}>{fe(stats.totNominale)}</b> · Eff: <b style={{color:C.blue}}>{fe(stats.totEffettivo)}</b></span>
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
              <span style={{fontStyle:"italic",color:C.gray}}>Effettivo € e Ced.Ann.€ sono formule.</span>
            </div>

            <div style={{...card,padding:0,overflow:"hidden"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}>
                  <thead>
                    <tr>
                      {["CCY","Emittente","ISIN","Nome","Tipo","Seniority","Settore","Scad.","Call","Ced%","Ask","CY%","YTM%","YTC%","Dur","Freq","Rating","Peso%","Nom.€","Eff.€*","Ced.€*",""].map(h=>(
                        <th key={h} style={{...TH,
                          ...(h==="CY%"?{color:"#d97706"}:{}),
                          ...(h.endsWith("*")?{fontStyle:"italic",color:"#9ca3af"}:{}),
                        }}>{h.replace("*","")}</th>
                      ))}
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
                          <td style={{...TD,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11,color:C.gray}} title={b.issuer}>{b.issuer}</td>
                          {/* ISIN */}
                          <td style={{...TD,fontFamily:"monospace",fontSize:10,color:C.gray,whiteSpace:"nowrap"}}>{b.isin}</td>
                          {/* Nome */}
                          <td style={{...TD,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{b.name}</td>
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
                          <td style={{...TD,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10,color:C.gray}} title={b.sector}>
                            <IField type="text" v={b.sector||""} onChange={v=>updateBond(idx,"sector",v)} w={100} color={SECTOR_COLORS[b.sector]||C.gray} align="left"/>
                          </td>
                          {/* Scadenza */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField type="date" v={b.scadenza} onChange={v=>updateBond(idx,"scadenza",v)} w={110} align="left" mono/>
                          </td>
                          {/* Call */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField type="date" v={b.callDate||""} onChange={v=>updateBond(idx,"callDate",v)} w={110} color="#d97706" align="left" mono/>
                          </td>
                          {/* Cedola */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={b.cedola} onChange={v=>updateBond(idx,"cedola",v)} w={44}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* Ask */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField v={b.ask} onChange={v=>updateBond(idx,"ask",v)} w={54} color={b.ask>100?C.red:b.ask<100?C.green:C.dark}/>
                          </td>
                          {/* CY% */}
                          <td style={{...TD,textAlign:"right",whiteSpace:"nowrap"}}>
                            <b style={{color:cyd<-0.01?C.red:cyd>0.01?C.green:C.dark,fontSize:11}}>{cy.toFixed(3)}%</b>
                            <span style={{fontSize:9,marginLeft:2,color:cyd<-0.01?C.red:cyd>0.01?C.green:C.gray}}>{cyd<-0.01?"▼":cyd>0.01?"▲":"="}</span>
                          </td>
                          {/* YTM */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={b.yldYtm} onChange={v=>updateBond(idx,"yldYtm",v)} w={48} color={C.green}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* YTC */}
                          <td style={{...TD,textAlign:"right",fontSize:11,color:b.yldToCall?"#d97706":C.border}}>
                            {b.yldToCall?`${Number(b.yldToCall).toFixed(3)}%`:"—"}
                          </td>
                          {/* Duration */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField v={b.duration||""} onChange={v=>updateBond(idx,"duration",v)} w={40}/>
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
                            <IField type="text" v={b.rating} onChange={v=>updateBond(idx,"rating",v)} w={44} color={RATING_COLORS[b.rating]||C.blue} align="center"/>
                          </td>
                          {/* Peso */}
                          <td style={{...TD,padding:"5px 6px",whiteSpace:"nowrap"}}>
                            <IField v={parseFloat(b.peso.toFixed(4))} onChange={v=>updateBond(idx,"peso",v)} w={52}/><span style={{color:C.gray,fontSize:10}}>%</span>
                          </td>
                          {/* Nominale */}
                          <td style={{...TD,padding:"5px 6px"}}>
                            <IField v={parseFloat(calcNominale(b,totale).toFixed(2))} onChange={v=>updateBond(idx,"nominale",v)} w={78} color={C.green}/>
                          </td>
                          {/* Effettivo */}
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
                        <td colSpan={17} style={{padding:"10px 11px",color:"#78350f",fontWeight:800,fontSize:12}}>TOTALE</td>
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(12,1fr)",gap:8,marginBottom:18}}>
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
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,gap:12,flexWrap:"wrap"}}>
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
                <BarChart data={scadenzeData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.lgray} vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:C.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:C.gray,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`}/>
                  <Tooltip {...TTIP} formatter={(v,n)=>[v>0?`${Number(v).toFixed(4)}%`:"—",n==="pM"?"A Scadenza":"A Call"]}/>
                  {showMaturity&&<Bar dataKey="pM" name="pM" stackId="s" fill={C.blue} radius={[0,0,0,0]} maxBarSize={52}/>}
                  {showCall    &&<Bar dataKey="pC" name="pC" stackId="s" fill={C.yellow} radius={[6,6,0,0]} maxBarSize={52}/>}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{...card,padding:0,overflow:"hidden"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr>{["ISIN","Emittente","Tipo","Seniority","Scadenza","Call","Rating","Peso%","Nom.€","Eff.€","CY%","YTM%","YTC%"].map(h=>(
                      <th key={h} style={{...TH,...(h==="CY%"?{color:"#d97706"}:{})}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[...bonds].sort((a,b)=>new Date(a.scadenza)-new Date(b.scadenza)).map(b=>{
                      const cy=calcCurrentYield(b);
                      return(
                        <tr key={b.isin} onMouseEnter={e=>e.currentTarget.style.background=C.lgray}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <td style={{...TD,fontFamily:"monospace",fontSize:10,color:C.gray}}>{b.isin}</td>
                          <td style={{...TD,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:11,color:C.gray}}>{b.issuer}</td>
                          <td style={{...TD,padding:"7px 11px"}}><Pill bg={TIPO_BG[b.tipo]} color={TIPO_COLORS[b.tipo]} border={TIPO_COLORS[b.tipo]+"44"}>{b.tipo}</Pill></td>
                          <td style={{...TD,padding:"7px 11px"}}>
                            <Pill bg={SENIORITY_BG[b.seniority]||C.greenL} color={SENIORITY_COLORS[b.seniority]||C.green} border={(SENIORITY_COLORS[b.seniority]||C.green)+"44"}>
                              {(b.seniority||"Senior").replace("Unsecured","").replace("Secured","Sec.").trim()}
                            </Pill>
                          </td>
                          <td style={{...TD,fontFamily:"monospace",fontSize:11,fontWeight:600}}>{b.scadenza}</td>
                          <td style={{...TD,fontFamily:"monospace",fontSize:11,color:b.callDate?"#d97706":C.gray,fontWeight:b.callDate?700:400}}>{b.callDate||"—"}</td>
                          <td style={{...TD,padding:"7px 11px"}}><Pill bg={`${RATING_COLORS[b.rating]||C.blue}22`} color={RATING_COLORS[b.rating]||C.blue} border={`${RATING_COLORS[b.rating]||C.blue}44`}>{b.rating}</Pill></td>
                          <td style={{...TD,textAlign:"right",fontWeight:600}}>{b.peso.toFixed(4)}%</td>
                          <td style={{...TD,textAlign:"right",color:C.green,fontFamily:"monospace",fontWeight:600}}>{fe(calcNominale(b,totale))}</td>
                          <td style={{...TD,textAlign:"right",color:C.blue,fontFamily:"monospace",fontWeight:600}}>{fe(calcEffettivo(b,totale))}</td>
                          <td style={{...TD,textAlign:"right",fontWeight:700,color:cy<b.cedola?C.red:cy>b.cedola?C.green:C.dark}}>{cy.toFixed(3)}%</td>
                          <td style={{...TD,textAlign:"right",fontWeight:700,color:C.green}}>{b.yldYtm.toFixed(3)}%</td>
                          <td style={{...TD,textAlign:"right",color:b.yldToCall?"#d97706":C.border}}>{b.yldToCall?`${Number(b.yldToCall).toFixed(3)}%`:"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ COMPOSIZIONE ════════════════════════════════════ */}
        {activeTab==="composizione"&&(
          <div>
            <h2 style={{fontSize:22,fontWeight:800,marginBottom:20}}>Composizione Portafoglio</h2>

            {/* Riga 1: Rating + Tipo + Seniority */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
              <MiniPie data={ratingData}    colorMap={RATING_COLORS}    title="Per Rating"/>
              <MiniPie data={tipoData}      colorMap={TIPO_COLORS}      title="Per Tipologia"/>
              <MiniPie data={seniData}      colorMap={SENIORITY_COLORS} title="Per Seniority / Subordinazione"/>
            </div>

            {/* Riga 2: Settore + Valuta + Tipo Cedola */}
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:16,marginBottom:16}}>

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
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12}}>
                {[
                  ["YTM Ponderato",   fp(stats.wtdYtm),               C.green],
                  ["CY Media Pond.",  fp(bonds.reduce((s,b)=>s+calcCurrentYield(b)*b.peso/100,0)), "#d97706"],
                  ["Cedola Media",    fp(stats.wtdCedola),             C.dark],
                  ["Duration Pond.",  `${stats.wtdDuration.toFixed(2)} anni`, C.dark],
                  ["Nominale Totale", fe(stats.totNominale),           C.green],
                  ["Effettivo Totale",fe(stats.totEffettivo),          C.blue],
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
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
    </div>
  );
}
