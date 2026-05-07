// Telegram chat — left side. Renders a chat container with bot/user/system messages.
// Supports inline keyboard buttons, "open app" sheet, status update animations.

const tgStyles = {
  shell: {
    width:380,
    height:780,
    borderRadius:54,
    background:'#0e1a0a',
    padding:14,
    boxShadow:'0 40px 100px rgba(14,26,10,0.35), 0 0 0 1px rgba(14,26,10,0.5), inset 0 0 0 2px rgba(255,255,255,0.04)',
    flexShrink:0,
    position:'relative',
  },
  screen: {
    position:'relative', width:'100%', height:'100%',
    borderRadius:42, overflow:'hidden',
    background:'#17212b',
    display:'flex', flexDirection:'column',
  },
  notch: {
    position:'absolute', top:22, left:'50%', transform:'translateX(-50%)',
    width:108, height:30, background:'#000', borderRadius:18, zIndex:50,
  },
  status: {
    height:38, paddingTop:12, paddingLeft:28, paddingRight:28,
    display:'flex', justifyContent:'space-between', alignItems:'center',
    fontFamily:'Jost, sans-serif', fontSize:14, fontWeight:600, color:'#fff',
  },
  header: {
    background:'#212d3b',
    padding:'10px 14px 12px',
    display:'flex', alignItems:'center', gap:12,
    borderBottom:'1px solid rgba(255,255,255,0.04)',
  },
  back: { color:'#6ab0e8', fontSize:22, lineHeight:1 },
  avatar: {
    width:38, height:38, borderRadius:'50%',
    background:'linear-gradient(135deg, #1c3610, #4a7c2f)',
    display:'flex', alignItems:'center', justifyContent:'center',
    color:'#faf8f2', fontFamily:'"Cormorant Garamond", serif',
    fontSize:18, fontWeight:600, fontStyle:'italic',
  },
  meta: { flex:1, color:'#fff' },
  name: { fontSize:14, fontWeight:600 },
  online: { fontSize:11, color:'#6ab0e8', display:'flex', alignItems:'center', gap:5 },
  body: {
    flex:1, overflow:'auto',
    padding:'16px 12px 12px',
    background:'#0e1620',
    backgroundImage:'radial-gradient(circle at 20% 30%, rgba(106,176,232,0.04), transparent 60%), radial-gradient(circle at 80% 70%, rgba(138,171,110,0.04), transparent 60%)',
    display:'flex', flexDirection:'column', gap:6,
  },
  msgBot: {
    alignSelf:'flex-start', maxWidth:'80%',
    background:'#212d3b', color:'#e9eef3',
    borderRadius:'14px 14px 14px 4px',
    padding:'9px 12px',
    fontSize:13.5, lineHeight:1.45,
    boxShadow:'0 1px 1px rgba(0,0,0,0.1)',
    animation:'slideIn 0.3s ease both',
  },
  msgUser: {
    alignSelf:'flex-end', maxWidth:'80%',
    background:'#2b5278', color:'#fff',
    borderRadius:'14px 14px 4px 14px',
    padding:'9px 12px',
    fontSize:13.5, lineHeight:1.45,
    animation:'slideIn 0.3s ease both',
  },
  date: {
    alignSelf:'center',
    background:'rgba(255,255,255,0.06)',
    color:'rgba(255,255,255,0.5)',
    fontFamily:'"DM Mono", monospace', fontSize:10,
    padding:'3px 10px', borderRadius:100,
    margin:'4px 0',
    letterSpacing:'0.05em',
  },
  kbRow: { display:'flex', gap:6, flexWrap:'wrap', marginTop:4 },
  kb: {
    background:'rgba(106,176,232,0.12)',
    color:'#6ab0e8',
    padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:500,
    border:'1px solid rgba(106,176,232,0.2)',
    cursor:'pointer',
    flex:'1 1 calc(50% - 3px)',
    minWidth:'fit-content',
    textAlign:'center',
    transition:'background 0.15s',
  },
  webApp: {
    background:'#2b5278', color:'#fff',
    padding:'10px 14px', borderRadius:10, fontSize:13, fontWeight:600,
    cursor:'pointer', textAlign:'center',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    width:'100%',
    boxShadow:'0 2px 6px rgba(43,82,120,0.4)',
    transition:'transform 0.1s',
  },
  card: {
    alignSelf:'flex-start', maxWidth:'85%',
    background:'#212d3b', color:'#e9eef3',
    borderRadius:'14px 14px 14px 4px',
    overflow:'hidden',
    boxShadow:'0 1px 1px rgba(0,0,0,0.1)',
    animation:'slideIn 0.3s ease both',
  },
  cardImg: {
    height:120, position:'relative', overflow:'hidden',
    background:'linear-gradient(135deg, #1c3610 0%, #2d5016 100%)',
    display:'flex', alignItems:'center', justifyContent:'center',
  },
  cardBody: { padding:'10px 12px' },
  cardTitle: { fontSize:13, fontWeight:600, marginBottom:3 },
  cardDesc: { fontSize:11.5, color:'rgba(255,255,255,0.6)', lineHeight:1.4 },
  composer: {
    background:'#17212b',
    padding:'8px 12px',
    display:'flex', alignItems:'center', gap:10,
    borderTop:'1px solid rgba(255,255,255,0.04)',
  },
  attach: { color:'rgba(255,255,255,0.4)', fontSize:22 },
  input: {
    flex:1, background:'#242f3d', border:'none', outline:'none',
    color:'#fff', fontSize:13, padding:'9px 14px', borderRadius:18,
    fontFamily:'inherit',
  },
  mic: { color:'#6ab0e8', fontSize:20 },
  typing: {
    display:'flex', gap:3, alignItems:'center',
    alignSelf:'flex-start',
    background:'#212d3b', borderRadius:'14px 14px 14px 4px',
    padding:'10px 14px',
  },
  typingDot: {
    width:6, height:6, borderRadius:'50%',
    background:'rgba(255,255,255,0.5)',
    animation:'pulse 1.2s ease-in-out infinite',
  },
};

const TgStatusBar = () => (
  <div style={tgStyles.status}>
    <div>9:41</div>
    <div style={{display:'flex', gap:5, alignItems:'center'}}>
      <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="0.5" fill="#fff"/><rect x="4" y="4" width="3" height="6" rx="0.5" fill="#fff"/><rect x="8" y="2" width="3" height="8" rx="0.5" fill="#fff"/><rect x="12" y="0" width="3" height="10" rx="0.5" fill="#fff"/></svg>
      <svg width="24" height="10" viewBox="0 0 24 10"><rect x="0.5" y="0.5" width="20" height="9" rx="2.5" fill="none" stroke="#fff" opacity="0.4"/><rect x="2" y="2" width="14" height="6" rx="1" fill="#fff"/></svg>
    </div>
  </div>
);

const TgHeader = ({ name, status, onMenu }) => (
  <div style={tgStyles.header}>
    <div style={tgStyles.back}>‹</div>
    <div style={tgStyles.avatar}>12</div>
    <div style={tgStyles.meta}>
      <div style={tgStyles.name}>{name}</div>
      <div style={tgStyles.online}><span style={{width:6,height:6,borderRadius:'50%',background:'#4eb04e'}}></span>{status}</div>
    </div>
    <div style={{color:'#6ab0e8',fontSize:18}}>⋮</div>
  </div>
);

const Typing = () => (
  <div style={tgStyles.typing}>
    <span style={tgStyles.typingDot}></span>
    <span style={{...tgStyles.typingDot, animationDelay:'0.15s'}}></span>
    <span style={{...tgStyles.typingDot, animationDelay:'0.3s'}}></span>
  </div>
);

// Bot message component with optional inline keyboard
const BotMsg = ({ children, kb, webApp, onKb, onApp }) => (
  <div style={{display:'flex',flexDirection:'column',gap:4,maxWidth:'85%'}}>
    <div style={tgStyles.msgBot}>{children}</div>
    {kb && <div style={tgStyles.kbRow}>
      {kb.map((b,i)=>(
        <div key={i} style={tgStyles.kb} onClick={()=>onKb && onKb(b,i)}>{b}</div>
      ))}
    </div>}
    {webApp && <div style={tgStyles.webApp} onClick={onApp}>
      <span>🌿</span><span>{webApp}</span>
    </div>}
  </div>
);

const UserMsg = ({ children }) => <div style={tgStyles.msgUser}>{children}</div>;
const DateLbl = ({ children }) => <div style={tgStyles.date}>{children}</div>;

// Order status card with progress
const StatusCard = ({ stage=0, items=[], total=0, T }) => {
  const stages = [T.statusNew, T.statusWork, T.statusReady, T.statusDelivery];
  return (
    <div style={tgStyles.card}>
      <div style={{...tgStyles.cardImg, background:'linear-gradient(135deg, #1c3610 0%, #2d5016 100%)'}}>
        <div style={{position:'absolute',inset:0,opacity:0.3}}>
          {window.PetalBackdrop && <PetalBackdrop palette={['#dda8ad','#8aab6e','#c8a84b']}/>}
        </div>
        <div style={{position:'relative',zIndex:2,color:'#faf8f2',fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontStyle:'italic',fontWeight:300}}>
          #2641
        </div>
      </div>
      <div style={tgStyles.cardBody}>
        <div style={tgStyles.cardTitle}>{items.map(i=>i.name).join(' + ')}</div>
        <div style={tgStyles.cardDesc}>{total} грн · {T.delivery}</div>
        <div style={{display:'flex',gap:4,marginTop:10}}>
          {stages.map((s,i) => (
            <div key={i} style={{
              flex:1, height:4, borderRadius:2,
              background: i<=stage ? '#8aab6e' : 'rgba(255,255,255,0.1)',
              transition:'background 0.5s',
            }}/>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontFamily:'"DM Mono",monospace',fontSize:9,color:'rgba(255,255,255,0.5)',letterSpacing:'0.05em',textTransform:'uppercase'}}>
          {stages.map((s,i)=>(<span key={i} style={{color: i<=stage ? '#8aab6e' : 'rgba(255,255,255,0.4)'}}>{s}</span>))}
        </div>
      </div>
    </div>
  );
};

window.TgStatusBar = TgStatusBar;
window.TgHeader = TgHeader;
window.Typing = Typing;
window.BotMsg = BotMsg;
window.UserMsg = UserMsg;
window.DateLbl = DateLbl;
window.StatusCard = StatusCard;
window.tgStyles = tgStyles;
