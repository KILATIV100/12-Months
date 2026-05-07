// TWA App container — bottom nav + screens

const TwaApp = ({ T, lang, initialTab='tinder', tweaks, onPay }) => {
  const [tab, setTab] = React.useState(initialTab);
  const [cart, setCart] = React.useState(null);
  const [showCheckout, setShowCheckout] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const cardStyle = tweaks.cardStyle;
  const tabStyle = tweaks.tabStyle;

  React.useEffect(()=>{ setTab(initialTab); }, [initialTab]);

  const tabs = [
    {id:'tinder', label:T.twaTinder, icon:'♥'},
    {id:'catalog', label:T.twaCatalog, icon:'❀'},
    {id:'construct', label:T.twaConstruct, icon:'✦'},
    {id:'calendar', label:T.twaCalendar, icon:'◷'},
    {id:'cabinet', label:T.twaCabinet, icon:'◉'},
  ];

  const handlePay = (info) => {
    setShowCheckout(false);
    setDone(true);
    if (onPay) onPay(info);
    setTimeout(()=>{ setDone(false); setTab('cabinet'); }, 1400);
  };

  if (done) {
    return (
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', background:'linear-gradient(180deg, #1c3610, #0e1a0a)', color:'#faf8f2', position:'relative', overflow:'hidden'}}>
        <PetalBackdrop palette={['#dda8ad','#8aab6e','#c8a84b']} opacity={0.25}/>
        <div style={{position:'relative',zIndex:2,textAlign:'center',padding:'0 30px'}}>
          <div style={{width:60,height:60,borderRadius:'50%',background:'#8aab6e',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:28,marginBottom:16,animation:'fadeUp 0.4s ease both'}}>✓</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:30,fontWeight:300,fontStyle:'italic',lineHeight:1.05,marginBottom:8}}>
            {lang==='ua'?'Дякуємо!':'Thank you!'}
          </div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',lineHeight:1.5}}>
            {lang==='ua'?'Замовлення №2641 прийнято. Слідкуйте за статусом у боті.':'Order #2641 received. Watch the status in the chat.'}
          </div>
        </div>
      </div>
    );
  }

  if (showCheckout) return <TwaCheckout T={T} lang={lang} cart={cart} onComplete={handlePay} onCancel={()=>setShowCheckout(false)} cardStyle={cardStyle}/>;

  const screen = (() => {
    switch(tab){
      case 'tinder': return <TwaTinder T={T} lang={lang} cardStyle={cardStyle} onComplete={()=>setTab('catalog')}/>;
      case 'construct': return <TwaConstructor T={T} lang={lang} cardStyle={cardStyle} onAddToCart={(c)=>{setCart(c); setShowCheckout(true);}}/>;
      case 'calendar': return <TwaCalendar T={T} lang={lang} cardStyle={cardStyle}/>;
      case 'catalog': return <TwaCatalog T={T} lang={lang} cardStyle={cardStyle} onSelect={(c)=>{setCart({type:'ready',name:c.name,total:c.price}); setShowCheckout(true);}}/>;
      case 'cabinet': return <TwaCabinet T={T} lang={lang} cardStyle={cardStyle}/>;
    }
  })();

  // Tab bar styles
  const tabBarBase = {flexShrink:0, padding:'8px 12px 14px', borderTop:'1px solid rgba(45,80,22,0.08)', background:'#faf8f2', display:'flex'};
  const tabBarStyles = {
    'icons-labels': tabBarBase,
    'icons-only': {...tabBarBase, padding:'10px 12px 14px'},
    'floating': {...tabBarBase, background:'transparent', border:'none', padding:'4px 16px 12px'},
  };
  const renderTab = (t) => {
    const active = tab === t.id;
    if (tabStyle==='floating') {
      return (
        <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1, padding:'9px 4px', textAlign:'center', cursor:'pointer', position:'relative'}}>
          <div style={{fontSize:18,color:active?'#faf8f2':'#1c3610', display:'flex', justifyContent:'center', alignItems:'center', height:24}}>{t.icon}</div>
        </div>
      );
    }
    return (
      <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1, padding:'4px 2px', textAlign:'center', cursor:'pointer'}}>
        <div style={{fontSize:18,color:active?'#1c3610':'#aaa',transition:'color 0.15s', display:'flex', justifyContent:'center', alignItems:'center', height:22}}>{t.icon}</div>
        {tabStyle==='icons-labels' && <div style={{fontSize:9,color:active?'#1c3610':'#aaa',marginTop:2,fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:active?600:400}}>{t.label}</div>}
      </div>
    );
  };

  return (
    <>
      {screen}
      {tabStyle==='floating' ? (
        <div style={{padding:'4px 16px 14px', background:'#faf8f2', flexShrink:0}}>
          <div style={{display:'flex', background:'#1c3610', borderRadius:100, padding:4, position:'relative'}}>
            <div style={{position:'absolute', top:4, bottom:4, left: `calc(${tabs.findIndex(x=>x.id===tab)} * (100% / 5) + 4px)`, width: 'calc(100% / 5 - 8px)', background:'#faf8f2', borderRadius:100, transition:'left 0.25s cubic-bezier(0.4,0,0.2,1)'}}></div>
            {tabs.map(t=>{
              const active = tab===t.id;
              return (
                <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1, padding:'9px 4px', textAlign:'center', cursor:'pointer', position:'relative', zIndex:2}}>
                  <div style={{fontSize:16,color:active?'#1c3610':'rgba(250,248,242,0.6)', display:'flex', justifyContent:'center', alignItems:'center', height:18}}>{t.icon}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={tabBarStyles[tabStyle] || tabBarStyles['icons-labels']}>
          {tabs.map(renderTab)}
        </div>
      )}
    </>
  );
};

window.TwaApp = TwaApp;
