// Admin Clients, Reports, Settings, Reviews — combined for compactness.

const AdminClients = ({ lang }) => {
  const cls = window.ADMIN.CLIENTS;
  const segMeta = {
    vip:    { label:lang==='ua'?'VIP':'VIP', color:'#9d6500', bg:'rgba(232,196,84,0.18)' },
    regular:{ label:lang==='ua'?'Постійний':'Regular', color:'#4a7c2f', bg:'rgba(138,171,110,0.18)' },
    new:    { label:lang==='ua'?'Новий':'New', color:'#2e5a8c', bg:'rgba(106,176,232,0.18)' },
  };
  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={adminStyles.pageTitle}>{lang==='ua'?'Клієнти':'Clients'}</div>
        <div style={adminStyles.pageSub}>{lang==='ua'?'Усі ваші клієнти з Telegram. Сегменти оновлюються автоматично.':'All your Telegram clients. Segments update automatically.'}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
        {[
          {l:lang==='ua'?'Усього':'Total',v:'1,247',d:'+38'},
          {l:lang==='ua'?'VIP':'VIP',v:'84',d:'+3'},
          {l:lang==='ua'?'Нових за тиждень':'New this week',v:'27',d:'+12%'},
        ].map((s,i)=>(
          <div key={i} style={adminStyles.kpi}>
            <div style={adminStyles.kpiLabel}>{s.l}</div>
            <div style={adminStyles.kpiValue}>{s.v}</div>
            <div style={adminStyles.kpiDelta}>↗ {s.d}</div>
          </div>
        ))}
      </div>
      <div style={{...adminStyles.card,padding:0,overflow:'hidden'}}>
        <table style={adminStyles.table}>
          <thead><tr style={{background:'#faf8f2'}}>
            <th style={adminStyles.th}>{lang==='ua'?'Клієнт':'Client'}</th>
            <th style={adminStyles.th}>Telegram</th>
            <th style={adminStyles.th}>{lang==='ua'?'Сегмент':'Segment'}</th>
            <th style={adminStyles.th}>{lang==='ua'?'Замовлень':'Orders'}</th>
            <th style={adminStyles.th}>LTV</th>
            <th style={adminStyles.th}>{lang==='ua'?'Останнє':'Last order'}</th>
            <th style={adminStyles.th}></th>
          </tr></thead>
          <tbody>
            {cls.map(c=>{
              const s = segMeta[c.segment];
              const initials = c.name[lang].split(' ').map(w=>w[0]).slice(0,2).join('');
              return (
                <tr key={c.id} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#faf8f2'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={adminStyles.td}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#dda8ad,#8aab6e)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:600}}>{initials}</div>
                      <span style={{fontWeight:500,color:'#1c3610'}}>{c.name[lang]}</span>
                    </div>
                  </td>
                  <td style={{...adminStyles.td,fontFamily:'"DM Mono",monospace',color:'#666',fontSize:11.5}}>{c.tg}</td>
                  <td style={adminStyles.td}><span style={adminStyles.statusPill(s.color,s.bg)}>{s.label}</span></td>
                  <td style={{...adminStyles.td,fontWeight:500}}>{c.orders}</td>
                  <td style={{...adminStyles.td,fontFamily:'"Cormorant Garamond",serif',fontSize:16,fontWeight:500,color:'#1c3610'}}>{c.ltv.toLocaleString('uk').replace(/,/g,' ')} <span style={{fontSize:10,color:'#888'}}>грн</span></td>
                  <td style={{...adminStyles.td,color:'#666',fontFamily:'"DM Mono",monospace',fontSize:11}}>{c.last}</td>
                  <td style={{...adminStyles.td,textAlign:'right',fontSize:14,color:'#aaa'}}>›</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminReports = ({ lang }) => {
  const [tab, setTab] = React.useState('sales');
  const tabs = [
    {id:'sales',l:lang==='ua'?'Продажі':'Sales'},
    {id:'inventory',l:lang==='ua'?'Склад':'Inventory'},
    {id:'florists',l:lang==='ua'?'Флористи':'Florists'},
    {id:'marketing',l:lang==='ua'?'Маркетинг':'Marketing'},
  ];

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={adminStyles.pageTitle}>{lang==='ua'?'Звіти':'Reports'}</div>
          <div style={adminStyles.pageSub}>{lang==='ua'?'Все, що допомагає зрозуміти, як іде бізнес.':'Everything you need to understand how the business is going.'}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={adminStyles.topAction}>📅 {lang==='ua'?'Квітень 2026':'April 2026'}</div>
          <div style={adminStyles.topPrimary}>📥 {lang==='ua'?'Експорт у Excel':'Export to Excel'}</div>
        </div>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:14,background:'#fff',padding:4,borderRadius:10,border:'1px solid rgba(14,26,10,0.08)',width:'fit-content'}}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{padding:'8px 16px',fontSize:12.5,fontWeight:500,cursor:'pointer',borderRadius:7,background:tab===t.id?'#0e1a0a':'transparent',color:tab===t.id?'#faf8f2':'#1c3610'}}>{t.l}</div>
        ))}
      </div>

      {tab==='sales' && <SalesReport lang={lang}/>}
      {tab==='inventory' && <InventoryReport lang={lang}/>}
      {tab==='florists' && <FloristsReport lang={lang}/>}
      {tab==='marketing' && <MarketingReport lang={lang}/>}
    </div>
  );
};

const SalesReport = ({lang}) => {
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
  const heatmap = days.map(()=>Array.from({length:24},()=>Math.random()));
  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        {[
          {l:lang==='ua'?'Виторг':'Revenue',v:'284 600',d:'+18%',pos:true},
          {l:lang==='ua'?'Замовлень':'Orders',v:'312',d:'+12%',pos:true},
          {l:lang==='ua'?'Середній чек':'Avg ticket',v:'912',d:'+5%',pos:true},
          {l:lang==='ua'?'Повернення':'Returning',v:'48%',d:'+3%',pos:true},
        ].map((s,i)=>(
          <div key={i} style={adminStyles.kpi}>
            <div style={adminStyles.kpiLabel}>{s.l}</div>
            <div style={adminStyles.kpiValue}>{s.v}</div>
            <div style={{...adminStyles.kpiDelta,...(s.pos?{}:adminStyles.kpiDeltaNeg)}}>{s.pos?'↗':'↘'} {s.d}</div>
          </div>
        ))}
      </div>

      <div style={{...adminStyles.card,marginBottom:12}}>
        <div style={adminStyles.cardTitle}>{lang==='ua'?'Популярний час замовлень':'Order heatmap'}</div>
        <div style={{display:'flex',gap:1,marginTop:10}}>
          <div style={{display:'flex',flexDirection:'column',gap:1,paddingRight:8,paddingTop:14}}>
            {days.map(d=>(<div key={d} style={{height:18,fontSize:10,color:'#888',display:'flex',alignItems:'center',fontFamily:'"DM Mono",monospace'}}>{d}</div>))}
          </div>
          <div style={{flex:1}}>
            <div style={{display:'flex',gap:1,marginBottom:1,paddingLeft:1}}>
              {Array.from({length:24}).map((_,h)=>(<div key={h} style={{flex:1,fontSize:9,color:'#aaa',textAlign:'center',fontFamily:'"DM Mono",monospace',visibility:h%4===0?'visible':'hidden'}}>{h}h</div>))}
            </div>
            {heatmap.map((row,ri)=>(
              <div key={ri} style={{display:'flex',gap:1,marginBottom:1}}>
                {row.map((v,hi)=>{
                  // Make business hours hotter
                  const hotness = (hi>=10&&hi<=20) ? v*0.6+0.4 : v*0.3;
                  return <div key={hi} style={{flex:1,height:18,background:`rgba(28,54,16,${hotness})`,borderRadius:2}}></div>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:11,color:'#666',marginTop:10}}>{lang==='ua'?'Найбільше замовлень — субота, 14:00–17:00. Розгляньте сповіщення про доставку зранку.':'Peak orders — Saturday, 2–5pm. Consider promoting morning delivery.'}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={adminStyles.card}>
          <div style={adminStyles.cardTitle}>{lang==='ua'?'По категоріях':'By category'}</div>
          {[
            {l:lang==='ua'?'Романтика':'Romance',v:42,c:'#dda8ad'},
            {l:lang==='ua'?'День народження':'Birthday',v:28,c:'#c8a84b'},
            {l:lang==='ua'?'Просто так':'Just because',v:18,c:'#8aab6e'},
            {l:lang==='ua'?'Офіс':'Office',v:12,c:'#a9c4e4'},
          ].map((s,i)=>(
            <div key={i} style={{marginTop:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                <span style={{color:'#1c3610'}}>{s.l}</span>
                <span style={{fontFamily:'"DM Mono",monospace',color:'#666'}}>{s.v}%</span>
              </div>
              <div style={{height:6,background:'rgba(14,26,10,0.06)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${s.v}%`,background:s.c}}></div>
              </div>
            </div>
          ))}
        </div>
        <div style={adminStyles.card}>
          <div style={adminStyles.cardTitle}>{lang==='ua'?'Рекомендації':'Insights'}</div>
          {[
            {i:'💡',t:lang==='ua'?'Підняти ціну "Ніжність" на 50 грн':'Raise "Tenderness" price by ₴50',d:lang==='ua'?'Попит зростає, конкуренти на 80 грн дорожче':'Demand growing, competitors are ₴80 higher'},
            {i:'⚠',t:lang==='ua'?'Мало гортензій на складі':'Low hydrangea stock',d:lang==='ua'?'Залишилось 6 шт. Замовте до п\'ятниці':'6 left. Order by Friday'},
            {i:'⭐',t:lang==='ua'?'Пік для підписок — травень':'Subscription peak — May',d:lang==='ua'?'Запустіть промо в Telegram-каналі':'Launch a promo in your Telegram channel'},
          ].map((r,i)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:i<2?'1px solid rgba(14,26,10,0.05)':'none'}}>
              <div style={{fontSize:18,flexShrink:0}}>{r.i}</div>
              <div>
                <div style={{fontSize:12.5,color:'#1c3610',fontWeight:500}}>{r.t}</div>
                <div style={{fontSize:11,color:'#888',marginTop:2,lineHeight:1.4}}>{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const InventoryReport = ({lang}) => (
  <div style={{...adminStyles.card,padding:0,overflow:'hidden'}}>
    <table style={adminStyles.table}>
      <thead><tr style={{background:'#faf8f2'}}>
        <th style={adminStyles.th}>{lang==='ua'?'Квітка':'Flower'}</th>
        <th style={adminStyles.th}>{lang==='ua'?'Залишок':'Stock'}</th>
        <th style={adminStyles.th}>{lang==='ua'?'Витрачено':'Used'}</th>
        <th style={adminStyles.th}>{lang==='ua'?'Поставка':'Restock'}</th>
        <th style={adminStyles.th}>{lang==='ua'?'Стан':'Status'}</th>
      </tr></thead>
      <tbody>
        {window.MOCK.FLOWERS.concat(window.MOCK.GREENS).map((f,i)=>{
          const stock = [42,18,3,67,28,6,34,52,71,29,15][i]||25;
          const used = [124,87,42,78,65][i]||50;
          const low = stock<10;
          return (
            <tr key={f.id}>
              <td style={adminStyles.td}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:f.color}}></div>
                  <span style={{fontWeight:500,color:'#1c3610'}}>{f.name[lang]}</span>
                </div>
              </td>
              <td style={{...adminStyles.td,fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:low?'#c14b50':'#1c3610'}}>{stock} <span style={{fontSize:10,color:'#888'}}>шт</span></td>
              <td style={{...adminStyles.td,color:'#666'}}>{used} {lang==='ua'?'за тиждень':'this week'}</td>
              <td style={{...adminStyles.td,color:'#666',fontSize:11.5}}>{lang==='ua'?'Пн, 5 тра':'Mon, May 5'}</td>
              <td style={adminStyles.td}>{low ? <span style={adminStyles.statusPill('#a13a3f','rgba(193,75,80,0.13)')}>{lang==='ua'?'мало':'low'}</span> : <span style={adminStyles.statusPill('#4a7c2f','rgba(138,171,110,0.18)')}>OK</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const FloristsReport = ({lang}) => (
  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
    {[
      {n:'Аня',c:'#dda8ad',orders:42,rating:4.9,speed:'14 хв'},
      {n:'Юля',c:'#8aab6e',orders:38,rating:4.8,speed:'16 хв'},
      {n:'Марта',c:'#c8a84b',orders:24,rating:4.7,speed:'19 хв'},
    ].map(f=>(
      <div key={f.n} style={adminStyles.card}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:50,height:50,borderRadius:'50%',background:f.c,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:500}}>{f.n[0]}</div>
          <div>
            <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,fontWeight:500}}>{f.n}</div>
            <div style={{fontSize:11,color:'#888'}}>{lang==='ua'?'Флорист':'Florist'}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <Stat l={lang==='ua'?'Зібрано':'Made'} v={f.orders}/>
          <Stat l={lang==='ua'?'Рейтинг':'Rating'} v={`★ ${f.rating}`}/>
          <Stat l={lang==='ua'?'Сер. час':'Avg time'} v={f.speed}/>
        </div>
      </div>
    ))}
  </div>
);
const Stat = ({l,v}) => (
  <div>
    <div style={{fontSize:9,color:'#888',fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase'}}>{l}</div>
    <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontWeight:500,color:'#0e1a0a',marginTop:2}}>{v}</div>
  </div>
);

const MarketingReport = ({lang}) => (
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
    <div style={adminStyles.card}>
      <div style={adminStyles.cardTitle}>{lang==='ua'?'Залучення клієнтів':'Acquisition'}</div>
      {[
        {l:'Telegram-канал',v:142,c:'#a9c4e4'},
        {l:'Реферали',v:88,c:'#dda8ad'},
        {l:'Instagram',v:64,c:'#c8a84b'},
        {l:lang==='ua'?'Знайомі/слово':'Word of mouth',v:18,c:'#8aab6e'},
      ].map((s,i)=>(
        <div key={i} style={{marginTop:10}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
            <span style={{color:'#1c3610'}}>{s.l}</span>
            <span style={{fontFamily:'"DM Mono",monospace',color:'#666'}}>{s.v} {lang==='ua'?'нових':'new'}</span>
          </div>
          <div style={{height:6,background:'rgba(14,26,10,0.06)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(s.v/142)*100}%`,background:s.c}}></div>
          </div>
        </div>
      ))}
    </div>
    <div style={adminStyles.card}>
      <div style={adminStyles.cardTitle}>{lang==='ua'?'Активні промокоди':'Active promo codes'}</div>
      {[
        {c:'MAMA2026',u:42,d:lang==='ua'?'-15% на День мами':'-15% Mom\'s Day'},
        {c:'SPRING',u:28,d:lang==='ua'?'-10% весняна колекція':'-10% spring collection'},
        {c:'WELCOME',u:64,d:lang==='ua'?'-20% перше замовлення':'-20% first order'},
      ].map((p,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:i<2?'1px solid rgba(14,26,10,0.05)':'none'}}>
          <div style={{padding:'5px 9px',borderRadius:6,background:'#0e1a0a',color:'#faf8f2',fontFamily:'"DM Mono",monospace',fontSize:11,fontWeight:600}}>{p.c}</div>
          <div style={{flex:1,fontSize:12,color:'#666'}}>{p.d}</div>
          <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:'#1c3610'}}>{p.u}</div>
        </div>
      ))}
      <div style={{marginTop:10,padding:'10px',background:'#f5f1e8',borderRadius:8,fontSize:12,color:'#1c3610',textAlign:'center',cursor:'pointer'}}>＋ {lang==='ua'?'Створити промокод':'Create promo'}</div>
    </div>
  </div>
);

const AdminReviews = ({lang}) => {
  const r = window.ADMIN.REVIEWS;
  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={adminStyles.pageTitle}>{lang==='ua'?'Відгуки':'Reviews'}</div>
        <div style={adminStyles.pageSub}>{lang==='ua'?'Що клієнти кажуть про вас.':'What customers say about you.'}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
        <div style={{...adminStyles.kpi,gridColumn:'span 2',background:'linear-gradient(135deg,#0e1a0a,#1c3610)',color:'#faf8f2',border:'none'}}>
          <div style={{...adminStyles.kpiLabel,color:'rgba(250,248,242,0.6)'}}>{lang==='ua'?'Середня оцінка':'Average rating'}</div>
          <div style={{...adminStyles.kpiValue,color:'#faf8f2',display:'flex',alignItems:'baseline',gap:8}}>4.87 <span style={{fontSize:14,color:'#e8c454'}}>★★★★★</span></div>
          <div style={{fontSize:11,color:'rgba(250,248,242,0.6)',marginTop:5}}>{lang==='ua'?'Зі 142 відгуків':'From 142 reviews'}</div>
        </div>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>NPS</div>
          <div style={adminStyles.kpiValue}>72</div>
          <div style={adminStyles.kpiDelta}>↗ +8</div>
        </div>
        <div style={adminStyles.kpi}>
          <div style={adminStyles.kpiLabel}>{lang==='ua'?'Без відповіді':'Unanswered'}</div>
          <div style={{...adminStyles.kpiValue,color:'#c14b50'}}>3</div>
          <div style={{fontSize:11,color:'#888',marginTop:5}}>{lang==='ua'?'Дайте відповідь сьогодні':'Reply today'}</div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {r.map(rv=>(
          <div key={rv.id} style={adminStyles.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
              <div>
                <div style={{fontWeight:600,color:'#1c3610',fontSize:13}}>{rv.from[lang]}</div>
                <div style={{fontSize:10.5,color:'#888',fontFamily:'"DM Mono",monospace',marginTop:2}}>#{rv.order} · {rv.when}</div>
              </div>
              <div style={{color:'#e8c454',fontSize:14}}>{'★'.repeat(rv.stars)}<span style={{color:'#ddd'}}>{'★'.repeat(5-rv.stars)}</span></div>
            </div>
            <div style={{fontSize:13,color:'#333',lineHeight:1.5,marginBottom:10}}>"{rv.text[lang]}"</div>
            <div style={{display:'flex',gap:8}}>
              <div style={{padding:'7px 12px',background:'#f5f1e8',borderRadius:7,fontSize:12,cursor:'pointer'}}>💬 {lang==='ua'?'Відповісти':'Reply'}</div>
              <div style={{padding:'7px 12px',background:'#f5f1e8',borderRadius:7,fontSize:12,cursor:'pointer'}}>📌 {lang==='ua'?'Закріпити':'Pin'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminSettings = ({lang}) => {
  const groups = [
    { t:lang==='ua'?'Магазин':'Store', items:[
      {l:lang==='ua'?'Назва магазину':'Shop name',v:'12 місяців',i:'🌿'},
      {l:lang==='ua'?'Telegram-канал':'Telegram channel',v:'@dvanadcyat',i:'✈'},
      {l:lang==='ua'?'Адреса':'Address',v:'Київ, вул. Хрещатик 22',i:'📍'},
      {l:lang==='ua'?'Робочі години':'Hours',v:'09:00 — 21:00',i:'⏱'},
    ]},
    { t:lang==='ua'?'Доставка':'Delivery', items:[
      {l:lang==='ua'?'Зона доставки':'Delivery zone',v:lang==='ua'?'Київ + 20 км':'Kyiv + 20 km',i:'🚚'},
      {l:lang==='ua'?'Вартість':'Price',v:'120 грн',i:'₴'},
      {l:lang==='ua'?'Безкоштовно від':'Free above',v:'1 500 грн',i:'✓'},
    ]},
    { t:lang==='ua'?'Платежі':'Payments', items:[
      {l:'LiqPay',v:lang==='ua'?'Підключено':'Connected',i:'💳',ok:true},
      {l:lang==='ua'?'Готівка':'Cash',v:lang==='ua'?'Увімкнено':'Enabled',i:'💵',ok:true},
      {l:'Apple Pay',v:lang==='ua'?'Не підключено':'Not connected',i:'',ok:false},
    ]},
    { t:lang==='ua'?'Сповіщення':'Notifications', items:[
      {l:lang==='ua'?'Нове замовлення → Telegram':'New order → Telegram',v:lang==='ua'?'Увімкнено':'On',i:'🔔',ok:true},
      {l:lang==='ua'?'Звіт за день о 21:00':'Daily report at 9pm',v:lang==='ua'?'Увімкнено':'On',i:'📊',ok:true},
      {l:lang==='ua'?'Низький залишок':'Low stock',v:lang==='ua'?'Email + Telegram':'Email + Telegram',i:'⚠',ok:true},
    ]},
    { t:lang==='ua'?'Команда':'Team', items:[
      {l:'Аня Морозюк',v:lang==='ua'?'Власниця':'Owner',i:'👤'},
      {l:'Юля Петрик',v:lang==='ua'?'Флорист':'Florist',i:'👤'},
      {l:'Марта Боднар',v:lang==='ua'?'Флорист':'Florist',i:'👤'},
    ]},
  ];

  return (
    <div>
      <div style={{marginBottom:18}}>
        <div style={adminStyles.pageTitle}>{lang==='ua'?'Налаштування':'Settings'}</div>
        <div style={adminStyles.pageSub}>{lang==='ua'?'Все про вашу квіткову. Зміни одразу синхронізуються з Telegram.':'Everything about your shop. Changes sync to Telegram instantly.'}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
        {groups.map(g=>(
          <div key={g.t} style={adminStyles.card}>
            <div style={adminStyles.cardTitle}>{g.t}</div>
            {g.items.map((it,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<g.items.length-1?'1px solid rgba(14,26,10,0.05)':'none',cursor:'pointer'}}>
                <div style={{width:32,height:32,borderRadius:8,background:'#f5f1e8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{it.i}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,color:'#1c3610',fontWeight:500}}>{it.l}</div>
                  <div style={{fontSize:11,color:it.ok===false?'#c14b50':'#888',marginTop:1}}>{it.v}</div>
                </div>
                <div style={{color:'#aaa',fontSize:14}}>›</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

window.AdminClients = AdminClients;
window.AdminReports = AdminReports;
window.AdminReviews = AdminReviews;
window.AdminSettings = AdminSettings;
