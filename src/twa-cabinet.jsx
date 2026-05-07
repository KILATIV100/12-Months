// TWA Cabinet — profile, history, subscription

const TwaCabinet = ({ T, lang, cardStyle='rounded' }) => {
  const radius = cardStyle==='rounded' ? 14 : cardStyle==='squared' ? 4 : 10;
  const history = window.MOCK.HISTORY;
  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2', overflow:'auto'}}>
      <div style={{padding:'14px 22px 8px'}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>Особистий кабінет</div>
        <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:2}}>{T.profile}</div>
      </div>

      {/* Profile card */}
      <div style={{margin:'8px 22px 14px', padding:'18px 16px', background:'linear-gradient(135deg, #1c3610, #2d5016)', borderRadius:radius, color:'#faf8f2', position:'relative', overflow:'hidden'}}>
        <PetalBackdrop palette={['#dda8ad','#8aab6e','#c8a84b']} opacity={0.18}/>
        <div style={{position:'relative',zIndex:2,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:48,height:48,borderRadius:'50%',background:'#faf8f2',color:'#1c3610',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontStyle:'italic',fontWeight:600}}>О</div>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>{T.namePh}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.55)',marginTop:1}}>3 {lang==='ua'?'замовлення':'orders'} · 12 {lang==='ua'?'місяців з нами':'months with us'}</div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div style={{margin:'0 22px 14px', padding:'14px 14px', background:'#fff', border:'1px solid rgba(45,80,22,0.13)', borderRadius:radius}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#8aab6e'}}>{T.subs}</div>
          <div style={{fontSize:9,padding:'2px 8px',borderRadius:100,background:'rgba(138,171,110,0.18)',color:'#4a7c2f',fontWeight:500,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>active</div>
        </div>
        <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,color:'#1c3610',fontWeight:500,lineHeight:1.1}}>{lang==='ua'?'Букет щотижня':'Weekly bouquet'}</div>
        <div style={{fontSize:11,color:'#666',marginTop:3,lineHeight:1.45}}>{lang==='ua'?'Наступна доставка — четвер, 8 травня':'Next delivery — Thursday, May 8'}</div>
        <div style={{marginTop:10,display:'flex',gap:6}}>
          <div style={{flex:1,padding:7,textAlign:'center',fontSize:11,border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,color:'#1c3610',cursor:'pointer'}}>{lang==='ua'?'Пауза':'Pause'}</div>
          <div style={{flex:1,padding:7,textAlign:'center',fontSize:11,border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,color:'#1c3610',cursor:'pointer'}}>{lang==='ua'?'Змінити':'Edit'}</div>
        </div>
      </div>

      {/* History */}
      <div style={{margin:'0 22px 14px'}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:8}}>{T.history}</div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {history.map(h=>(
            <div key={h.id} style={{padding:'10px 12px',background:'#fff',border:'1px solid rgba(45,80,22,0.1)',borderRadius:radius,display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:8,background:'linear-gradient(135deg,#dda8ad,#8aab6e)',flexShrink:0}}></div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5,fontWeight:500,color:'#1c3610'}}>{h.name[lang]}</div>
                <div style={{fontSize:10,color:'#888',marginTop:1,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{h.date} · ✓ delivered</div>
              </div>
              <div style={{fontSize:12,fontWeight:500,color:'#1c3610'}}>{h.price} {T.grn}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{padding:'0 22px 18px', display:'flex', flexDirection:'column', gap:6}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:4}}>{T.settings}</div>
        {[lang==='ua'?'Сповіщення':'Notifications', lang==='ua'?'Способи оплати':'Payment methods', lang==='ua'?'Адреси':'Addresses', lang==='ua'?'Підтримка':'Support'].map(s=>(
          <div key={s} style={{padding:'10px 12px',background:'#fff',border:'1px solid rgba(45,80,22,0.1)',borderRadius:10,fontSize:12,color:'#1c3610',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>{s}</span><span style={{color:'#888'}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
};

window.TwaCabinet = TwaCabinet;
