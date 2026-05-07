// Admin Orders — kanban board (default) + list mode toggle. Click order to open drawer.

const AdminOrders = ({ lang }) => {
  const [orders, setOrders] = React.useState(window.ADMIN.ORDERS);
  const [view, setView] = React.useState('kanban');
  const [selected, setSelected] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const SM = STATUS_META[lang];

  const cols = ['new','work','ready','delivery','done'];
  const filtered = filter==='all' ? orders : orders.filter(o=>o.source===filter);

  const move = (id, dir) => {
    setOrders(orders.map(o=>{
      if (o.id !== id) return o;
      const i = cols.indexOf(o.status);
      const ni = Math.max(0, Math.min(cols.length-1, i+dir));
      return {...o, status: cols[ni]};
    }));
  };

  const sourceFilters = [{id:'all',l:lang==='ua'?'Усі':'All'},{id:'tinder',l:'Tinder'},{id:'catalog',l:lang==='ua'?'Каталог':'Catalog'},{id:'construct',l:lang==='ua'?'Конструктор':'Builder'}];

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={adminStyles.pageTitle}>{lang==='ua'?'Замовлення':'Orders'}</div>
          <div style={adminStyles.pageSub}>{lang==='ua'?`Перетягуйте картки між колонками, щоб змінити статус. Клієнт автоматично отримає сповіщення в Telegram.`:'Drag cards between columns to change status. Customer gets a Telegram notification automatically.'}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{display:'flex',gap:4,background:'#fff',padding:4,borderRadius:10,border:'1px solid rgba(14,26,10,0.08)'}}>
            {[{id:'kanban',i:'▦'},{id:'list',i:'≡'}].map(v=>(
              <div key={v.id} onClick={()=>setView(v.id)} style={{padding:'6px 12px',fontSize:14,cursor:'pointer',borderRadius:7,background:view===v.id?'#0e1a0a':'transparent',color:view===v.id?'#faf8f2':'#1c3610'}}>{v.i}</div>
            ))}
          </div>
          <div style={adminStyles.topPrimary}>＋ {lang==='ua'?'Нове замовлення':'New order'}</div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {sourceFilters.map(f=>(
          <div key={f.id} onClick={()=>setFilter(f.id)} style={{padding:'6px 12px',borderRadius:100,fontSize:11.5,cursor:'pointer',background:filter===f.id?'#0e1a0a':'#fff',color:filter===f.id?'#faf8f2':'#1c3610',border:'1px solid rgba(14,26,10,0.08)',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{f.l}</div>
        ))}
        <div style={{marginLeft:'auto',fontSize:11,color:'#888'}}>{lang==='ua'?'Усього':'Total'}: <b style={{color:'#1c3610'}}>{filtered.length}</b></div>
      </div>

      {view === 'kanban' ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,minHeight:0}}>
          {cols.map(c=>{
            const m = SM[c];
            const items = filtered.filter(o=>o.status===c);
            return (
              <div key={c} style={{background:'rgba(14,26,10,0.03)',borderRadius:14,padding:10,minHeight:480}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,padding:'2px 4px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:m.dot}}></div>
                    <div style={{fontSize:11,fontWeight:600,color:'#1c3610',fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>{m.label}</div>
                  </div>
                  <div style={{fontSize:11,color:'#888',fontFamily:'"DM Mono",monospace'}}>{items.length}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {items.map(o=>{
                    const src = SOURCE_META[o.source];
                    return (
                      <div key={o.id} onClick={()=>setSelected(o)} style={{background:'#fff',borderRadius:10,padding:11,border:'1px solid rgba(14,26,10,0.06)',cursor:'pointer',transition:'transform 0.1s, box-shadow 0.1s',position:'relative'}}
                           onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(14,26,10,0.06)';}}
                           onMouseLeave={e=>{e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='';}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                          <span style={{fontFamily:'"DM Mono",monospace',fontSize:10,color:'#888',letterSpacing:'0.05em'}}>#{o.id}</span>
                          <span style={{fontSize:10,color:src.color}} title={src.label}>{src.icon}</span>
                        </div>
                        <div style={{fontSize:12,fontWeight:600,color:'#1c3610',marginBottom:3}}>{o.customer[lang]}</div>
                        <div style={{fontSize:11,color:'#666',marginBottom:6,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.items}</div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6,paddingTop:6,borderTop:'1px solid rgba(14,26,10,0.05)'}}>
                          <span style={{fontSize:10,color:'#888',fontFamily:'"DM Mono",monospace'}}>⏱ {o.time}</span>
                          <span style={{fontSize:12,fontWeight:600,color:'#1c3610'}}>{o.price} <span style={{fontSize:9,color:'#888'}}>грн</span></span>
                        </div>
                        {c !== 'done' && (
                          <div style={{position:'absolute',right:6,top:6,opacity:0,transition:'opacity 0.15s'}} className="card-arrows">
                            <div onClick={e=>{e.stopPropagation(); move(o.id,1);}} style={{width:20,height:20,borderRadius:6,background:'#0e1a0a',color:'#faf8f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,cursor:'pointer'}}>→</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!items.length && <div style={{fontSize:11,color:'#aaa',textAlign:'center',padding:'20px 0',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{...adminStyles.card,padding:0,overflow:'hidden'}}>
          <table style={adminStyles.table}>
            <thead><tr style={{background:'#faf8f2'}}>
              <th style={adminStyles.th}>#</th>
              <th style={adminStyles.th}>{lang==='ua'?'Клієнт':'Customer'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Букет':'Bouquet'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Адреса':'Address'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Час':'Time'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Статус':'Status'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Сума':'Total'}</th>
              <th style={adminStyles.th}></th>
            </tr></thead>
            <tbody>
              {filtered.map(o=>{
                const m = SM[o.status];
                const src = SOURCE_META[o.source];
                return (
                  <tr key={o.id} onClick={()=>setSelected(o)} style={{cursor:'pointer'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#faf8f2'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{...adminStyles.td,fontFamily:'"DM Mono",monospace',fontSize:11,color:'#888'}}>{o.id}</td>
                    <td style={adminStyles.td}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:12,color:src.color}}>{src.icon}</span>
                        <div>
                          <div style={{fontWeight:500,color:'#1c3610'}}>{o.customer[lang]}</div>
                          <div style={{fontSize:10.5,color:'#888',fontFamily:'"DM Mono",monospace'}}>{o.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={adminStyles.td}>{o.items}</td>
                    <td style={{...adminStyles.td,color:'#666'}}>{o.address}</td>
                    <td style={{...adminStyles.td,fontFamily:'"DM Mono",monospace',color:'#666'}}>{o.time}</td>
                    <td style={adminStyles.td}><span style={adminStyles.statusPill(m.color,m.bg)}><span style={{width:6,height:6,borderRadius:'50%',background:m.dot}}></span>{m.label}</span></td>
                    <td style={{...adminStyles.td,fontWeight:600,color:'#1c3610'}}>{o.price} <span style={{fontSize:10,color:'#888'}}>грн</span></td>
                    <td style={{...adminStyles.td,textAlign:'right',color:'#aaa',fontSize:14}}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Order drawer */}
      {selected && <OrderDrawer order={selected} lang={lang} onClose={()=>setSelected(null)} onMove={(d)=>move(selected.id,d)} SM={SM}/>}
    </div>
  );
};

const OrderDrawer = ({ order, lang, onClose, onMove, SM }) => {
  const m = SM[order.status];
  const src = SOURCE_META[order.source];
  return (
    <div style={{position:'absolute',inset:0,zIndex:50,display:'flex',justifyContent:'flex-end',background:'rgba(14,26,10,0.4)',animation:'fadeIn 0.18s ease'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:440,height:'100%',background:'#fff',padding:'22px 24px',overflow:'auto',boxShadow:'-12px 0 30px rgba(0,0,0,0.12)',animation:'slideRight 0.22s ease'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
          <div>
            <div style={{fontFamily:'"DM Mono",monospace',fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'#8aab6e'}}>{lang==='ua'?'Замовлення':'Order'} #{order.id}</div>
            <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,fontWeight:500,color:'#0e1a0a',marginTop:2}}>{order.customer[lang]}</div>
            <div style={{fontSize:11,color:'#888',marginTop:2,fontFamily:'"DM Mono",monospace'}}>{order.phone} · {order.created}</div>
          </div>
          <div onClick={onClose} style={{width:30,height:30,borderRadius:8,background:'#f5f1e8',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14}}>✕</div>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:18}}>
          <span style={adminStyles.statusPill(m.color,m.bg)}><span style={{width:6,height:6,borderRadius:'50%',background:m.dot}}></span>{m.label}</span>
          <span style={{...adminStyles.statusPill('#1c3610','rgba(14,26,10,0.06)')}}><span style={{color:src.color}}>{src.icon}</span>{src.label}</span>
          {order.paid && <span style={adminStyles.statusPill('#4a7c2f','rgba(138,171,110,0.18)')}>✓ {lang==='ua'?'Оплачено':'Paid'}</span>}
        </div>

        <div style={{display:'flex',gap:6,marginBottom:18}}>
          <div onClick={()=>onMove(-1)} style={{flex:1,padding:'9px',textAlign:'center',background:'#f5f1e8',borderRadius:8,fontSize:12,cursor:'pointer',color:'#1c3610'}}>← {lang==='ua'?'Назад':'Back'}</div>
          <div onClick={()=>onMove(1)} style={{flex:2,padding:'9px',textAlign:'center',background:'#0e1a0a',color:'#faf8f2',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>{lang==='ua'?'Наступний статус':'Next status'} →</div>
        </div>

        <Section title={lang==='ua'?'Букет':'Bouquet'}>
          <div style={{display:'flex',gap:12,padding:'12px',background:'#f5f1e8',borderRadius:10}}>
            <div style={{width:60,height:60,borderRadius:10,background:'linear-gradient(135deg,#dda8ad,#f5dde0)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bouquet palette={['#dda8ad','#f5dde0','#8aab6e']} composition={[{f:'peony-pink',n:5}]} size={56}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#1c3610'}}>{order.items}</div>
              <div style={{fontSize:11,color:'#666',marginTop:3,lineHeight:1.5}}>{lang==='ua'?'Півонії 5шт, евкаліпт. Крафт-обгортка.':'5 peonies, eucalyptus. Kraft wrap.'}</div>
            </div>
            <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:500,color:'#0e1a0a'}}>{order.price}</div>
          </div>
        </Section>

        <Section title={lang==='ua'?'Доставка':'Delivery'}>
          <Row label={lang==='ua'?'Адреса':'Address'} value={order.address}/>
          <Row label={lang==='ua'?'Час':'Time'} value={`${lang==='ua'?'Сьогодні':'Today'}, ${order.time}`}/>
          <Row label={lang==='ua'?'Кур\'єр':'Courier'} value={order.courier || (lang==='ua'?'— не призначено':'— unassigned')}/>
        </Section>

        <Section title={lang==='ua'?'Виконавець':'Florist'}>
          <div style={{display:'flex',gap:6}}>
            {['Аня','Юля','Марта'].map(f=>(
              <div key={f} style={{flex:1,padding:'9px',textAlign:'center',background:order.florist===f?'rgba(138,171,110,0.18)':'#f5f1e8',border:`1px solid ${order.florist===f?'#8aab6e':'transparent'}`,borderRadius:8,fontSize:12,fontWeight:order.florist===f?600:400,color:'#1c3610',cursor:'pointer'}}>{f}</div>
            ))}
          </div>
        </Section>

        <Section title={lang==='ua'?'Лог подій':'Event log'}>
          <div style={{position:'relative',paddingLeft:16}}>
            <div style={{position:'absolute',left:5,top:6,bottom:6,width:1,background:'rgba(14,26,10,0.08)'}}></div>
            {[
              {t:order.created,l:lang==='ua'?'Замовлення створено':'Order placed',a:'Telegram'},
              {t:'09:16',l:lang==='ua'?'Оплата отримана':'Payment received',a:'LiqPay'},
              {t:'09:18',l:lang==='ua'?'Призначено флориста':'Florist assigned',a:order.florist||'—'},
              {t:lang==='ua'?'зараз':'now',l:lang==='ua'?'Збирається':'Being crafted',a:order.florist||'—',active:true},
            ].map((e,i)=>(
              <div key={i} style={{display:'flex',gap:10,paddingBottom:10,position:'relative'}}>
                <div style={{position:'absolute',left:-15,top:5,width:11,height:11,borderRadius:'50%',background:e.active?'#8aab6e':'#fff',border:`2px solid ${e.active?'#8aab6e':'#aaa'}`}}></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#1c3610',fontWeight:e.active?600:400}}>{e.l}</div>
                  <div style={{fontSize:10.5,color:'#888',marginTop:1,fontFamily:'"DM Mono",monospace',letterSpacing:'0.04em'}}>{e.t} · {e.a}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{display:'flex',gap:6,marginTop:14}}>
          <div style={{flex:1,padding:'10px',textAlign:'center',background:'#f5f1e8',borderRadius:8,fontSize:12,cursor:'pointer'}}>💬 {lang==='ua'?'Написати':'Message'}</div>
          <div style={{flex:1,padding:'10px',textAlign:'center',background:'#f5f1e8',borderRadius:8,fontSize:12,cursor:'pointer'}}>🖨 {lang==='ua'?'Друк':'Print'}</div>
          <div style={{flex:1,padding:'10px',textAlign:'center',background:'rgba(193,75,80,0.1)',color:'#a13a3f',borderRadius:8,fontSize:12,cursor:'pointer'}}>{lang==='ua'?'Скасувати':'Cancel'}</div>
        </div>
      </div>
    </div>
  );
};

const Section = ({title,children}) => (
  <div style={{marginBottom:14}}>
    <div style={adminStyles.cardTitle}>{title}</div>
    <div>{children}</div>
  </div>
);
const Row = ({label,value}) => (
  <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid rgba(14,26,10,0.05)',fontSize:12.5}}>
    <span style={{color:'#888'}}>{label}</span>
    <span style={{color:'#1c3610',fontWeight:500,textAlign:'right'}}>{value}</span>
  </div>
);

window.AdminOrders = AdminOrders;
