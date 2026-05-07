// TWA Tinder — swipe stack of bouquets

const TwaTinder = ({ T, lang, onComplete, cardStyle='rounded' }) => {
  const [idx, setIdx] = React.useState(0);
  const [liked, setLiked] = React.useState([]);
  const [disliked, setDisliked] = React.useState([]);
  const [drag, setDrag] = React.useState({x:0, active:false, startX:0, startY:0});
  const [exitX, setExitX] = React.useState(0);
  const [showResult, setShowResult] = React.useState(false);
  const cards = window.MOCK.BOUQUETS;
  const total = cards.length;
  const radius = cardStyle==='rounded' ? 22 : cardStyle==='squared' ? 4 : 12;

  const swipe = (dir) => {
    const card = cards[idx];
    if (dir > 0) setLiked([...liked, card.id]);
    else setDisliked([...disliked, card.id]);
    setExitX(dir * 500);
    setTimeout(() => {
      setExitX(0);
      setDrag({x:0, active:false, startX:0, startY:0});
      if (idx + 1 >= total) {
        setShowResult(true);
      } else {
        setIdx(idx+1);
      }
    }, 280);
  };

  const onDown = (e) => {
    const t = e.touches ? e.touches[0] : e;
    setDrag({x:0, active:true, startX:t.clientX, startY:t.clientY});
  };
  const onMove = (e) => {
    if (!drag.active) return;
    const t = e.touches ? e.touches[0] : e;
    setDrag({...drag, x: t.clientX - drag.startX});
  };
  const onUp = () => {
    if (Math.abs(drag.x) > 80) {
      swipe(drag.x > 0 ? 1 : -1);
    } else {
      setDrag({x:0, active:false, startX:0, startY:0});
    }
  };

  if (showResult) {
    const profile = liked.length >= disliked.length ? 'pastel' : 'classic';
    return (
      <div style={{flex:1, padding:'24px 22px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', background:'linear-gradient(180deg, #faf8f2 0%, #f0ebe0 100%)', position:'relative'}}>
        <PetalBackdrop palette={['#dda8ad','#8aab6e','#c8a84b']} opacity={0.3}/>
        <div style={{position:'relative', zIndex:2}}>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'#8aab6e',marginBottom:14}}>✦ Claude AI</div>
          <h2 style={{fontFamily:'"Cormorant Garamond",serif',fontSize:34,fontWeight:300,color:'#1c3610',lineHeight:1.05, marginBottom:12}}>
            <em style={{fontStyle:'italic',color:'#8aab6e'}}>{T.tinderResult}</em>
          </h2>
          <div style={{fontSize:13,color:'#666',lineHeight:1.55,marginBottom:24,maxWidth:280}}>
            {lang==='ua' ? 'Вам подобаються пастельні відтінки, ніжні форми та об\'ємні півонії.' : 'You love pastel hues, soft shapes and voluminous peonies.'}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:32,maxWidth:280}}>
            {['pastel', 'romantic', 'soft volume'].map(t=>(
              <span key={t} style={{padding:'5px 12px',background:'#fff',border:'1px solid rgba(45,80,22,0.13)',borderRadius:100,fontSize:11,color:'#1c3610',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{t}</span>
            ))}
          </div>
          <div style={{padding:'13px 22px',background:'#1c3610',color:'#faf8f2',borderRadius:radius,fontSize:13,fontWeight:500,display:'inline-flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={onComplete}>
            {T.tinderShowPicks} →
          </div>
          <div style={{marginTop:14,fontSize:11,color:'#888'}}>
            ♥ {liked.length} · ✕ {disliked.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', background:'#faf8f2'}}>
      <div style={{padding:'14px 22px 6px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.16em',textTransform:'uppercase',color:'#8aab6e'}}>Підбір смаку</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,color:'#1c3610',fontWeight:400,lineHeight:1.1,marginTop:2}}>
            {T.tinderTitle}
          </div>
        </div>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:11,color:'#1c3610',background:'#fff',padding:'5px 11px',borderRadius:100,border:'1px solid rgba(45,80,22,0.13)'}}>
          {idx+1}/{total}
        </div>
      </div>

      {/* progress dots */}
      <div style={{display:'flex',gap:3,padding:'6px 22px 12px'}}>
        {cards.map((_,i)=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,background: i<idx ? '#8aab6e' : i===idx ? '#1c3610' : 'rgba(45,80,22,0.1)', transition:'background 0.2s'}}/>
        ))}
      </div>

      {/* card stack */}
      <div style={{flex:1, position:'relative', padding:'0 22px'}}
           onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
           onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
        {[2,1,0].map(off => {
          const cardIdx = idx + off;
          if (cardIdx >= total) return null;
          const card = cards[cardIdx];
          const isTop = off === 0;
          const tx = isTop ? (drag.x + exitX) : 0;
          const rot = isTop ? (drag.x + exitX) * 0.06 : 0;
          const op = isTop ? (1 - Math.abs(drag.x)/600) : 1;
          const scale = 1 - off*0.04;
          const ty = off*8;
          return (
            <div key={card.id} style={{
              position:'absolute', inset:'0 22px',
              transform:`translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`,
              opacity: op,
              transition: drag.active && isTop ? 'none' : 'transform 0.28s ease, opacity 0.28s ease',
              zIndex:10-off,
              cursor: isTop ? 'grab' : 'default',
            }}>
              <div style={{
                width:'100%', height:'100%',
                background:`linear-gradient(160deg, ${card.palette[0]} 0%, ${card.palette[1]} 50%, ${card.palette[2]||card.palette[1]} 100%)`,
                borderRadius:radius,
                overflow:'hidden',
                display:'flex', flexDirection:'column', justifyContent:'space-between',
                padding:24,
                boxShadow:'0 18px 40px rgba(14,26,10,0.18), 0 0 0 1px rgba(14,26,10,0.06)',
                position:'relative',
              }}>
                <PetalBackdrop palette={card.palette} opacity={0.5}/>
                <div style={{position:'relative',zIndex:2,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(14,26,10,0.55)'}}>
                    №{cardIdx+1}
                  </div>
                  {isTop && Math.abs(drag.x) > 30 && (
                    <div style={{
                      padding:'7px 16px', borderRadius:100,
                      border:`2px solid ${drag.x>0 ? '#1c3610' : '#c14b50'}`,
                      color: drag.x>0 ? '#1c3610' : '#c14b50',
                      fontFamily:'"DM Mono",monospace', fontSize:13, fontWeight:600,
                      letterSpacing:'0.1em',
                      transform: `rotate(${drag.x>0?-8:8}deg)`,
                      background:'rgba(255,255,255,0.85)',
                    }}>{drag.x>0 ? '♥ LOVE' : '✕ NOPE'}</div>
                  )}
                </div>

                <div style={{position:'relative',zIndex:2,display:'flex',justifyContent:'center',alignItems:'center',flex:1, marginTop:-16, marginBottom:-16}}>
                  <Bouquet palette={card.palette} composition={card.composition} size={240} base="kraft"/>
                </div>

                <div style={{position:'relative',zIndex:2}}>
                  <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:30,fontWeight:400,color:'#0e1a0a',lineHeight:1}}>
                    {card.name[lang]}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:6}}>
                    <div style={{fontSize:11,color:'rgba(14,26,10,0.6)'}}>
                      {card.tags.slice(0,2).join(' · ')}
                    </div>
                    <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:500,color:'#0e1a0a'}}>
                      {card.price} {T.grn}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* buttons */}
      <div style={{display:'flex',justifyContent:'center',gap:24,padding:'14px 0 18px'}}>
        <div onClick={()=>swipe(-1)} style={{
          width:54,height:54,borderRadius:'50%',background:'#fff',border:'1.5px solid rgba(45,80,22,0.15)',
          display:'flex',alignItems:'center',justifyContent:'center',
          color:'#c14b50',fontSize:20, cursor:'pointer',
          boxShadow:'0 6px 16px rgba(14,26,10,0.08)',
        }}>✕</div>
        <div onClick={()=>swipe(1)} style={{
          width:54,height:54,borderRadius:'50%',
          background:'linear-gradient(135deg,#dda8ad,#c98088)',border:'none',
          display:'flex',alignItems:'center',justifyContent:'center',
          color:'#fff',fontSize:20, cursor:'pointer',
          boxShadow:'0 8px 22px rgba(221,168,173,0.5)',
        }}>♥</div>
      </div>
      <div style={{textAlign:'center',fontSize:10,color:'#888',paddingBottom:8,fontFamily:'"DM Mono",monospace',letterSpacing:'0.1em',textTransform:'uppercase'}}>
        {T.tinderSub}
      </div>
    </div>
  );
};

window.TwaTinder = TwaTinder;
