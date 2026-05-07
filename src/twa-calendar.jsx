// TWA Calendar — list of important dates with add/edit, push preview

const TwaCalendar = ({ T, lang, cardStyle='rounded' }) => {
  const [dates, setDates] = React.useState(window.MOCK.DATES);
  const [adding, setAdding] = React.useState(false);
  const [newDate, setNewDate] = React.useState({label:'', person:'', icon:'🎁', date:''});
  const radius = cardStyle==='rounded' ? 14 : cardStyle==='squared' ? 4 : 10;

  const formatDelta = (d) => {
    if (d === 0) return T.today;
    if (d === 1) return T.tomorrow;
    return `${T.inDays} ${d} ${T.daysLeft}`;
  };

  const sorted = [...dates].sort((a,b)=>a.dayDelta - b.dayDelta);

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2', overflow:'auto'}}>
      <div style={{padding:'14px 22px 8px', display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
        <div>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>Календар</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:2}}>{T.myDates}</div>
        </div>
        <div onClick={()=>setAdding(true)} style={{padding:'6px 12px', borderRadius:100, background:'#1c3610', color:'#faf8f2', fontSize:11, fontWeight:500, cursor:'pointer'}}>{T.addDate}</div>
      </div>

      {/* Push preview */}
      <div style={{margin:'8px 22px 14px', padding:'14px 14px', background:'linear-gradient(135deg, #1c3610, #2d5016)', borderRadius:radius, color:'#faf8f2', position:'relative', overflow:'hidden'}}>
        <PetalBackdrop palette={['#dda8ad','#8aab6e','#c8a84b']} opacity={0.18}/>
        <div style={{position:'relative',zIndex:2}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:8,letterSpacing:'0.14em',textTransform:'uppercase',color:'#8aab6e',marginBottom:5}}>🔔 Найближче нагадування</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontStyle:'italic',fontWeight:300,lineHeight:1.15}}>
            {lang==='ua' ? 'Через 6 днів — день мами' : 'In 6 days — Mom\'s day'}
          </div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:6,lineHeight:1.45}}>
            {lang==='ua' ? 'Ми вже підібрали 3 ніжні варіанти на основі історії покупок.' : 'We\'ve picked 3 soft options based on your history.'}
          </div>
        </div>
      </div>

      {/* Add inline */}
      {adding && (
        <div style={{margin:'0 22px 12px', padding:14, background:'#fff', borderRadius:radius, border:'1px solid rgba(45,80,22,0.13)', animation:'fadeUp 0.25s ease'}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#8aab6e',marginBottom:10}}>Нова дата</div>
          <input value={newDate.label} onChange={e=>setNewDate({...newDate, label:e.target.value})} placeholder={lang==='ua'?'Подія (ДН, річниця...)':'Event'} style={{width:'100%',padding:'9px 11px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:12,marginBottom:6,fontFamily:'inherit',background:'#faf8f2'}}/>
          <input value={newDate.person} onChange={e=>setNewDate({...newDate, person:e.target.value})} placeholder={lang==='ua'?'Кого вітаємо':'Whom'} style={{width:'100%',padding:'9px 11px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:12,marginBottom:6,fontFamily:'inherit',background:'#faf8f2'}}/>
          <input type="date" value={newDate.date} onChange={e=>setNewDate({...newDate, date:e.target.value})} style={{width:'100%',padding:'9px 11px',border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,fontSize:12,marginBottom:6,fontFamily:'inherit',background:'#faf8f2'}}/>
          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['🎁','💐','💍','🎂','🎉'].map(e=>(
              <div key={e} onClick={()=>setNewDate({...newDate, icon:e})} style={{flex:1,padding:7,textAlign:'center',fontSize:18,background:newDate.icon===e?'rgba(138,171,110,0.2)':'#faf8f2',border:`1px solid ${newDate.icon===e?'#8aab6e':'rgba(45,80,22,0.1)'}`,borderRadius:6,cursor:'pointer'}}>{e}</div>
            ))}
          </div>
          <div style={{display:'flex',gap:6}}>
            <div onClick={()=>setAdding(false)} style={{flex:1,padding:9,textAlign:'center',fontSize:11,border:'1px solid rgba(45,80,22,0.13)',borderRadius:8,cursor:'pointer',color:'#444'}}>{T.skip}</div>
            <div onClick={()=>{
              if (!newDate.label) return;
              const colors=['#dda8ad','#c8a84b','#8aab6e','#a9c4e4'];
              setDates([...dates,{id:'d'+Date.now(), label:{ua:newDate.label,en:newDate.label}, person:{ua:newDate.person,en:newDate.person}, date:newDate.date, dayDelta:14, color:colors[dates.length%4], icon:newDate.icon}]);
              setNewDate({label:'',person:'',icon:'🎁',date:''});
              setAdding(false);
            }} style={{flex:2,padding:9,textAlign:'center',fontSize:11,fontWeight:500,background:'#1c3610',color:'#faf8f2',borderRadius:8,cursor:'pointer'}}>{T.addDate}</div>
          </div>
        </div>
      )}

      {/* Date list */}
      <div style={{padding:'0 22px 16px', display:'flex', flexDirection:'column', gap:8}}>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'#888',marginBottom:2}}>{T.upcoming}</div>
        {sorted.map(d=>(
          <div key={d.id} style={{padding:'12px 14px', background:'#fff', border:'1px solid rgba(45,80,22,0.1)', borderRadius:radius, display:'flex', alignItems:'center', gap:12, position:'relative'}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${d.color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{d.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1c3610'}}>{d.label[lang]} <span style={{color:'#888',fontWeight:400}}>· {d.person[lang]}</span></div>
              <div style={{fontSize:11,color:'#888',marginTop:1}}>{formatDelta(d.dayDelta)}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,color:'#1c3610',fontWeight:500,lineHeight:1}}>{d.date.split('-')[2]}</div>
              <div style={{fontFamily:'"DM Mono",monospace',fontSize:8,color:'#888',letterSpacing:'0.1em',textTransform:'uppercase'}}>{['СІЧ','ЛЮТ','БЕР','КВІ','ТРА','ЧЕР','ЛИП','СЕР','ВЕР','ЖОВ','ЛИС','ГРУ'][parseInt(d.date.split('-')[1])-1]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.TwaCalendar = TwaCalendar;
