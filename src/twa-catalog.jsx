// TWA Catalog — grid of bouquets

const TwaCatalog = ({ T, lang, onSelect, cardStyle='rounded' }) => {
  const [filter, setFilter] = React.useState('all');
  const radius = cardStyle==='rounded' ? 14 : cardStyle==='squared' ? 4 : 10;
  const cards = window.MOCK.BOUQUETS;
  const filtered = filter==='all' ? cards : cards.filter(c=>c.tags.includes(filter));

  const filters = [{id:'all',label:lang==='ua'?'Всі':'All'},{id:'pastel',label:'pastel'},{id:'classic',label:'classic'},{id:'spring',label:'spring'},{id:'romantic',label:'romantic'}];

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2', overflow:'auto'}}>
      <div style={{padding:'14px 22px 8px'}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>Готові букети</div>
        <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:2}}>{T.twaCatalog}</div>
      </div>
      <div style={{display:'flex',gap:5,padding:'4px 22px 12px',overflow:'auto'}}>
        {filters.map(f=>(
          <div key={f.id} onClick={()=>setFilter(f.id)} style={{padding:'5px 11px',fontSize:11,borderRadius:100,background:filter===f.id?'#1c3610':'#fff',color:filter===f.id?'#faf8f2':'#1c3610',border:'1px solid rgba(45,80,22,0.13)',whiteSpace:'nowrap',cursor:'pointer',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{f.label}</div>
        ))}
      </div>
      <div style={{padding:'0 22px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        {filtered.map(c=>(
          <div key={c.id} onClick={()=>onSelect && onSelect(c)} style={{cursor:'pointer'}}>
            <div style={{aspectRatio:'1', background:`linear-gradient(160deg, ${c.palette[0]} 0%, ${c.palette[1]} 100%)`, borderRadius:radius, position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <PetalBackdrop palette={c.palette} opacity={0.4}/>
              <div style={{position:'relative',zIndex:2}}>
                <Bouquet palette={c.palette} composition={c.composition} size={130} base="kraft"/>
              </div>
            </div>
            <div style={{padding:'6px 2px 0'}}>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:16,color:'#1c3610',fontWeight:500,lineHeight:1.1}}>{c.name[lang]}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginTop:2}}>
                <div style={{fontSize:10,color:'#888',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{c.tags[0]}</div>
                <div style={{fontSize:13,fontWeight:500,color:'#1c3610'}}>{c.price} {T.grn}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.TwaCatalog = TwaCatalog;
