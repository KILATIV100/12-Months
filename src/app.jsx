// Main app — composes Tweaks panel + side-by-side phones (Telegram chat + TWA app).

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "ua",
  "view": "phones",
  "scenario": "full",
  "twaScreen": "tinder",
  "cardStyle": "rounded",
  "tabStyle": "icons-labels",
  "showHeader": true
}/*EDITMODE-END*/;

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const T = useT(tweaks.lang);
  const [twaOpen, setTwaOpen] = React.useState(true);
  const [twaState, setTwaState] = React.useState({justPaid:false});
  const [twaInitialTab, setTwaInitialTab] = React.useState(tweaks.twaScreen);

  React.useEffect(() => {
    setTwaInitialTab(tweaks.twaScreen);
  }, [tweaks.twaScreen]);

  const handleOpenApp = () => {
    setTwaOpen(true);
  };

  const handlePay = (info) => {
    setTwaState({justPaid:true, ...info});
  };

  // ── Header
  const Header = () => (
    <div style={{
      position:'absolute', top:24, left:0, right:0,
      display:'flex', justifyContent:'center', alignItems:'center',
      gap:14, zIndex:5, pointerEvents:'none',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 18px',background:'#faf8f2',borderRadius:100,boxShadow:'0 2px 12px rgba(14,26,10,0.08)',border:'1px solid rgba(14,26,10,0.06)'}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'linear-gradient(135deg,#dda8ad,#8aab6e)'}}></div>
        <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontStyle:'italic',fontWeight:500,color:'#1c3610',letterSpacing:'0.01em'}}>
          12 Months
        </div>
        <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,color:'#888',letterSpacing:'0.16em',textTransform:'uppercase',marginLeft:6,paddingLeft:10,borderLeft:'1px solid rgba(14,26,10,0.1)'}}>
          Telegram TWA · Prototype
        </div>
      </div>
    </div>
  );

  // ── Side caption
  const SideCaption = ({ title, subtitle, side='left' }) => (
    <div style={{
      position:'absolute', bottom:30,
      [side]: 80,
      maxWidth:240,
      pointerEvents:'none',
    }}>
      <div style={{fontFamily:'"DM Mono",monospace',fontSize:9,letterSpacing:'0.18em',textTransform:'uppercase',color:'#8aab6e',marginBottom:5}}>{side==='left'?'A':'B'}</div>
      <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:22,color:'#1c3610',fontWeight:400,fontStyle:'italic',lineHeight:1.1,marginBottom:4}}>{title}</div>
      <div style={{fontSize:11,color:'#5a5a5a',lineHeight:1.5}}>{subtitle}</div>
    </div>
  );

  return (
    <div style={{
      width:'100vw', height:'100vh', position:'relative',
      background:'radial-gradient(ellipse at 30% 20%, #f5f0e0 0%, #ece7db 50%, #d8d2c0 100%)',
      overflow:'hidden',
    }}>
      {/* Decorative backdrop petals */}
      <div style={{position:'absolute',inset:0,opacity:0.2,pointerEvents:'none'}}>
        <PetalBackdrop palette={['#dda8ad','#c8a84b','#8aab6e']} opacity={0.25}/>
      </div>

      {tweaks.showHeader && tweaks.view==='phones' && <Header/>}

      {tweaks.view === 'admin' && (
        <div style={{position:'absolute',inset:0,zIndex:3}}>
          <AdminPanel lang={tweaks.lang}/>
        </div>
      )}

      {/* Stage */}
      <div style={{
        position:'absolute', inset:0,
        display: tweaks.view==='phones' ? 'flex' : 'none',
        justifyContent:'center', alignItems:'center',
        gap:60,
      }}>
        {/* Left phone — Telegram chat */}
        <div style={{position:'relative'}}>
          <div style={tgStyles.shell}>
            <div style={tgStyles.notch}></div>
            <div style={tgStyles.screen}>
              <TgStatusBar/>
              <TgHeader name={T.botName} status={T.botStatus}/>
              <TgConversation T={T} lang={tweaks.lang} scenario={tweaks.scenario} onOpenApp={handleOpenApp} twaState={twaState}/>
              <div style={tgStyles.composer}>
                <div style={tgStyles.attach}>📎</div>
                <input style={tgStyles.input} placeholder={tweaks.lang==='ua'?'Повідомлення':'Message'} readOnly/>
                <div style={tgStyles.mic}>🎤</div>
              </div>
            </div>
          </div>
          <SideCaption side="left" title={tweaks.lang==='ua'?'Telegram-бот':'Telegram bot'} subtitle={tweaks.lang==='ua'?'Знайомство, нагадування, статуси, оплата, NPS — все в одному чаті.':'Onboarding, reminders, statuses, payment, NPS — all in one chat.'}/>
        </div>

        {/* Right phone — TWA */}
        <div style={{position:'relative'}}>
          <PhoneFrame>
            {twaOpen && <TwaApp T={T} lang={tweaks.lang} initialTab={twaInitialTab} tweaks={tweaks} onPay={handlePay}/>}
          </PhoneFrame>
          <SideCaption side="right" title={tweaks.lang==='ua'?'Telegram Web App':'Telegram Web App'} subtitle={tweaks.lang==='ua'?'Конструктор, свайпи, готові букети, кабінет — всередині Telegram, без зовнішніх застосунків.':'Constructor, swipes, ready bouquets, profile — inside Telegram, no external apps.'}/>
        </div>
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks" defaults={TWEAK_DEFAULTS}>
        <TweakSection title={tweaks.lang==='ua'?'Загальні':'General'}>
          <TweakRadio label={tweaks.lang==='ua'?'Вид':'View'} value={tweaks.view} onChange={v=>setTweak('view',v)} options={[
            {value:'phones', label: tweaks.lang==='ua'?'Телефони':'Phones'},
            {value:'admin', label: tweaks.lang==='ua'?'Адмінка':'Admin'},
          ]}/>
          <TweakRadio label={tweaks.lang==='ua'?'Мова':'Language'} value={tweaks.lang} onChange={v=>setTweak('lang',v)} options={[{value:'ua',label:'UA'},{value:'en',label:'EN'}]}/>
          <TweakToggle label={tweaks.lang==='ua'?'Заголовок':'Header'} value={tweaks.showHeader} onChange={v=>setTweak('showHeader',v)}/>
        </TweakSection>
        <TweakSection title={tweaks.lang==='ua'?'Сценарій чату':'Chat scenario'}>
          <TweakSelect label={tweaks.lang==='ua'?'Сценарій':'Scenario'} value={tweaks.scenario} onChange={v=>setTweak('scenario',v)} options={[
            {value:'full', label: tweaks.lang==='ua'?'Повний (онбординг + замовлення)':'Full (onboarding + order)'},
            {value:'onboarding', label: tweaks.lang==='ua'?'Лише онбординг':'Onboarding only'},
            {value:'admin', label: tweaks.lang==='ua'?'Адмін (/add букет)':'Admin (/add bouquet)'},
          ]}/>
        </TweakSection>
        <TweakSection title={tweaks.lang==='ua'?'TWA':'TWA'}>
          <TweakSelect label={tweaks.lang==='ua'?'Екран':'Screen'} value={tweaks.twaScreen} onChange={v=>setTweak('twaScreen',v)} options={[
            {value:'tinder', label:T.twaTinder+' (Tinder)'},
            {value:'construct', label:T.twaConstruct},
            {value:'catalog', label:T.twaCatalog},
            {value:'calendar', label:T.twaCalendar},
            {value:'cabinet', label:T.twaCabinet},
          ]}/>
          <TweakRadio label={tweaks.lang==='ua'?'Кути':'Corners'} value={tweaks.cardStyle} onChange={v=>setTweak('cardStyle',v)} options={[
            {value:'rounded', label: tweaks.lang==='ua'?'М\'які':'Soft'},
            {value:'mid', label: tweaks.lang==='ua'?'Середні':'Mid'},
            {value:'squared', label: tweaks.lang==='ua'?'Гострі':'Sharp'},
          ]}/>
          <TweakRadio label={tweaks.lang==='ua'?'Tab bar':'Tab bar'} value={tweaks.tabStyle} onChange={v=>setTweak('tabStyle',v)} options={[
            {value:'icons-labels', label: tweaks.lang==='ua'?'Іконки + текст':'Icons + text'},
            {value:'icons-only', label: tweaks.lang==='ua'?'Лише іконки':'Icons only'},
            {value:'floating', label: tweaks.lang==='ua'?'Плаваюча':'Floating'},
          ]}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
