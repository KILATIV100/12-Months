// Admin Panel — full desktop interface for florists.
// Sections: Dashboard, Orders (kanban + table), Catalog editor, Clients, Reports, Settings.
// Designed to be intuitive for non-technical users (clear icons, big targets, plain language).

const adminStyles = {
  root: {
    display:'flex', width:'100%', height:'100%',
    background:'#f5f1e8', fontFamily:'Jost, sans-serif',
    color:'#1a1a1a',
  },
  // Sidebar
  side: {
    width:240, flexShrink:0,
    background:'#0e1a0a', color:'#faf8f2',
    display:'flex', flexDirection:'column',
    padding:'18px 14px',
  },
  sideLogo: {
    fontFamily:'"Cormorant Garamond",serif',
    fontSize:24, fontStyle:'italic', fontWeight:500,
    padding:'4px 10px 18px',
    borderBottom:'1px solid rgba(255,255,255,0.06)',
    marginBottom:14,
    display:'flex', alignItems:'center', gap:10,
  },
  sideItem: (active) => ({
    display:'flex', alignItems:'center', gap:12,
    padding:'11px 12px', borderRadius:10,
    fontSize:13, fontWeight:500,
    color: active ? '#0e1a0a' : 'rgba(250,248,242,0.75)',
    background: active ? '#faf8f2' : 'transparent',
    cursor:'pointer', marginBottom:3,
    transition:'background 0.15s, color 0.15s',
  }),
  sideBadge: (active) => ({
    marginLeft:'auto',
    padding:'1px 7px', borderRadius:100,
    fontSize:10, fontWeight:600,
    background: active ? '#0e1a0a' : 'rgba(138,171,110,0.25)',
    color: active ? '#faf8f2' : '#a9d086',
    fontFamily:'"DM Mono",monospace',
  }),
  sideUser: {
    marginTop:'auto',
    padding:'10px 12px', borderRadius:10,
    background:'rgba(255,255,255,0.05)',
    display:'flex', alignItems:'center', gap:10,
    fontSize:12,
  },
  // Main
  main: {
    flex:1, display:'flex', flexDirection:'column',
    overflow:'hidden',
  },
  topbar: {
    height:60, flexShrink:0,
    padding:'0 26px',
    display:'flex', alignItems:'center', gap:18,
    background:'#faf8f2',
    borderBottom:'1px solid rgba(14,26,10,0.07)',
  },
  search: {
    flex:'0 1 360px',
    background:'#f0ebe0', border:'1px solid rgba(14,26,10,0.06)',
    borderRadius:10, padding:'9px 14px',
    display:'flex', alignItems:'center', gap:10,
    fontSize:13, color:'#999',
  },
  topAction: {
    padding:'9px 14px', borderRadius:10, fontSize:12, fontWeight:500,
    cursor:'pointer', display:'flex', alignItems:'center', gap:7,
    background:'#fff', border:'1px solid rgba(14,26,10,0.1)',
    color:'#1c3610',
  },
  topPrimary: {
    padding:'10px 16px', borderRadius:10, fontSize:12.5, fontWeight:600,
    cursor:'pointer', display:'flex', alignItems:'center', gap:7,
    background:'#1c3610', color:'#faf8f2', border:'none',
  },
  // Content
  content: { flex:1, overflow:'auto', padding:'24px 26px' },
  pageTitle: {
    fontFamily:'"Cormorant Garamond",serif', fontSize:32, fontWeight:400,
    color:'#0e1a0a', lineHeight:1.05, marginBottom:4,
  },
  pageSub: { fontSize:13, color:'#666', marginBottom:22 },
  // Cards
  card: {
    background:'#fff', borderRadius:14, padding:18,
    border:'1px solid rgba(14,26,10,0.06)',
  },
  cardTitle: {
    fontFamily:'"DM Mono",monospace', fontSize:10,
    letterSpacing:'0.16em', textTransform:'uppercase',
    color:'#8aab6e', marginBottom:8,
  },
  // KPI
  kpiGrid: {
    display:'grid', gridTemplateColumns:'repeat(4,1fr)',
    gap:12, marginBottom:18,
  },
  kpi: {
    background:'#fff', border:'1px solid rgba(14,26,10,0.06)',
    borderRadius:14, padding:'16px 18px',
    position:'relative', overflow:'hidden',
  },
  kpiLabel: {
    fontFamily:'"DM Mono",monospace', fontSize:9,
    letterSpacing:'0.16em', textTransform:'uppercase', color:'#8aab6e',
    marginBottom:6,
  },
  kpiValue: {
    fontFamily:'"Cormorant Garamond",serif', fontSize:34,
    fontWeight:500, lineHeight:1, color:'#0e1a0a',
  },
  kpiDelta: { fontSize:11, color:'#4a7c2f', marginTop:5, fontWeight:500 },
  kpiDeltaNeg: { color:'#c14b50' },
  // Chart
  chartWrap: {
    display:'grid', gridTemplateColumns:'2fr 1fr',
    gap:12, marginBottom:18,
  },
  // Table
  table: { width:'100%', borderCollapse:'collapse', fontSize:12.5 },
  th: {
    textAlign:'left', padding:'10px 12px',
    fontFamily:'"DM Mono",monospace', fontSize:9,
    letterSpacing:'0.14em', textTransform:'uppercase', color:'#888',
    borderBottom:'1px solid rgba(14,26,10,0.08)',
    fontWeight:500,
  },
  td: { padding:'12px 12px', borderBottom:'1px solid rgba(14,26,10,0.05)', verticalAlign:'middle' },
  // Status pill
  statusPill: (color, bg) => ({
    display:'inline-flex', alignItems:'center', gap:5,
    padding:'3px 9px', borderRadius:100,
    fontSize:10.5, fontWeight:600,
    background:bg, color, fontFamily:'"DM Mono",monospace',
    letterSpacing:'0.04em',
  }),
};

const STATUS_META = {
  ua: {
    new:     { label:'Нова',     color:'#9d6500', bg:'rgba(232,196,84,0.18)', dot:'#e8c454' },
    work:    { label:'В роботі', color:'#4a7c2f', bg:'rgba(138,171,110,0.18)', dot:'#8aab6e' },
    ready:   { label:'Готова',   color:'#1c3610', bg:'rgba(28,54,16,0.12)',    dot:'#1c3610' },
    delivery:{ label:'Доставка', color:'#2e5a8c', bg:'rgba(106,176,232,0.18)', dot:'#6ab0e8' },
    done:    { label:'Виконано', color:'#666',    bg:'rgba(14,26,10,0.08)',    dot:'#888' },
    cancel:  { label:'Скасована',color:'#a13a3f', bg:'rgba(193,75,80,0.13)',   dot:'#c14b50' },
  },
  en: {
    new:     { label:'New',      color:'#9d6500', bg:'rgba(232,196,84,0.18)', dot:'#e8c454' },
    work:    { label:'In work',  color:'#4a7c2f', bg:'rgba(138,171,110,0.18)', dot:'#8aab6e' },
    ready:   { label:'Ready',    color:'#1c3610', bg:'rgba(28,54,16,0.12)',    dot:'#1c3610' },
    delivery:{ label:'On the way',color:'#2e5a8c',bg:'rgba(106,176,232,0.18)', dot:'#6ab0e8' },
    done:    { label:'Done',     color:'#666',    bg:'rgba(14,26,10,0.08)',    dot:'#888' },
    cancel:  { label:'Cancelled',color:'#a13a3f', bg:'rgba(193,75,80,0.13)',   dot:'#c14b50' },
  },
};

const SOURCE_META = {
  tinder:    { label:'Tinder',    icon:'♥', color:'#dda8ad' },
  catalog:   { label:'Каталог',   icon:'❀', color:'#c8a84b' },
  construct: { label:'Конструктор', icon:'✦', color:'#8aab6e' },
  subs:      { label:'Підписка',  icon:'◷', color:'#a9c4e4' },
};

window.adminStyles = adminStyles;
window.STATUS_META = STATUS_META;
window.SOURCE_META = SOURCE_META;
