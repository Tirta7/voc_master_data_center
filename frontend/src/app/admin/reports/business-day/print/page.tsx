'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const fmt  = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const fmtK = (n: number) => n >= 1_000_000 ? `Rp ${(n/1_000_000).toFixed(1)}Jt` : n >= 1_000 ? `Rp ${(n/1_000).toFixed(0)}K` : fmt(n);
const fD   = (d: any)   => d ? new Date(d).toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : '—';
const fT   = (d: any)   => d ? new Date(d).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '—';

const C = {
  ink:'#0f172a', sub:'#334155', muted:'#64748b', faint:'#94a3b8', line:'#e2e8f0', lineB:'#cbd5e1',
  bg:'#f8fafc', bgAlt:'#f1f5f9', white:'#ffffff',
  navy:'#0f172a', navyM:'#1e293b',
  indigo:'#4338ca', indigoL:'#eef2ff', indigoB:'#c7d2fe',
  green:'#047857', greenL:'#d1fae5', greenB:'#6ee7b7',
  red:'#b91c1c', redL:'#fee2e2', redB:'#fca5a5',
  amber:'#b45309', amberL:'#fef3c7', amberB:'#fcd34d',
  violet:'#6d28d9', violetL:'#f5f3ff', violetB:'#c4b5fd',
  sky:'#0369a1', skyL:'#e0f2fe',
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{font-family:'Inter',system-ui,sans-serif;background:#e9edf2;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#0f172a}
  @media print{
    html,body{background:white!important}
    .no-print{display:none!important}
    .page-wrap{box-shadow:none!important;margin:0!important;border-radius:0!important;border:none!important}
    .pb{break-before:page}
    .keep{break-inside:avoid}
    @page{size:A4 portrait;margin:8mm 8mm}
  }
  @media screen{
    .no-print{display:flex!important}
    .page-wrap{width:210mm;margin:72px auto 32px;box-shadow:0 8px 40px rgba(0,0,0,.18);border-radius:8px;overflow:hidden;border:1px solid #cbd5e1}
  }
  table{border-collapse:collapse;width:100%}
  th,td{padding:0}
  .row-alt:nth-child(even){background:#f8fafc}
`;

function SectionTitle({ text, accent = C.navy }: { text: string; accent?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, marginTop:4 }}>
      <div style={{ width:3, height:14, background:accent, borderRadius:2, flexShrink:0 }} />
      <p style={{ fontSize:8, fontWeight:900, textTransform:'uppercase' as const, letterSpacing:'0.2em', color:accent }}>{text}</p>
      <div style={{ flex:1, height:1, background:C.line }} />
    </div>
  );
}

function KpiBox({ label, value, note, accent, light }: { label:string; value:string; note:string; accent:string; light:string }) {
  return (
    <div style={{ background:light, border:`1px solid ${accent}30`, borderRadius:10, padding:'14px 16px', borderTop:`3px solid ${accent}` }}>
      <p style={{ fontSize:7, fontWeight:800, textTransform:'uppercase' as const, letterSpacing:'0.15em', color:accent, marginBottom:8 }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:900, color:C.ink, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:8, color:C.muted, marginTop:5, fontWeight:500 }}>{note}</p>
    </div>
  );
}

function Tbl({ head, rows, foot, colAlign }: {
  head: string[];
  rows: React.ReactNode[][];
  foot?: React.ReactNode[];
  colAlign?: ('left'|'right'|'center')[];
}) {
  const al = (i:number): 'left'|'right'|'center' => colAlign?.[i] ?? 'left';
  return (
    <table style={{ fontSize:8, width:'100%', border:`1px solid ${C.line}` }}>
      <thead>
        <tr style={{ background:C.bgAlt }}>
          {head.map((h,i) => (
            <th key={h} style={{ padding:'7px 9px', fontSize:6.5, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', textAlign:al(i), borderBottom:`1.5px solid ${C.lineB}` }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri%2===0 ? C.white : C.bg, borderBottom:`1px solid ${C.line}` }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding:'6px 9px', textAlign:al(ci), verticalAlign:'top' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr style={{ background:C.navy }}>
            {foot.map((cell,ci) => (
              <td key={ci} style={{ padding:'8px 9px', textAlign:al(ci), color:'white', fontWeight:800, fontSize:8 }}>{cell}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

export default function BusinessDayPrintPage() {
  const [report, setReport]   = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) { setError(true); return; }
    Promise.all([
      axios.get(`${API_URL}/finance/shifts/report/${id}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } }),
      axios.get(`${API_URL}/reports/settings`),
    ]).then(([r,s]) => { setReport(r.data); setSettings(s.data); }).catch(() => setError(true));
  }, []);

  if (error) return <div style={{ padding:40, textAlign:'center', color:C.red, fontFamily:'Inter,sans-serif' }}>Gagal memuat laporan. Pastikan ID valid &amp; sudah login.</div>;
  if (!report || !settings) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:12, fontFamily:'Inter,sans-serif' }}>
      <div style={{ width:36, height:36, border:`3px solid ${C.line}`, borderTopColor:C.indigo, borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <p style={{ color:C.muted, fontSize:13 }}>Menyiapkan Laporan…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const bd = report.businessDay || {};
  const txs: any[] = report.transactions || [];
  const sum = report.summary || {};
  const shifts: any[] = report.shifts || [];
  const venue = settings.invoiceBusinessName || settings.businessName || 'Billiard Cafe';
  const addr  = settings.invoiceAddress || settings.address || '';
  const printAt = new Date();

  // ── Financial Aggregates ──
  const nonTopUp = txs.filter(t => t.type !== 'TOPUP');
  const grossBilliard  = nonTopUp.reduce((s,t) => s+Number(t.billiardTotal||0), 0);
  const grossCafe      = nonTopUp.reduce((s,t) => {
    let c = Number(t.cafeTotal||0);
    if (c===0 && t.orderItems?.length) t.orderItems.forEach((o:any)=>{ c+=Number(o.price||0)*Number(o.quantity||0); });
    return s+c;
  }, 0);
  const grossRevenue   = grossBilliard + grossCafe;
  const totalDiscount  = nonTopUp.reduce((s,t) => s+Number(t.discountAmount||0), 0);
  const totalSC        = nonTopUp.reduce((s,t) => s+Number(t.serviceChargeAmount||0), 0);
  const totalVAT       = nonTopUp.reduce((s,t) => s+Number(t.vatAmount||0), 0);
  const totalRounding  = nonTopUp.reduce((s,t) => s+Number(t.roundingAmount||0), 0);
  const totalTopUp     = txs.filter(t=>t.type==='TOPUP').reduce((s,t)=>s+Number(t.grandTotal||0),0);
  const totalGrand     = txs.reduce((s,t)=>s+Number(t.grandTotal||0),0);
  const netOmzet       = Number(sum.totalRevenue||bd.totalRevenue||0)||totalGrand;

  const methods: Record<string,number> = sum.paymentMethods||{};
  const paidCash = Object.entries(methods).filter(([m])=>!['MEMBER','MEMBERSHIP'].includes(m.toUpperCase())).reduce((s,[,v])=>s+v,0);
  const paidMember = (methods.MEMBER||0)+(methods.MEMBERSHIP||0);

  const paidCount = txs.filter(t=>t.status==='PAID').length;

  function payBadge(m:string) {
    const k=m.toUpperCase();
    const map:Record<string,[string,string]>={
      CASH:[C.green,C.greenL], TUNAI:[C.green,C.greenL], QRIS:[C.violet,C.violetL],
      MEMBER:[C.violet,C.violetL], MEMBERSHIP:[C.violet,C.violetL],
      TRANSFER:[C.sky,C.skyL], DEBIT:[C.indigo,C.indigoL],
    };
    const [color,bg]=map[k]||[C.sub,C.bg];
    return <span style={{ fontSize:6, fontWeight:800, textTransform:'uppercase' as const, color, background:bg, border:`1px solid ${color}40`, borderRadius:3, padding:'1px 5px', marginRight:3, whiteSpace:'nowrap' as const }}>{k==='MEMBER'?'MBRSHP':k}</span>;
  }

  return (
    <div style={{ fontFamily:'Inter,system-ui,sans-serif', color:C.ink }}>
      <style>{css}</style>

      {/* ── TOOLBAR ── */}
      <div className="no-print" style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999, background:'white', borderBottom:`1px solid ${C.line}`, padding:'10px 24px', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 8px rgba(0,0,0,.06)', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>window.close()} style={{ fontSize:12, fontWeight:700, color:C.sub, background:'none', border:`1px solid ${C.line}`, borderRadius:6, padding:'5px 12px', cursor:'pointer' }}>✕ Tutup</button>
          <span style={{ fontSize:13, fontWeight:800, color:C.ink }}>Business Day Report — {bd.date || fD(printAt)}</span>
          <span style={{ background:C.indigoL, color:C.indigo, fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>{txs.length} transaksi</span>
        </div>
        <button onClick={()=>window.print()} style={{ background:C.indigo, color:'white', border:'none', borderRadius:8, padding:'9px 24px', fontSize:13, fontWeight:800, cursor:'pointer' }}>🖨 Cetak / Simpan PDF</button>
      </div>

      {/* ══════════════════════════════════════
          PAGE 1 — RINGKASAN OPERASIONAL
      ══════════════════════════════════════ */}
      <div className="page-wrap" style={{ background:'white' }}>

        {/* Header */}
        <div style={{ background:C.navy, padding:'28px 36px 22px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background:`linear-gradient(180deg,${C.indigo},#818cf8)` }} />
          <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'40%', backgroundImage:'radial-gradient(circle at 80% 50%,rgba(99,102,241,.12) 0%,transparent 60%)' }} />
          <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:20 }}>
            <div>
              <p style={{ color:'rgba(255,255,255,.35)', fontSize:7, fontWeight:800, letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:6 }}>Laporan Operasional Harian</p>
              <h1 style={{ color:'white', fontSize:26, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1, marginBottom:3 }}>Business Day Report</h1>
              <p style={{ color:'rgba(148,163,184,.7)', fontSize:8, fontWeight:500, marginBottom:14 }}>{venue}{addr ? ` · ${addr}` : ''}</p>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' as const }}>
                <div style={{ background:'rgba(255,255,255,.07)', borderRadius:6, padding:'6px 12px' }}>
                  <p style={{ color:'rgba(255,255,255,.4)', fontSize:6, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Tanggal Operasional</p>
                  <p style={{ color:'white', fontSize:10, fontWeight:800 }}>{bd.date || fD(printAt)}</p>
                </div>
                <div style={{ background:'rgba(255,255,255,.07)', borderRadius:6, padding:'6px 12px' }}>
                  <p style={{ color:'rgba(255,255,255,.4)', fontSize:6, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Total Transaksi</p>
                  <p style={{ color:'white', fontSize:10, fontWeight:800 }}>{txs.length} transaksi • {paidCount} PAID</p>
                </div>
                <div style={{ background:'rgba(255,255,255,.07)', borderRadius:6, padding:'6px 12px' }}>
                  <p style={{ color:'rgba(255,255,255,.4)', fontSize:6, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em' }}>Dicetak</p>
                  <p style={{ color:'white', fontSize:10, fontWeight:800 }}>{fD(printAt)} {fT(printAt)}</p>
                </div>
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <p style={{ color:'rgba(255,255,255,.35)', fontSize:7, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:4 }}>Net Omzet (Kas Masuk)</p>
              <p style={{ color:'white', fontSize:28, fontWeight:900, letterSpacing:'-0.03em' }}>{fmt(netOmzet)}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <p style={{ color:'rgba(148,163,184,.6)', fontSize:8 }}>Points Issued: <span style={{color:C.amberB,fontWeight:800}}>{(sum.totalAwardedPoints || 0).toLocaleString()} <span style={{fontSize:6}}>Pts</span></span></p>
                <p style={{ color:'rgba(148,163,184,.6)', fontSize:8 }}>Redeemed: <span style={{color:C.redB,fontWeight:800}}>{(sum.totalPointsRedeemed || 0).toLocaleString()} <span style={{fontSize:6}}>Pts</span></span></p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'24px 36px 28px' }}>

          {/* KPI Row */}
          <div className="keep" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:22 }}>
            <KpiBox label="Gross Billiard" value={fmt(grossBilliard)} note={`${nonTopUp.filter(t=>Number(t.billiardTotal)>0).length} sesi`} accent={C.indigo} light={C.indigoL} />
            <KpiBox label="Gross Café / F&B" value={fmt(grossCafe)} note={`${nonTopUp.filter(t=>Number(t.cafeTotal)>0||t.orderItems?.length>0).length} transaksi`} accent={C.amber} light={C.amberL} />
            <KpiBox label="Top-up Member" value={fmt(totalTopUp)} note={`${txs.filter(t=>t.type==='TOPUP').length} top-up`} accent={C.green} light={C.greenL} />
            <KpiBox label="Total Transaksi" value={`${txs.length}`} note={`${paidCount} PAID · ${txs.length-paidCount} lainnya`} accent={C.violet} light={C.violetL} />
          </div>

          {/* ── FINANCIAL AUDIT WATERFALL ── */}
          <div className="keep" style={{ marginBottom:22, border:`1.5px solid ${C.lineB}`, borderRadius:10, overflow:'hidden' }}>
            <div style={{ background:C.navyM, padding:'9px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <p style={{ color:'white', fontSize:7.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.18em' }}>Rekap Keuangan — Gross → Net Omzet</p>
              <p style={{ color:'rgba(255,255,255,.4)', fontSize:7 }}>Audit Trail Pendapatan</p>
            </div>
            <div style={{ background:'white', padding:'16px 20px' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:9 }}>
                <tbody>
                  {[
                    { label:'(+) Gross Billiard', val:grossBilliard, color:C.ink, bold:false },
                    { label:'(+) Gross Café / F&B', val:grossCafe, color:C.ink, bold:false },
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${C.line}` }}>
                      <td style={{ padding:'7px 10px', color:C.sub, fontWeight:500 }}>{r.label}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:r.color }}>{fmt(r.val)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom:`2px solid ${C.lineB}`, background:C.bg }}>
                    <td style={{ padding:'8px 10px', fontWeight:800, color:C.ink }}>= GROSS REVENUE</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:900, color:C.ink, fontSize:11 }}>{fmt(grossRevenue)}</td>
                  </tr>
                  {[
                    { label:'(-) Diskon / Promo', val:-totalDiscount, color:totalDiscount>0?C.red:C.muted },
                    { label:'(+) Service Charge', val:totalSC, color:totalSC>0?C.sub:C.muted },
                    { label:'(+) PPN / Pajak', val:totalVAT, color:totalVAT>0?C.sub:C.muted },
                    { label:'(±) Pembulatan', val:totalRounding, color:C.muted },
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px solid ${C.line}` }}>
                      <td style={{ padding:'7px 10px 7px 20px', color:C.sub, fontWeight:500 }}>{r.label}</td>
                      <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:r.color }}>{r.val!==0 ? fmt(Math.abs(r.val)) : '—'}</td>
                    </tr>
                  ))}
                  <tr style={{ borderBottom:`2px solid ${C.lineB}`, background:C.bg }}>
                    <td style={{ padding:'8px 10px', fontWeight:800, color:C.ink }}>= NET PENJUALAN (Excl. Top-up)</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:900, color:C.ink, fontSize:11 }}>{fmt(grossRevenue - totalDiscount + totalSC + totalVAT + totalRounding)}</td>
                  </tr>
                  <tr style={{ borderBottom:`1px solid ${C.line}` }}>
                    <td style={{ padding:'7px 10px', color:C.sub, fontWeight:500 }}>(+) Top-up Membership</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:C.green }}>{fmt(totalTopUp)}</td>
                  </tr>
                  <tr style={{ background:C.navy }}>
                    <td style={{ padding:'10px 10px', fontWeight:900, color:'white', fontSize:10, letterSpacing:'0.05em' }}>= OMZET KOTOR TOTAL (Grand Total)</td>
                    <td style={{ padding:'10px 10px', textAlign:'right', fontWeight:900, color:'white', fontSize:14 }}>{fmt(totalGrand)}</td>
                  </tr>
                  <tr style={{ borderTop:`2px solid ${C.line}`, background:C.bg }}>
                    <td style={{ padding:'7px 10px', color:C.muted, fontWeight:600, fontSize:8 }}>Pembayaran Kas (Non-Member)</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:800, color:C.green, fontSize:8 }}>{fmt(paidCash)}</td>
                  </tr>
                  <tr style={{ background:C.bg }}>
                    <td style={{ padding:'7px 10px', color:C.muted, fontWeight:600, fontSize:8 }}>Pembayaran Member (Saldo)</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:800, color:C.violet, fontSize:8 }}>{fmt(paidMember)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Payment Method Breakdown */}
            <div style={{ background:C.bgAlt, padding:'10px 20px', borderTop:`1px solid ${C.line}`, display:'flex', flexWrap:'wrap' as const, gap:8, alignItems:'center' }}>
              <p style={{ fontSize:7, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'0.12em', marginRight:4 }}>Metode Bayar:</p>
              {Object.entries(methods).map(([m,v]) => (
                <div key={m} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  {payBadge(m)}
                  <span style={{ fontSize:8, fontWeight:700, color:C.ink }}>{fmt(Number(v))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── SHIFT SUMMARY TABLE ── */}
          <div className="keep" style={{ marginBottom:22 }}>
            <SectionTitle text={`Ringkasan Shift (${shifts.length} Shift)`} />
            <Tbl
              head={['#','Staff / Kasir', 'Peran', 'Buka', 'Tutup', 'Billiard', 'Café', 'Top-up', 'Selisih Cash', 'Status']}
              colAlign={['center','left','left','left','left','right','right','right','right','center']}
              rows={shifts.map((s:any,i:number) => [
                <span style={{ fontSize:8, fontWeight:800, color:C.muted }}>#{i+1}</span>,
                <span style={{ fontSize:9, fontWeight:800, color:C.ink }}>{s.userName||'—'}</span>,
                <span style={{ fontSize:7, color:C.muted, fontWeight:600 }}>{s.userRole||'STAFF'}</span>,
                <span style={{ fontSize:8, fontWeight:600, color:C.sub }}>{fT(s.startTime)}{s.latenessMinutes>0?<span style={{color:C.red}}> (+{s.latenessMinutes}m)</span>:null}</span>,
                <span style={{ fontSize:8, fontWeight:600, color:C.sub }}>{s.endTime?fT(s.endTime):<span style={{color:C.amber,fontWeight:800}}>AKTIF</span>}{s.overtimeMinutes>0?<span style={{color:C.green}}> (+{s.overtimeMinutes}m)</span>:null}</span>,
                <span style={{ fontSize:8, fontWeight:700, color:C.ink }}>{fmtK(Number(s.billiardRevenue||0))}</span>,
                <span style={{ fontSize:8, fontWeight:700, color:C.ink }}>{fmtK(Number(s.cafeRevenue||0))}</span>,
                <span style={{ fontSize:8, fontWeight:700, color:C.green }}>{fmtK(Number(s.topUpRevenue||0))}</span>,
                <span style={{ fontSize:9, fontWeight:900, color:Number(s.discrepancy)<0?C.red:Number(s.discrepancy)>0?C.sky:C.green }}>{Number(s.discrepancy)===0?'✓ Cocok':fmt(Number(s.discrepancy))}</span>,
                <span style={{ fontSize:7, fontWeight:800, textTransform:'uppercase' as const, color:s.endTime?C.green:C.amber }}>{s.endTime?'✓ Done':'● Open'}</span>,
              ])}
            />
          </div>

          {/* ══ PER-SHIFT DEEP DIVE ══ */}
          <SectionTitle text="Deep Dive Performa Per Shift" accent={C.indigo} />
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {shifts.map((s:any, idx:number) => (
              <div key={idx} className="keep" style={{ border:`1.5px solid ${C.lineB}`, borderRadius:10, overflow:'hidden' }}>
                {/* Shift header */}
                <div style={{ background:s.isWaiter?C.bgAlt:C.navyM, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ color:s.isWaiter?C.sub:'white', fontSize:12, fontWeight:900 }}>{s.userName}</p>
                    <p style={{ color:s.isWaiter?C.muted:'rgba(148,163,184,.7)', fontSize:7, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                      {s.shiftName} · {fT(s.startTime)} — {s.endTime?fT(s.endTime):'AKTIF'}
                      {s.latenessMinutes>0 ? <span style={{color:C.red}}> · Terlambat {s.latenessMinutes} mnt</span> : null}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ color:s.isWaiter?C.muted:'rgba(255,255,255,.45)', fontSize:7, fontWeight:700, textTransform:'uppercase' }}>Omzet Shift</p>
                    <p style={{ color:s.isWaiter?C.sub:'white', fontSize:15, fontWeight:900 }}>{fmt(Number(s.totalRevenue||0))}</p>
                    <p style={{ color:s.isWaiter?C.muted:'rgba(148,163,184,.6)', fontSize:7 }}>Billiard: {fmtK(s.billiardRevenue||0)} · Café: {fmtK(s.cafeRevenue||0)}</p>
                  </div>
                </div>

                {s.isWaiter && (
                  <div style={{ padding:'8px 16px', background:'#fffbeb', borderBottom:`1px solid ${C.amberB}` }}>
                    <p style={{ fontSize:8, color:C.amber, fontWeight:700 }}>⚠ Staff WAITER — Pendapatan Rp 0 (diakumulasi ke shift Kasir yang bertugas)</p>
                  </div>
                )}

                <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {/* Popular Packages */}
                  <div>
                    <p style={{ fontSize:7, fontWeight:800, color:C.indigo, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, borderLeft:`2px solid ${C.indigo}`, paddingLeft:6 }}>Popular Packages</p>
                    {(s.topPackages||[]).length>0?(
                      <table style={{ fontSize:8, borderCollapse:'collapse', width:'100%' }}>
                        <thead><tr style={{background:C.bg}}>
                          <th style={{padding:'4px 8px',textAlign:'left',fontWeight:700,color:C.muted,fontSize:6.5}}>Paket</th>
                          <th style={{padding:'4px 8px',textAlign:'center',fontWeight:700,color:C.muted,fontSize:6.5}}>Qty</th>
                          <th style={{padding:'4px 8px',textAlign:'right',fontWeight:700,color:C.muted,fontSize:6.5}}>Revenue</th>
                        </tr></thead>
                        <tbody>{s.topPackages.map((p:any,i:number)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.line}`}}>
                            <td style={{padding:'5px 8px',fontWeight:700,color:C.ink}}>{p.name}</td>
                            <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,color:C.indigo}}>{p.count}×</td>
                            <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700,color:C.ink}}>{fmtK(p.revenue||0)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    ):<p style={{fontSize:8,color:C.muted,fontStyle:'italic',padding:'4px 8px'}}>— tidak ada data —</p>}
                  </div>

                  {/* Table Performance */}
                  <div>
                    <p style={{ fontSize:7, fontWeight:800, color:C.violet, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, borderLeft:`2px solid ${C.violet}`, paddingLeft:6 }}>Performa Meja</p>
                    {(s.tablePerformance||[]).length>0?(
                      <table style={{ fontSize:8, borderCollapse:'collapse', width:'100%' }}>
                        <thead><tr style={{background:C.bg}}>
                          <th style={{padding:'4px 8px',textAlign:'left',fontWeight:700,color:C.muted,fontSize:6.5}}>Meja</th>
                          <th style={{padding:'4px 8px',textAlign:'center',fontWeight:700,color:C.muted,fontSize:6.5}}>Sesi</th>
                          <th style={{padding:'4px 8px',textAlign:'right',fontWeight:700,color:C.muted,fontSize:6.5}}>Omzet</th>
                        </tr></thead>
                        <tbody>{s.tablePerformance.map((tp:any,i:number)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.line}`}}>
                            <td style={{padding:'5px 8px',fontWeight:800,color:C.ink}}>{tp.name}</td>
                            <td style={{padding:'5px 8px',textAlign:'center',color:C.muted,fontWeight:600}}>{tp.sessions}</td>
                            <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700,color:C.ink}}>{fmtK(tp.revenue||0)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    ):<p style={{fontSize:8,color:C.muted,fontStyle:'italic',padding:'4px 8px'}}>— tidak ada data —</p>}
                  </div>

                  {/* Cafe Items */}
                  <div style={{gridColumn:'1 / -1'}}>
                    <p style={{ fontSize:7, fontWeight:800, color:C.amber, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, borderLeft:`2px solid ${C.amber}`, paddingLeft:6 }}>Item Café Terjual (+ Catatan)</p>
                    {(s.topItems||[]).length>0?(
                      <table style={{ fontSize:8, borderCollapse:'collapse', width:'100%' }}>
                        <thead><tr style={{background:C.bg}}>
                          <th style={{padding:'4px 8px',textAlign:'left',fontWeight:700,color:C.muted,fontSize:6.5}}>Item</th>
                          <th style={{padding:'4px 8px',textAlign:'center',fontWeight:700,color:C.muted,fontSize:6.5,width:'48px'}}>Qty</th>
                          <th style={{padding:'4px 8px',textAlign:'left',fontWeight:700,color:C.muted,fontSize:6.5}}>Catatan</th>
                        </tr></thead>
                        <tbody>{s.topItems.map((it:any,i:number)=>(
                          <tr key={i} style={{borderBottom:`1px solid ${C.line}`,background:i%2===0?'white':C.bg}}>
                            <td style={{padding:'5px 8px',fontWeight:700,color:C.ink}}>{it.name}</td>
                            <td style={{padding:'5px 8px',textAlign:'center',fontWeight:900,color:C.amber}}>{it.qty}×</td>
                            <td style={{padding:'5px 8px',fontSize:7,color:C.muted,fontStyle:'italic'}}>
                              {it.notes&&it.notes.length>0 ? Array.from(new Set(it.notes as string[])).join(' · ') : '—'}
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    ):<p style={{fontSize:8,color:C.muted,fontStyle:'italic',padding:'4px 8px'}}>— tidak ada item café —</p>}
                  </div>
                </div>

                {/* Waiter Performance */}
                {(s.waiterPerformance||[]).length>0&&(
                  <div style={{ borderTop:`1.5px solid ${C.lineB}`, padding:'12px 16px', background:C.bg }}>
                    <p style={{ fontSize:7, fontWeight:800, color:C.ink, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:10 }}>Account Activity — Penjualan Waiter/Staff dalam shift ini</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10 }}>
                      {s.waiterPerformance.map((wp:any,wi:number)=>(
                        <div key={wi} style={{ background:'white', border:`1px solid ${C.lineB}`, borderRadius:8, padding:10, borderTop:`2px solid ${C.amber}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, borderBottom:`1px solid ${C.line}`, paddingBottom:5 }}>
                            <span style={{ fontSize:9, fontWeight:900, color:C.ink }}>{wp.name}</span>
                            <span style={{ fontSize:9, fontWeight:900, color:C.navy }}>{fmt(wp.revenue||0)}</span>
                          </div>
                          <div style={{ fontSize:7.5, color:C.muted, marginBottom:6 }}>
                            Billiard: <b style={{color:C.indigo}}>{fmtK(wp.billiardRevenue||0)}</b> · Café: <b style={{color:C.amber}}>{fmtK(wp.cafeRevenue||0)}</b>
                          </div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                            <div>
                              <p style={{ fontSize:6, fontWeight:800, color:C.muted, textTransform:'uppercase', marginBottom:3 }}>Packages</p>
                              {Object.values(wp.packageCounts||{}).slice(0,3).map((p:any,pi:number)=>(
                                <div key={pi} style={{ display:'flex', justifyContent:'space-between', fontSize:7.5, marginBottom:1 }}>
                                  <span style={{color:C.sub,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{p.name}</span>
                                  <span style={{fontWeight:800,color:C.indigo,flexShrink:0}}>{p.count}×</span>
                                </div>
                              ))}
                              {Object.values(wp.packageCounts||{}).length===0&&<p style={{fontSize:7,color:C.muted}}>—</p>}
                            </div>
                            <div>
                              <p style={{ fontSize:6, fontWeight:800, color:C.muted, textTransform:'uppercase', marginBottom:3 }}>Items</p>
                              {Object.values(wp.itemCounts||{}).slice(0,3).map((it:any,ii:number)=>(
                                <div key={ii} style={{ display:'flex', justifyContent:'space-between', fontSize:7.5, marginBottom:1 }}>
                                  <span style={{color:C.sub,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'70%'}}>{it.name}</span>
                                  <span style={{fontWeight:800,color:C.amber,flexShrink:0}}>{it.qty}×</span>
                                </div>
                              ))}
                              {Object.values(wp.itemCounts||{}).length===0&&<p style={{fontSize:7,color:C.muted}}>—</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Opname per shift */}
                {(s.stockReports||[]).length>0&&(
                  <div style={{ borderTop:`1.5px solid ${C.redB}`, padding:'12px 16px', background:C.redL }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <p style={{ fontSize:7, fontWeight:800, color:C.red, textTransform:'uppercase', letterSpacing:'0.15em' }}>Audit Stock Opname — {s.userName}</p>
                      <p style={{ fontSize:8, fontWeight:800, color:C.red }}>
                        Total Loss: {fmt(s.stockReports.reduce((acc:number,r:any)=>acc+Number(r.lostValue||0),0))}
                      </p>
                    </div>
                    <table style={{ fontSize:8, borderCollapse:'collapse', width:'100%', background:'white', borderRadius:6, overflow:'hidden' }}>
                      <thead><tr style={{background:C.bgAlt}}>
                        {['Item','Sistem','Fisik','Selisih','Lost Value','Catatan'].map((h,i)=>(
                          <th key={h} style={{padding:'5px 8px',fontWeight:700,color:C.muted,fontSize:6.5,textAlign:i>=1&&i<=4?'center':'left',borderBottom:`1px solid ${C.line}`}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{s.stockReports.map((sr:any,i:number)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.line}`,background:Number(sr.discrepancy)<0?'#fff5f5':'white'}}>
                          <td style={{padding:'5px 8px',fontWeight:700,color:C.ink}}>{sr.itemName}</td>
                          <td style={{padding:'5px 8px',textAlign:'center',color:C.muted}}>{sr.systemStock} {sr.unit}</td>
                          <td style={{padding:'5px 8px',textAlign:'center',fontWeight:800,color:C.ink}}>{sr.physicalStock} {sr.unit}</td>
                          <td style={{padding:'5px 8px',textAlign:'center'}}>
                            <span style={{fontWeight:900,fontSize:9,color:Number(sr.discrepancy)<0?C.red:Number(sr.discrepancy)>0?C.green:C.muted}}>
                              {Number(sr.discrepancy)>0?`+${sr.discrepancy}`:sr.discrepancy||'0'}
                            </span>
                          </td>
                          <td style={{padding:'5px 8px',textAlign:'center'}}>
                            <span style={{fontWeight:800,color:Number(sr.lostValue)>0?C.red:C.muted}}>
                              {Number(sr.lostValue)>0?fmt(Number(sr.lostValue)):'—'}
                            </span>
                          </td>
                          <td style={{padding:'5px 8px',fontSize:7,color:C.muted,fontStyle:'italic'}}>{sr.note||'—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── LOYALTY REDEMPTION SUMMARY (NEW) ── */}
          {(sum.redemptionBreakdown || []).length > 0 && (
            <div className="keep" style={{ marginTop:24 }}>
              <SectionTitle text="Detail Penukaran Point Reward" accent={C.red} />
              <div style={{ border:`1.5px solid ${C.redB}`, borderRadius:10, overflow:'hidden' }}>
                <table style={{ fontSize:8, width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:C.redL }}>
                      <th style={{ padding:'8px 12px', textAlign:'left', fontWeight:800, color:C.red, textTransform:'uppercase', fontSize:6.5 }}>Reward Item</th>
                      <th style={{ padding:'8px 12px', textAlign:'center', fontWeight:800, color:C.red, textTransform:'uppercase', fontSize:6.5 }}>Qty</th>
                      <th style={{ padding:'8px 12px', textAlign:'right', fontWeight:800, color:C.red, textTransform:'uppercase', fontSize:6.5 }}>Burned Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sum.redemptionBreakdown || []).map((it:any, i:number) => (
                      <tr key={it.name} style={{ borderBottom:`1px solid ${C.line}`, background: i%2===0 ? 'white' : C.bg }}>
                        <td style={{ padding:'8px 12px', fontWeight:700, color:C.ink }}>{it.name.toUpperCase()}</td>
                        <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:800, color:C.ink }}>{it.count}×</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:900, color:C.red }}>{(it.points || 0).toLocaleString()} <span style={{fontSize:6, color:C.muted}}>Pts</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:C.navy }}>
                      <td colSpan={2} style={{ padding:'10px 12px', color:'white', fontWeight:800, textAlign:'right', fontSize:8.5 }}>TOTAL POIN TERTUKAR</td>
                      <td style={{ padding:'10px 12px', color:'white', fontWeight:900, textAlign:'right', fontSize:10 }}>{(sum.totalPointsRedeemed || 0).toLocaleString()} <span style={{fontSize:7}}>Pts</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Signature */}
          <div className="keep" style={{ marginTop:32, paddingTop:16, borderTop:`1px dashed ${C.lineB}`, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:48 }}>
            {['Kasir / Finance','Manager','Owner'].map(r=>(
              <div key={r} style={{ textAlign:'center' }}>
                <p style={{ fontSize:8, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:40 }}>{r}</p>
                <div style={{ width:'80%', height:1, background:C.lineB, margin:'0 auto 6px' }} />
                <p style={{ fontSize:7.5, color:C.muted }}>(Nama Terang &amp; Cap)</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PAGE 2 — RINCIAN TRANSAKSI
      ══════════════════════════════════════ */}
      <div className="page-wrap pb" style={{ background:'white' }}>
        <div style={{ background:C.navy, padding:'14px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ color:'white', fontSize:12, fontWeight:900 }}>Rincian Transaksi &amp; Invoice</p>
            <p style={{ color:'rgba(255,255,255,.35)', fontSize:8 }}>{venue} · {bd.date||fD(printAt)}</p>
          </div>
          <p style={{ color:'rgba(255,255,255,.3)', fontSize:8 }}>{txs.length} transaksi · Dicetak {fT(printAt)}</p>
        </div>
        <div style={{ padding:'16px 20px 36px' }}>
          <table style={{ fontSize:7.5, border:`1px solid ${C.line}`, borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.bgAlt }}>
                {['Invoice','Customer','Meja/Tipe','Staff','Waktu','Billiard','Café','Diskon','SC','PPN','Bulan','Grand Total','Bayar','Status'].map((h,i)=>(
                  <th key={h} style={{ padding:'7px 6px', fontSize:6, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', textAlign:i>=5?'right':'left', borderBottom:`1.5px solid ${C.lineB}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map((tx:any,i:number)=>{
                const paid = tx.status==='PAID';
                const bg = i%2===0?'white':C.bg;
                const tblName = tx.table?.tableName||tx.cafeTable?.tableName||'—';
                return (
                  <tr key={tx.id} style={{ background:bg, borderBottom:`1px solid ${C.line}` }}>
                    <td style={{ padding:'5px 6px', fontWeight:800, color:C.indigo, whiteSpace:'nowrap' }}>{tx.invoiceNumber||`#${tx.id}`}</td>
                    <td style={{ padding:'5px 6px', color:C.ink, fontWeight:600 }}>{tx.customerName||'TAMU'}</td>
                    <td style={{ padding:'5px 6px', color:C.sub }}>
                      <div style={{fontWeight:700}}>{tblName}</div>
                      <div style={{fontSize:6,color:C.muted}}>{tx.type}·{tx.sessionType||''}</div>
                    </td>
                    <td style={{ padding:'5px 6px', fontSize:7, color:C.muted }}>{tx.createdBy?.name||'—'}</td>
                    <td style={{ padding:'5px 6px', fontSize:7, color:C.muted, whiteSpace:'nowrap' }}>{fT(tx.createdAt)}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:C.ink }}>{Number(tx.billiardTotal)>0?fmtK(tx.billiardTotal):'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:C.ink }}>{Number(tx.cafeTotal)>0?fmtK(tx.cafeTotal):'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:Number(tx.discountAmount)>0?C.red:C.muted }}>{Number(tx.discountAmount)>0?`-${fmtK(tx.discountAmount)}`:'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:C.sub }}>{Number(tx.serviceChargeAmount)>0?fmtK(tx.serviceChargeAmount):'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:C.sub }}>{Number(tx.vatAmount)>0?fmtK(tx.vatAmount):'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', color:C.muted }}>{Number(tx.roundingAmount)!==0?fmt(tx.roundingAmount):'—'}</td>
                    <td style={{ padding:'5px 6px', textAlign:'right', fontWeight:900, color:C.navy, whiteSpace:'nowrap' }}>{fmt(tx.grandTotal)}</td>
                    <td style={{ padding:'5px 6px' }}>
                      <div style={{ display:'flex', flexWrap:'wrap' as const, gap:2 }}>
                        {(Array.isArray(tx.paymentDetails)?tx.paymentDetails:[]).map((p:any,pi:number)=>payBadge(p.method||'?'))}
                      </div>
                    </td>
                    <td style={{ padding:'5px 6px' }}>
                      <span style={{ fontSize:7, fontWeight:800, color:paid?C.green:C.amber, background:paid?C.greenL:C.amberL, padding:'1px 5px', borderRadius:3 }}>{tx.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:C.navy }}>
                <td colSpan={5} style={{ padding:'9px 8px', color:'white', fontWeight:900, fontSize:8.5, textAlign:'right' }}>GRAND TOTAL</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'white', fontWeight:800, fontSize:8 }}>{fmtK(grossBilliard)}</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'white', fontWeight:800, fontSize:8 }}>{fmtK(grossCafe)}</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'#fca5a5', fontWeight:800, fontSize:8 }}>{totalDiscount>0?`-${fmtK(totalDiscount)}`:'—'}</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'rgba(255,255,255,.7)', fontSize:8 }}>{totalSC>0?fmtK(totalSC):'—'}</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'rgba(255,255,255,.7)', fontSize:8 }}>{totalVAT>0?fmtK(totalVAT):'—'}</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'rgba(255,255,255,.5)', fontSize:8 }}>—</td>
                <td style={{ padding:'9px 6px', textAlign:'right', color:'white', fontWeight:900, fontSize:11, whiteSpace:'nowrap' }}>{fmt(totalGrand)}</td>
                <td colSpan={2} style={{ padding:'9px 6px', color:'rgba(255,255,255,.4)', fontSize:7 }}>{paidCount}/{txs.length} PAID</td>
              </tr>
            </tfoot>
          </table>

          {/* Financial summary footer */}
          <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { label:'Gross Revenue', val:fmt(grossRevenue), color:C.ink },
              { label:'Total Diskon', val:totalDiscount>0?`- ${fmt(totalDiscount)}`:'Rp 0', color:totalDiscount>0?C.red:C.muted },
              { label:'Service Charge', val:fmt(totalSC), color:C.sub },
              { label:'PPN / Pajak', val:fmt(totalVAT), color:C.sub },
              { label:'Pembulatan', val:fmt(totalRounding), color:C.muted },
              { label:'Grand Total', val:fmt(totalGrand), color:C.navy },
            ].map((row,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 12px', background:C.bg, borderRadius:6, border:`1px solid ${C.line}` }}>
                <span style={{ fontSize:8, color:C.muted, fontWeight:600 }}>{row.label}</span>
                <span style={{ fontSize:9, fontWeight:800, color:row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
