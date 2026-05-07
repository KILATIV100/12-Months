// Admin Catalog editor — manage bouquets, prices, availability.

const AdminCatalog = ({ lang }) => {
  const [items, setItems] = React.useState(window.MOCK.BOUQUETS.map(b=>({...b, stock:Math.floor(Math.random()*15)+2, active:true})));
  const [editing, setEditing] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const filtered = items.filter(b=>b.name[lang].toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={adminStyles.pageTitle}>{lang==='ua'?'Каталог':'Catalog'}</div>
          <div style={adminStyles.pageSub}>{lang==='ua'?'Букети, які бачать клієнти в Telegram. Натисніть, щоб редагувати.':'Bouquets your customers see in Telegram. Tap to edit.'}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={adminStyles.topAction}>📥 {lang==='ua'?'Імпорт':'Import'}</div>
          <div style={adminStyles.topPrimary} onClick={()=>setEditing({id:null,name:{ua:'',en:''},price:0,palette:['#dda8ad','#f5dde0','#8aab6e'],tags:[],composition:[],stock:0,active:true})}>＋ {lang==='ua'?'Новий букет':'New bouquet'}</div>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <div style={{flex:1,...adminStyles.search,background:'#fff',color:'#1c3610'}}>
          <span>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={lang==='ua'?'Пошук букета...':'Search bouquets...'} style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:13,fontFamily:'inherit'}}/>
        </div>
        <div style={adminStyles.topAction}>⚙ {lang==='ua'?'Фільтри':'Filters'}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12}}>
        {filtered.map(b=>(
          <div key={b.id} onClick={()=>setEditing(b)} style={{background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid rgba(14,26,10,0.06)',cursor:'pointer',transition:'transform 0.15s, box-shadow 0.15s',opacity:b.active?1:0.5}}
               onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 20px rgba(14,26,10,0.08)';}}
               onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
            <div style={{height:140,background:`linear-gradient(135deg,${b.palette[0]},${b.palette[1]})`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <Bouquet palette={b.palette} composition={b.composition} size={100}/>
              {b.stock<5 && <div style={{position:'absolute',top:8,left:8,padding:'3px 8px',background:'rgba(193,75,80,0.92)',color:'#fff',fontSize:9,fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase',borderRadius:100,fontWeight:600}}>!{lang==='ua'?'мало':'low'}</div>}
              <div style={{position:'absolute',top:8,right:8,padding:'3px 8px',background:'rgba(255,255,255,0.85)',color:'#1c3610',fontSize:10,fontFamily:'"DM Mono",monospace',borderRadius:100,fontWeight:600}}>×{b.stock}</div>
            </div>
            <div style={{padding:12}}>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#1c3610',marginBottom:2}}>{b.name[lang]}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <div style={{fontSize:11,color:'#888',fontFamily:'"DM Mono",monospace',letterSpacing:'0.04em'}}>{b.tags.slice(0,2).join(' · ')}</div>
                <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#0e1a0a'}}>{b.price} <span style={{fontSize:10,color:'#888'}}>грн</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{position:'absolute',inset:0,zIndex:50,background:'rgba(14,26,10,0.4)',display:'flex',justifyContent:'center',alignItems:'center',padding:30,animation:'fadeIn 0.18s ease'}} onClick={()=>setEditing(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:'min(640px,100%)',maxHeight:'100%',overflow:'auto',padding:'22px 26px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontFamily:'"DM Mono",monospace',fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'#8aab6e'}}>{editing.id?(lang==='ua'?'Редагувати букет':'Edit bouquet'):(lang==='ua'?'Новий букет':'New bouquet')}</div>
                <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:26,fontWeight:500,marginTop:2}}>{editing.name[lang]||(lang==='ua'?'Без назви':'Untitled')}</div>
              </div>
              <div onClick={()=>setEditing(null)} style={{width:30,height:30,borderRadius:8,background:'#f5f1e8',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>✕</div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'160px 1fr',gap:18}}>
              <div style={{height:160,borderRadius:12,background:`linear-gradient(135deg,${editing.palette[0]},${editing.palette[1]})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Bouquet palette={editing.palette} composition={editing.composition.length?editing.composition:[{f:'peony-pink',n:5}]} size={120}/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <Field label={lang==='ua'?'Назва (UA)':'Name (UA)'} value={editing.name.ua} onChange={v=>setEditing({...editing,name:{...editing.name,ua:v}})}/>
                <Field label={lang==='ua'?'Назва (EN)':'Name (EN)'} value={editing.name.en} onChange={v=>setEditing({...editing,name:{...editing.name,en:v}})}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Field label={lang==='ua'?'Ціна, грн':'Price, UAH'} value={editing.price} onChange={v=>setEditing({...editing,price:+v})} type="number"/>
                  <Field label={lang==='ua'?'Залишок':'Stock'} value={editing.stock} onChange={v=>setEditing({...editing,stock:+v})} type="number"/>
                </div>
              </div>
            </div>

            <div style={{marginTop:16}}>
              <div style={adminStyles.cardTitle}>{lang==='ua'?'Палітра':'Palette'}</div>
              <div style={{display:'flex',gap:6}}>
                {editing.palette.map((c,i)=>(
                  <div key={i} style={{width:36,height:36,borderRadius:8,background:c,border:'1px solid rgba(0,0,0,0.06)',cursor:'pointer'}}></div>
                ))}
                <div style={{width:36,height:36,borderRadius:8,background:'#f5f1e8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'#888',cursor:'pointer'}}>＋</div>
              </div>
            </div>

            <div style={{marginTop:14}}>
              <div style={adminStyles.cardTitle}>{lang==='ua'?'Склад':'Composition'}</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {(editing.composition.length?editing.composition:[{f:'peony-pink',n:5},{f:'eucalyptus',n:3}]).map((c,i)=>{
                  const fl = window.MOCK.FLOWERS.concat(window.MOCK.GREENS).find(x=>x.id===c.f);
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'#f5f1e8',borderRadius:8}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:fl?.color||'#dda8ad'}}></div>
                      <div style={{flex:1,fontSize:12.5,color:'#1c3610'}}>{fl?.name[lang]||c.f}</div>
                      <div style={{fontFamily:'"DM Mono",monospace',fontSize:12,color:'#666'}}>×{c.n}</div>
                      <div style={{fontSize:11,color:'#888'}}>{(fl?.price||0)*c.n} грн</div>
                      <div style={{color:'#aaa',cursor:'pointer'}}>✕</div>
                    </div>
                  );
                })}
                <div style={{padding:'8px 10px',background:'#fff',border:'1px dashed rgba(14,26,10,0.15)',borderRadius:8,fontSize:12,color:'#888',textAlign:'center',cursor:'pointer'}}>＋ {lang==='ua'?'Додати квітку':'Add flower'}</div>
              </div>
            </div>

            <div style={{marginTop:14,display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#f5f1e8',borderRadius:10}}>
              <div onClick={()=>setEditing({...editing,active:!editing.active})} style={{width:36,height:20,borderRadius:100,background:editing.active?'#8aab6e':'#ccc',position:'relative',cursor:'pointer',transition:'background 0.15s'}}>
                <div style={{position:'absolute',top:2,left:editing.active?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.15s'}}></div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5,color:'#1c3610',fontWeight:500}}>{lang==='ua'?'Активний у каталозі':'Active in catalog'}</div>
                <div style={{fontSize:11,color:'#888'}}>{lang==='ua'?'Клієнти бачать у Telegram':'Visible to customers in Telegram'}</div>
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginTop:18}}>
              <div onClick={()=>setEditing(null)} style={{flex:1,padding:'12px',textAlign:'center',background:'#f5f1e8',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer'}}>{lang==='ua'?'Скасувати':'Cancel'}</div>
              <div onClick={()=>{
                if (editing.id) setItems(items.map(i=>i.id===editing.id?editing:i));
                else setItems([{...editing,id:'b'+Date.now()},...items]);
                setEditing(null);
              }} style={{flex:2,padding:'12px',textAlign:'center',background:'#0e1a0a',color:'#faf8f2',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer'}}>{lang==='ua'?'Зберегти':'Save'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({label,value,onChange,type='text'}) => (
  <label style={{display:'block'}}>
    <div style={{fontSize:10.5,color:'#888',fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4}}>{label}</div>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%',padding:'9px 11px',border:'1px solid rgba(14,26,10,0.12)',borderRadius:8,fontSize:13,fontFamily:'inherit',color:'#1c3610',outline:'none',background:'#faf8f2'}}/>
  </label>
);

window.AdminCatalog = AdminCatalog;
