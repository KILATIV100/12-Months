// TWA Checkout — 4 step flow with state

const TwaCheckout = ({ T, lang, cart, onComplete, onCancel, cardStyle='rounded' }) => {
  const [step, setStep] = React.useState(0);
  const [delivery, setDelivery] = React.useState('courier');
  const [addr, setAddr] = React.useState(T.addressPh);
  const [name, setName] = React.useState(T.namePh);
  const [phone, setPhone] = React.useState(T.phonePh);
  const [greeting, setGreeting] = React.useState(null);
  const [paying, setPaying] = React.useState(false);
  const radius = cardStyle==='rounded' ? 14 : cardStyle==='squared' ? 4 : 10;
  const total = cart?.total || 850;
  const deliveryFee = delivery==='courier' ? 80 : 0;
  const grand = total + deliveryFee;

  const steps = [T.confirm, T.delivery, T.recipient, T.payment];

  const next = () => {
    if (step < 3) setStep(step+1);
    else {
      setPaying(true);
      setTimeout(() => onComplete && onComplete({total:grand, addr, name, phone, delivery, greeting}), 1400);
    }
  };

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2', overflow:'hidden'}}>
      <div style={{padding:'14px 22px 8px', display:'flex', alignItems:'center', gap:10}}>
        <div onClick={()=>step===0 ? onCancel() : setStep(step-1)} style={{fontSize:20,color:'#1c3610',cursor:'pointer',lineHeight:1}}>‹</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>{T.step} {step+1} {T.of} 4</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:1}}>{steps[step]}</div>
        </div>
      </div>
      <div style={{display:'flex',gap:4,padding:'4px 22px 14px'}}>
        {steps.map((_,i)=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?'#1c3610':'rgba(45,80,22,0.1)',transition:'background 0.3s'}}/>))}
      </div>

      <div style={{flex:1, overflow:'auto', padding:'0 22px 14px'}}>
        {step===0 && (
          <div style={{animation:'fadeUp 0.25s ease both'}}>
            <div style={{padding:'14px',background:'#fff',border:'1px solid rgba(45,80,22,0.1)',borderRadius:radius,marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:60,height:60,borderRadius:10,background:'linear-gradient(135deg,#dda8ad,#f5dde0)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Bouquet palette={['#dda8ad','#f5dde0','#8aab6e']} composition={[{f:'peony-pink',n:5}]} size={56}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,color:'#1c3610',fontWeight:500}}>{lang==='ua'?'Ніжність':'Tenderness'}</div>
                  <div style={{fontSize:11,color:'#888',marginTop:2}}>{lang==='ua'?'Півонії 5шт, евкаліпт':'5 peonies, eucalyptus'}</div>
                </div>
                <div style={{fontSize:13,fontWeight:500,color:'#1c3610'}}>{total} {T.grn}</div>
              </div>
            </div>
            <div style={{padding:'12px 14px',background:'#fff',border:'1px dashed rgba(138,171,110,0.4)',borderRadius:radius,fontSize:11.5,color:'#666',cursor:'pointer'}}>
              + {lang==='ua'?'Додати ще':'Add more'}
            </div>
          </div>
        )}
        {step===1 && (
          <div style={{animation:'fadeUp 0.25s ease both'}}>
            <div style={{display:'flex',gap:8,marginBottom:14}}>
              {[{id:'pickup',label:T.pickup,sub:'0 грн'},{id:'courier',label:T.courier,sub:'80 грн · 60 хв'}].map(o=>(
                <div key={o.id} onClick={()=>setDelivery(o.id)} style={{flex:1,padding:14,background:delivery===o.id?'rgba(138,171,110,0.1)':'#fff',border:`1.5px solid ${delivery===o.id?'#8aab6e':'rgba(45,80,22,0.1)'}`,borderRadius:radius,cursor:'pointer'}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:'#1c3610'}}>{o.label}</div>
                  <div style={{fontSize:10,color:'#888',marginTop:2,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{o.sub}</div>
                </div>
              ))}
            </div>
            {delivery==='courier' && (
              <div>
                <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:6}}>{lang==='ua'?'Адреса':'Address'}</div>
                <input value={addr} onChange={e=>setAddr(e.target.value)} style={{width:'100%',padding:'11px 13px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',marginBottom:12}}/>
                <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:6}}>{lang==='ua'?'Час':'Time'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                  {['10:00','12:00','14:00','16:00','18:00','20:00'].map((t,i)=>(
                    <div key={t} style={{padding:8,textAlign:'center',fontSize:12,background:i===2?'#1c3610':'#fff',color:i===2?'#faf8f2':'#1c3610',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,cursor:'pointer',fontFamily:'"DM Mono",monospace'}}>{t}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {step===2 && (
          <div style={{animation:'fadeUp 0.25s ease both'}}>
            <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:6}}>{lang==='ua'?"Ім'я":'Name'}</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:'11px 13px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',marginBottom:12}}/>
            <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:6}}>{lang==='ua'?'Телефон':'Phone'}</div>
            <input value={phone} onChange={e=>setPhone(e.target.value)} style={{width:'100%',padding:'11px 13px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:13,fontFamily:'inherit',background:'#fff',marginBottom:14}}/>
            <div style={{padding:14,background:'linear-gradient(135deg,rgba(221,168,173,0.15),rgba(245,221,224,0.3))',border:'1px solid rgba(221,168,173,0.4)',borderRadius:radius}}>
              <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#7a3040',marginBottom:4}}>💌 QR-листівка</div>
              <div style={{fontSize:12.5,color:'#1c3610',marginBottom:8,fontWeight:500}}>{T.addGreeting}</div>
              <div style={{display:'flex',gap:6}}>
                {[{id:'video',l:lang==='ua'?'📹 Відео':'📹 Video'},{id:'text',l:lang==='ua'?'✏️ Текст':'✏️ Text'}].map(o=>(
                  <div key={o.id} onClick={()=>setGreeting(greeting===o.id?null:o.id)} style={{flex:1,padding:9,textAlign:'center',fontSize:11,fontWeight:500,background:greeting===o.id?'#1c3610':'#fff',color:greeting===o.id?'#faf8f2':'#1c3610',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,cursor:'pointer'}}>{o.l}</div>
                ))}
                <div onClick={()=>setGreeting(null)} style={{flex:1,padding:9,textAlign:'center',fontSize:11,background:'transparent',color:'#888',border:'1px solid rgba(45,80,22,0.1)',borderRadius:8,cursor:'pointer'}}>{T.skip}</div>
              </div>
            </div>
          </div>
        )}
        {step===3 && (
          <div style={{animation:'fadeUp 0.25s ease both'}}>
            <div style={{padding:14,background:'#fff',border:'1px solid rgba(45,80,22,0.1)',borderRadius:radius,marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',marginBottom:5}}><span>{lang==='ua'?'Букет':'Bouquet'}</span><span>{total} {T.grn}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',marginBottom:5}}><span>{T.delivery}</span><span>{deliveryFee} {T.grn}</span></div>
              <div style={{height:1,background:'rgba(45,80,22,0.1)',margin:'8px 0'}}></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontSize:13,fontWeight:600,color:'#1c3610'}}>{lang==='ua'?'Разом':'Total'}</span>
                <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,fontWeight:500,color:'#1c3610'}}>{grand} {T.grn}</span>
              </div>
            </div>
            <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:6}}>{lang==='ua'?'Спосіб оплати':'Payment'}</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[{id:'liqpay',l:'LiqPay',d:'Visa · 4441'},{id:'mono',l:'Monobank',d:'Apple Pay'}].map((p,i)=>(
                <div key={p.id} style={{padding:'12px 14px',background:i===0?'rgba(138,171,110,0.08)':'#fff',border:`1.5px solid ${i===0?'#8aab6e':'rgba(45,80,22,0.1)'}`,borderRadius:radius,display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:22,borderRadius:4,background:i===0?'#1c3610':'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:600}}>{i===0?'L':'mono'}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#1c3610'}}>{p.l}</div>
                    <div style={{fontSize:10,color:'#888',fontFamily:'"DM Mono",monospace'}}>{p.d}</div>
                  </div>
                  {i===0 && <div style={{width:16,height:16,borderRadius:'50%',background:'#8aab6e',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10}}>✓</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{padding:'10px 22px 14px', borderTop:'1px solid rgba(45,80,22,0.08)'}}>
        <div onClick={next} style={{padding:13,background:'#1c3610',color:'#faf8f2',borderRadius:radius,textAlign:'center',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',justifyContent:'center',alignItems:'center',gap:8}}>
          {paying ? <><span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(250,248,242,0.3)',borderTopColor:'#faf8f2',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}></span> {lang==='ua'?'Обробка...':'Processing...'}</> : (step===3 ? `${T.pay} ${grand} ${T.grn}` : T.next)}
        </div>
      </div>
    </div>
  );
};

window.TwaCheckout = TwaCheckout;
