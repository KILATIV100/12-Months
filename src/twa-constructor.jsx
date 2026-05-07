// TWA Constructor — pick base + flowers + greens, see live price + AI hint with debounce.

const TwaConstructor = ({ T, lang, onAddToCart, cardStyle='rounded' }) => {
  const [base, setBase] = React.useState(window.MOCK.BASES[0]);
  const [items, setItems] = React.useState([]); // [{flower, qty}]
  const [tab, setTab] = React.useState('flower');
  const [hint, setHint] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const radius = cardStyle==='rounded' ? 16 : cardStyle==='squared' ? 4 : 10;

  const total = base.price + items.reduce((s,i)=>s + i.flower.price * i.qty, 0);
  const flowerCount = items.filter(i=>i.flower.type==='flower').reduce((s,i)=>s+i.qty,0);
  const greenCount = items.filter(i=>i.flower.type==='green').reduce((s,i)=>s+i.qty,0);

  // AI hint with debounce
  const sigRef = React.useRef('');
  React.useEffect(() => {
    const sig = items.map(i=>`${i.flower.id}:${i.qty}`).join(',');
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    if (items.length === 0) { setHint(''); return; }
    setThinking(true);
    const t = setTimeout(() => {
      const hints = {
        ua: [
          flowerCount >= 7 ? "Пишний об'єм. Додайте 2 евкаліпта — це збалансує композицію." : null,
          greenCount === 0 && flowerCount >= 3 ? "Зелень підкреслить кольори. Спробуйте папороть." : null,
          flowerCount === 1 ? "Моноквітковий букет — стильно. Можна додати 5 одного типу." : null,
          flowerCount >= 5 && items.some(i=>i.flower.id==='peony-pink') ? "Півонії з евкаліптом — ніжна класика весни." : null,
          flowerCount >= 5 && items.some(i=>i.flower.id==='rose-coral') ? "Коралові троянди добре поєднуються з рускусом." : null,
          "Гарне поєднання. Можна додати стрічку для завершеності.",
        ],
        en: [
          flowerCount >= 7 ? "Lush volume. Add 2 eucalyptus stems to balance the silhouette." : null,
          greenCount === 0 && flowerCount >= 3 ? "Greens will frame the colors. Try fern." : null,
          flowerCount === 1 ? "Mono-flower bouquet — chic. Try 5 of one kind." : null,
          flowerCount >= 5 && items.some(i=>i.flower.id==='peony-pink') ? "Peonies and eucalyptus — soft spring classic." : null,
          flowerCount >= 5 && items.some(i=>i.flower.id==='rose-coral') ? "Coral roses pair beautifully with ruscus." : null,
          "Lovely combination. A ribbon would finish it nicely.",
        ],
      };
      const list = hints[lang].filter(Boolean);
      setHint(list[0] || '');
      setThinking(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [items, lang, flowerCount, greenCount]);

  const add = (flower) => {
    const ex = items.find(i=>i.flower.id===flower.id);
    if (ex) setItems(items.map(i=>i.flower.id===flower.id?{...i,qty:i.qty+1}:i));
    else setItems([...items, {flower, qty:1}]);
  };
  const remove = (id) => {
    const ex = items.find(i=>i.flower.id===id);
    if (!ex) return;
    if (ex.qty <= 1) setItems(items.filter(i=>i.flower.id!==id));
    else setItems(items.map(i=>i.flower.id===id?{...i,qty:i.qty-1}:i));
  };

  // Build composition for Bouquet illustration
  const composition = items.map(i=>({f:i.flower.id, n:i.qty}));
  const palette = items.length ? [items[0].flower.color, items[0].flower.accent || '#f5dde0', '#8aab6e'] : ['#f0ebe0','#e8e0d0','#8aab6e'];

  const tabs = [
    {id:'base', label:T.base, list:window.MOCK.BASES},
    {id:'flower', label:T.flowers, list:window.MOCK.FLOWERS},
    {id:'green', label:T.greens, list:window.MOCK.GREENS},
  ];
  const activeList = tabs.find(t=>t.id===tab).list;

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2', overflow:'hidden'}}>
      <div style={{padding:'14px 22px 8px'}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>Конструктор</div>
        <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:2}}>
          {T.yourBouquet}
        </div>
      </div>

      {/* Live preview */}
      <div style={{margin:'4px 22px 10px', height:200, background:'linear-gradient(160deg, #f5f0e8 0%, #ece5d4 100%)', borderRadius:radius, position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <PetalBackdrop palette={palette} opacity={0.4}/>
        {items.length === 0 ? (
          <div style={{position:'relative',zIndex:2,textAlign:'center',color:'#888',fontSize:12,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>
            <div style={{fontSize:36,marginBottom:6,opacity:0.3}}>＋</div>
            {T.empty}
          </div>
        ) : (
          <div style={{position:'relative',zIndex:2}}>
            <Bouquet palette={palette} composition={composition} size={180} base={base.id}/>
          </div>
        )}
        {/* Price chip */}
        <div style={{position:'absolute',top:10,right:10,zIndex:3,background:'#0e1a0a',color:'#faf8f2',padding:'5px 12px',borderRadius:100,display:'flex',alignItems:'baseline',gap:6}}>
          <span style={{fontFamily:'"DM Mono",monospace',fontSize:8,letterSpacing:'0.1em',color:'#8aab6e',textTransform:'uppercase'}}>{T.currentPrice}</span>
          <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,transition:'all 0.3s'}} key={total}>
            <span style={{display:'inline-block', animation:'fadeUp 0.3s ease'}}>{total}</span>
          </span>
          <span style={{fontSize:9,color:'#888'}}>{T.grn}</span>
        </div>
      </div>

      {/* Selected chips */}
      <div style={{padding:'0 22px 10px', display:'flex', gap:6, flexWrap:'wrap'}}>
        <div style={{padding:'4px 9px',background:'#1c3610',color:'#faf8f2',borderRadius:6,fontSize:11,display:'flex',alignItems:'center',gap:5}}>
          <Flower shape={base.shape} color={base.color} size={14}/>
          {base.name[lang]}
        </div>
        {items.map(i=>(
          <div key={i.flower.id} style={{padding:'4px 9px',background:'#fff',border:'1px solid rgba(45,80,22,0.12)',borderRadius:6,fontSize:11,color:'#1c3610',display:'flex',alignItems:'center',gap:6,cursor:'pointer'}} onClick={()=>remove(i.flower.id)}>
            <span style={{display:'inline-block',width:8,height:8,borderRadius:'50%',background:i.flower.color}}></span>
            {i.qty}× {i.flower.name[lang]}
            <span style={{color:'#888',marginLeft:2}}>✕</span>
          </div>
        ))}
      </div>

      {/* AI hint */}
      <div style={{margin:'0 22px 10px', minHeight:48, padding:'10px 12px', background:'rgba(45,80,22,0.06)', border:'1px solid rgba(45,80,22,0.12)', borderRadius:12, display:'flex', alignItems:'flex-start', gap:8}}>
        <div style={{fontSize:14, marginTop:1, animation: thinking ? 'spin 2s linear infinite' : 'none'}}>{thinking ? '◐' : '✦'}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:8,letterSpacing:'0.14em',textTransform:'uppercase',color:'#4a7c2f',marginBottom:2}}>
            {T.aiHint} · Claude
          </div>
          <div style={{fontSize:11.5,color:'#444',lineHeight:1.45}}>
            {thinking ? T.aiThinking : (hint || (lang==='ua'?'Додайте першу квітку — і я підкажу.':'Add your first flower — I\'ll suggest.'))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:6,padding:'0 22px 10px'}}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1, textAlign:'center', padding:'7px 0',
            fontSize:11, fontWeight:tab===t.id?600:400,
            color: tab===t.id ? '#faf8f2' : '#1c3610',
            background: tab===t.id ? '#1c3610' : '#fff',
            border:'1px solid rgba(45,80,22,0.13)',
            borderRadius:8, cursor:'pointer',
          }}>{t.label}</div>
        ))}
      </div>

      {/* Picker */}
      <div style={{flex:1, overflow:'auto', padding:'0 22px 10px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
        {activeList.map(item=>{
          const isSelected = tab==='base' ? base.id===item.id : items.some(i=>i.flower.id===item.id);
          const qty = items.find(i=>i.flower.id===item.id)?.qty || 0;
          return (
            <div key={item.id} onClick={()=> tab==='base' ? setBase(item) : add(item)} style={{
              background:'#fff', border:`1px solid ${isSelected?'#8aab6e':'rgba(45,80,22,0.13)'}`,
              borderRadius:10, padding:8, position:'relative', cursor:'pointer',
              boxShadow: isSelected ? '0 0 0 1px #8aab6e' : 'none',
              transition:'all 0.15s',
            }}>
              <div style={{height:50,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Flower shape={item.shape} color={item.color} accent={item.accent} size={48}/>
              </div>
              <div style={{fontSize:9,color:'#1c3610',textAlign:'center',marginTop:2,lineHeight:1.2,height:20,overflow:'hidden'}}>
                {item.name[lang]}
              </div>
              <div style={{fontSize:9,color:'#888',textAlign:'center',fontFamily:'"DM Mono",monospace'}}>
                {item.price} {T.grn}
              </div>
              {qty>0 && <div style={{position:'absolute',top:4,right:4,background:'#1c3610',color:'#fff',width:18,height:18,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600}}>{qty}</div>}
            </div>
          );
        })}
      </div>

      {/* Add to cart */}
      <div style={{padding:'10px 22px 14px', background:'#faf8f2', borderTop:'1px solid rgba(45,80,22,0.08)'}}>
        <div onClick={()=>items.length && onAddToCart && onAddToCart({type:'custom', items, base, total})} style={{
          padding:'12px', borderRadius:radius,
          background: items.length ? '#1c3610' : 'rgba(45,80,22,0.2)',
          color:'#faf8f2', textAlign:'center', fontSize:13, fontWeight:500,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          cursor: items.length ? 'pointer' : 'default',
        }}>
          <span>{T.addToCart}</span>
          <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500}}>{total} {T.grn}</span>
        </div>
      </div>
    </div>
  );
};

window.TwaConstructor = TwaConstructor;
