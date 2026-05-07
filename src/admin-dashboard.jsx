// Admin Dashboard page — KPIs, sales chart, top bouquets, recent activity feed.

const AdminDashboard = ({ lang }) => {
  const [period, setPeriod] = React.useState('today');
  const k = window.ADMIN.KPI[period];
  const trend = window.ADMIN.SALES_TREND;
  const top = window.ADMIN.TOP_BOUQUETS;
  const sources = window.ADMIN.SOURCE_SPLIT;

  // Sparkline path
  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const w = 100, h = 100;
  const pts = trend.map((v,i)=>{
    const x = (i/(trend.length-1))*w;
    const y = h - ((v-min)/(max-min))*h*0.85 - 8;
    return [x,y];
  });
  const linePath = pts.map((p,i)=>(i?`L ${p[0]} ${p[1]}`:`M ${p[0]} ${p[1]}`)).join(' ');
  const areaPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
        <div>
          <div style={adminStyles.pageTitle}>{lang==='ua'?'Привіт, Аня 🌿':'Hi Anya 🌿'}</div>
          <div style={adminStyles.pageSub}>
            {lang==='ua'?`У вас 14 замовлень на сьогодні. 2 потребують уваги.`:'14 orders today. 2 need attention.'}
          </div>
        </div>
        <div style={{display:'flex',gap:6,background:'#fff',padding:4,borderRadius:10,border:'1px solid rgba(14,26,10,0.08)'}}>
          {[{id:'today',l:lang==='ua'?'Сьогодні':'Today'},{id:'week',l:lang==='ua'?'Тиждень':'Week'},{id:'month',l:lang==='ua'?'Місяць':'Month'}].map(p=>(
            <div key={p.id} onClick={()=>setPeriod(p.id)} style={{
              padding:'7px 14px', fontSize:12, fontWeight:500, cursor:'pointer',
              borderRadius:7,
              background: period===p.id ? '#0e1a0a' : 'transparent',
              color: period===p.id ? '#faf8f2' : '#1c3610',
            }}>{p.l}</div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={adminStyles.kpiGrid}>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>{lang==='ua'?'Замовлень':'Orders'}</div>
          <div style={adminStyles.kpiValue}>{k.orders}</div>
          <div style={adminStyles.kpiDelta}>↗ +12% {lang==='ua'?'до минулого':'vs prev'}</div>
        </div>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>{lang==='ua'?'Виторг':'Revenue'}</div>
          <div style={adminStyles.kpiValue}>{k.revenue.toLocaleString('uk').replace(/,/g,' ')}<span style={{fontSize:14,color:'#888',marginLeft:4}}>грн</span></div>
          <div style={adminStyles.kpiDelta}>↗ +8% {lang==='ua'?'до минулого':'vs prev'}</div>
        </div>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>{lang==='ua'?'Середній чек':'Avg ticket'}</div>
          <div style={adminStyles.kpiValue}>{k.avg}<span style={{fontSize:14,color:'#888',marginLeft:4}}>грн</span></div>
          <div style={adminStyles.kpiDelta}>↗ +3%</div>
        </div>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>{lang==='ua'?'Конверсія':'Conversion'}</div>
          <div style={adminStyles.kpiValue}>{k.conv}</div>
          <div style={{...adminStyles.kpiDelta,...adminStyles.kpiDeltaNeg}}>↘ −0.4%</div>
        </div>
      </div>

      {/* Chart + sources */}
      <div style={adminStyles.chartWrap}>
        <div style={adminStyles.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:14}}>
            <div>
              <div style={adminStyles.cardTitle}>{lang==='ua'?'Виторг за 14 днів':'Revenue, 14 days'}</div>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:24,fontWeight:500,color:'#0e1a0a'}}>284 600 <span style={{fontSize:12,color:'#888'}}>грн</span></div>
            </div>
            <div style={{display:'flex',gap:14,fontSize:11,color:'#666'}}>
              <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:10,height:2,background:'#1c3610'}}></span>{lang==='ua'?'Виторг':'Revenue'}</span>
              <span style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:10,height:2,background:'#dda8ad',borderTop:'1px dashed #dda8ad'}}></span>{lang==='ua'?'Минулий період':'Prev period'}</span>
            </div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:'100%',height:160,display:'block'}}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c3610" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#1c3610" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[20,40,60,80].map(y=>(<line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(14,26,10,0.05)" strokeWidth="0.3"/>))}
            <path d={areaPath} fill="url(#g1)"/>
            <path d={linePath} fill="none" stroke="#1c3610" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            {pts.map((p,i)=>(<circle key={i} cx={p[0]} cy={p[1]} r="0.8" fill="#1c3610"/>))}
          </svg>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontFamily:'"DM Mono",monospace',fontSize:9,color:'#888'}}>
            <span>17 кві</span><span>21 кві</span><span>25 кві</span><span>29 кві</span><span>2 тра</span>
          </div>
        </div>
        <div style={adminStyles.card}>
          <div style={adminStyles.cardTitle}>{lang==='ua'?'Звідки замовлення':'Order sources'}</div>
          <div style={{display:'flex',flexDirection:'column',gap:11,marginTop:8}}>
            {sources.map(s=>(
              <div key={s.id}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:4,fontSize:12}}>
                  <span style={{color:'#1c3610',fontWeight:500}}>{s.label}</span>
                  <span style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#0e1a0a'}}>{s.pct}<span style={{fontSize:10,color:'#888'}}>%</span></span>
                </div>
                <div style={{height:6,background:'rgba(14,26,10,0.06)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${s.pct}%`,background:s.color,borderRadius:3,transition:'width 0.4s'}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top + Recent */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={adminStyles.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={adminStyles.cardTitle}>{lang==='ua'?'Топ букети місяця':'Top this month'}</div>
            <div style={{fontSize:11,color:'#8aab6e',cursor:'pointer'}}>{lang==='ua'?'Усі →':'All →'}</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {top.map((b,i)=>(
              <div key={b.name} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 10px',borderRadius:10,background:i===0?'rgba(138,171,110,0.06)':'transparent',border:'1px solid rgba(14,26,10,0.04)'}}>
                <div style={{width:36,height:36,borderRadius:8,background:`linear-gradient(135deg, ${b.palette[0]}, ${b.palette[1]})`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Bouquet palette={b.palette} composition={[{f:'peony-pink',n:3}]} size={32}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1c3610'}}>{b.name}</div>
                  <div style={{fontSize:11,color:'#888',marginTop:1}}>{b.sold} {lang==='ua'?'продажів':'sold'}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#0e1a0a'}}>{b.revenue.toLocaleString('uk').replace(/,/g,' ')}</div>
                  <div style={{fontSize:9,color:'#888',fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>грн</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={adminStyles.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={adminStyles.cardTitle}>{lang==='ua'?'Останні дії':'Recent activity'}</div>
            <span style={{fontSize:9,color:'#4a7c2f',display:'flex',alignItems:'center',gap:4,fontFamily:'"DM Mono",monospace',letterSpacing:'0.1em',textTransform:'uppercase'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#4a7c2f',animation:'pulse 1.4s ease infinite'}}></span>live
            </span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:0}}>
            {[
              {who:'Олена К.',what:lang==='ua'?'оформила замовлення':'placed an order',sub:'#2641 · 930 грн',time:'2 хв',icon:'✦',color:'#8aab6e'},
              {who:'Катя В.',what:lang==='ua'?'додала листівку':'added a card',sub:'#2636 · QR відео',time:'5 хв',icon:'💌',color:'#dda8ad'},
              {who:'Ігор П.',what:lang==='ua'?'обрав букет в Tinder':'liked in Tinder',sub:lang==='ua'?'Польова':'Field song',time:'8 хв',icon:'♥',color:'#c14b50'},
              {who:'Ольга Т.',what:lang==='ua'?'залишила відгук':'left a review',sub:'⭐⭐⭐⭐⭐',time:'12 хв',icon:'⭐',color:'#c8a84b'},
              {who:'Софія Р.',what:lang==='ua'?'продовжила підписку':'renewed subscription',sub:lang==='ua'?'Букет щотижня':'Weekly bouquet',time:'24 хв',icon:'◷',color:'#a9c4e4'},
            ].map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<4?'1px solid rgba(14,26,10,0.04)':'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:`${a.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,color:'#1c3610'}}><b style={{fontWeight:600}}>{a.who}</b> {a.what}</div>
                  <div style={{fontSize:10.5,color:'#888',marginTop:1,fontFamily:'"DM Mono",monospace',letterSpacing:'0.04em'}}>{a.sub}</div>
                </div>
                <div style={{fontSize:10,color:'#aaa',fontFamily:'"DM Mono",monospace'}}>{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.AdminDashboard = AdminDashboard;
