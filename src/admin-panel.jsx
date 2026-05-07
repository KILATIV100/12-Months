// Admin Panel main shell — sidebar nav + page router.

const AdminPanel = ({ lang, onClose }) => {
  const [page, setPage] = React.useState('dashboard');

  const nav = [
    { id:'dashboard', l:lang==='ua'?'Огляд':'Dashboard', i:'⌂', badge:null },
    { id:'orders', l:lang==='ua'?'Замовлення':'Orders', i:'❀', badge:'14' },
    { id:'catalog', l:lang==='ua'?'Каталог':'Catalog', i:'☰', badge:null },
    { id:'media', l:lang==='ua'?'Медіа':'Media', i:'▣', badge:null },
    { id:'clients', l:lang==='ua'?'Клієнти':'Clients', i:'♥', badge:null },
    { id:'reports', l:lang==='ua'?'Звіти':'Reports', i:'▦', badge:null },
    { id:'reviews', l:lang==='ua'?'Відгуки':'Reviews', i:'★', badge:'3' },
    { id:'settings', l:lang==='ua'?'Налаштування':'Settings', i:'⚙', badge:null },
  ];

  const Page = {
    dashboard: AdminDashboard,
    orders: AdminOrders,
    catalog: AdminCatalog,
    media: AdminMedia,
    clients: AdminClients,
    reports: AdminReports,
    reviews: AdminReviews,
    settings: AdminSettings,
  }[page];

  return (
    <div style={{...adminStyles.root, position:'relative'}}>
      <div style={adminStyles.side}>
        <div style={adminStyles.sideLogo}>
          <span style={{fontSize:20}}>🌿</span>
          <span>12 місяців</span>
        </div>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(250,248,242,0.4)',padding:'0 12px',marginBottom:6}}>{lang==='ua'?'Робота':'Work'}</div>
        {nav.slice(0,4).map(n=>(
          <div key={n.id} onClick={()=>setPage(n.id)} style={adminStyles.sideItem(page===n.id)}>
            <span style={{fontSize:14,width:18,textAlign:'center'}}>{n.i}</span>
            <span>{n.l}</span>
            {n.badge && <span style={adminStyles.sideBadge(page===n.id)}>{n.badge}</span>}
          </div>
        ))}
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(250,248,242,0.4)',padding:'14px 12px 6px'}}>{lang==='ua'?'Аналітика':'Analytics'}</div>
        {nav.slice(4,7).map(n=>(
          <div key={n.id} onClick={()=>setPage(n.id)} style={adminStyles.sideItem(page===n.id)}>
            <span style={{fontSize:14,width:18,textAlign:'center'}}>{n.i}</span>
            <span>{n.l}</span>
            {n.badge && <span style={adminStyles.sideBadge(page===n.id)}>{n.badge}</span>}
          </div>
        ))}
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(250,248,242,0.4)',padding:'14px 12px 6px'}}>{lang==='ua'?'Магазин':'Shop'}</div>
        {nav.slice(7).map(n=>(
          <div key={n.id} onClick={()=>setPage(n.id)} style={adminStyles.sideItem(page===n.id)}>
            <span style={{fontSize:14,width:18,textAlign:'center'}}>{n.i}</span>
            <span>{n.l}</span>
          </div>
        ))}
        <div style={adminStyles.sideUser}>
          <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#dda8ad,#8aab6e)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:600,fontSize:11}}>А</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:500,color:'#faf8f2'}}>Аня М.</div>
            <div style={{fontSize:10,color:'rgba(250,248,242,0.5)'}}>{lang==='ua'?'Власниця':'Owner'}</div>
          </div>
          <div style={{color:'rgba(250,248,242,0.5)',cursor:'pointer'}}>⚙</div>
        </div>
      </div>
      <div style={adminStyles.main}>
        <div style={adminStyles.topbar}>
          <div style={adminStyles.search}>
            <span>🔍</span>
            <span>{lang==='ua'?'Пошук замовлень, клієнтів, букетів...':'Search orders, clients, bouquets...'}</span>
            <span style={{marginLeft:'auto',fontFamily:'"DM Mono",monospace',fontSize:10,padding:'2px 6px',background:'#fff',border:'1px solid rgba(14,26,10,0.1)',borderRadius:5,color:'#888'}}>⌘K</span>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            <div style={{position:'relative',padding:'8px',cursor:'pointer'}}>
              <span style={{fontSize:18}}>🔔</span>
              <span style={{position:'absolute',top:6,right:6,width:8,height:8,borderRadius:'50%',background:'#c14b50',border:'2px solid #faf8f2'}}></span>
            </div>
            <div style={{...adminStyles.topAction,padding:'7px 11px'}}>📞 {lang==='ua'?'Підтримка':'Support'}</div>
          </div>
        </div>
        <div style={adminStyles.content}>
          <Page lang={lang}/>
        </div>
      </div>
    </div>
  );
};

window.AdminPanel = AdminPanel;
