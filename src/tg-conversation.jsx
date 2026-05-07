// Telegram chat conversation flows. Bot ↔ User messages with timeline animation.

const TgConversation = ({ T, lang, scenario='full', onOpenApp, twaState }) => {
  const scrollRef = React.useRef(null);
  // We render messages based on the scenario + a "step" counter that advances over time.
  // Scenarios: full | onboarding | order-status | admin

  const [step, setStep] = React.useState(0);
  const [showTyping, setShowTyping] = React.useState(false);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [step, showTyping]);

  // React to TWA actions - if user pays, advance to status track
  React.useEffect(() => {
    if (twaState && twaState.justPaid && scenario === 'full') {
      setStep(s => Math.max(s, 7));
    }
  }, [twaState, scenario]);

  const messages = React.useMemo(() => {
    if (scenario === 'admin') {
      // TZ §06 /add — 6 steps: фото → назва → ціна → категорія → склад → підтвердження.
      return [
        {t:'date', body:'15 квітня · Адмін чат'},
        {t:'user', body:'/add'},
        {t:'bot', body:lang==='ua'?'<b>КРОК 1/6 — ФОТО</b>\n📸 Надішліть фото букету. Бажано квадрат або портрет.':'<b>STEP 1/6 — PHOTO</b>\n📸 Send a photo of the bouquet.'},
        {t:'user', body:'← [Фото надіслано]'},
        {t:'bot', body:lang==='ua'?'✅ Фото збережено!\n\n<b>КРОК 2/6 — НАЗВА</b>\n✏️ Введіть назву позиції:':'✅ Saved!\n\n<b>STEP 2/6 — NAME</b>\n✏️ Enter the name:'},
        {t:'user', body:lang==='ua'?'Лимонна цедра':'Lemon zest'},
        {t:'bot', body:lang==='ua'?'<b>КРОК 3/6 — ЦІНА</b>\n💰 Вкажіть ціну в гривнях (тільки цифри):':'<b>STEP 3/6 — PRICE</b>\n💰 Enter price (digits only):'},
        {t:'user', body:'640'},
        {t:'bot', body:lang==='ua'?'<b>КРОК 4/6 — КАТЕГОРІЯ</b>\n📂 Оберіть:':'<b>STEP 4/6 — CATEGORY</b>\n📂 Pick:', kb:['💐 Готові букети','🌹 Поштучно','🎀 Декор','🌿 Зелень']},
        {t:'user', body:'💐 Готові букети'},
        {t:'bot', body:lang==='ua'?'<b>КРОК 5/6 — СКЛАД / ТЕГИ</b>\n📝 Опишіть склад (побачить покупець):\n\nПриклад: Піони 5шт, евкаліпт, крафт':'<b>STEP 5/6 — COMPOSITION</b>\n📝 Describe (visible to customers).'},
        {t:'user', body:lang==='ua'?'Тюльпани жовті 11шт, ромашки 5шт, крафт':'Yellow tulips 11pcs, daisies 5pcs, kraft'},
        {t:'bot', body:lang==='ua'?'<b>КРОК 6/6 — ПІДТВЕРДЖЕННЯ</b>\nПеревірте:\n📌 Лимонна цедра\n💰 640 грн · 💐 Готові букети\n📝 Тюльпани 11шт, ромашки 5шт, крафт':'<b>STEP 6/6 — CONFIRM</b>\nReview:\n📌 Lemon zest\n💰 ₴640 · 💐 Bouquets\n📝 11 tulips, 5 daisies, kraft', kb:['✅ Опублікувати','✏️ Редагувати','❌ Скасувати']},
        {t:'user', body:'✅ Опублікувати'},
        {t:'bot', body:lang==='ua'?'✓ Букет «Лимонна цедра» додано в каталог. Видно в TWA для всіх клієнтів.':'✓ "Lemon zest" added to catalog.'},
        {t:'card-admin'},
        {t:'bot', body:lang==='ua'?'Сьогодні: 14 замовлень, 12 800 грн. Топ — Ніжність (5).':'Today: 14 orders, ₴12,800. Top — Tenderness (5).', kb:['📊 Деталі','📦 Замовлення']},
      ];
    }
    if (scenario === 'onboarding') {
      return [
        {t:'date', body:'Сьогодні'},
        {t:'bot', body:T.welcome+'\n\n'+T.welcomeBody, kb:[T.btnPickBouquet, T.btnBuildOwn, T.btnDates]},
        {t:'user', body:T.btnPickBouquet},
        {t:'bot', body:T.askOccasion, kb:[T.occLover, T.occMom, T.occBday, T.occOffice, T.occJust]},
        {t:'user', body:T.occLover},
        {t:'bot', body:lang==='ua'?'Чудово. Зараз відкриємо застосунок — там можна свайпати картки, як у Tinder. Це триватиме 1 хвилину.':'Nice. Opening the app — you\'ll swipe cards like in Tinder. Takes about a minute.', webApp:T.openApp},
      ];
    }
    // full = onboarding + order status
    return [
      {t:'date', body:'Сьогодні'},
      {t:'bot', body:T.welcome+'\n\n'+T.welcomeBody, kb:[T.btnPickBouquet, T.btnBuildOwn, T.btnDates]},
      {t:'user', body:T.btnPickBouquet},
      {t:'bot', body:T.askOccasion, kb:[T.occLover, T.occMom, T.occBday, T.occOffice, T.occJust]},
      {t:'user', body:T.occLover},
      {t:'bot', body:lang==='ua'?'Чудово. Зараз відкриємо застосунок — там можна свайпати картки.':'Nice. Opening the app — you\'ll swipe cards.', webApp:T.openApp},
      {t:'user', body:T.youSwipeStarted},
      // After payment (step 7+):
      {t:'bot', body:lang==='ua'?'✨ Замовлення №2641 прийнято! Сплачено 930 грн через LiqPay.':'✨ Order #2641 received! Paid ₴930 via LiqPay.'},
      {t:'card-status', stage:0},
      {t:'bot', body:lang==='ua'?'Флорист почав збирати ваш букет 🌿':'Florist started crafting your bouquet 🌿'},
      {t:'card-status', stage:1},
      {t:'bot', body:lang==='ua'?'Готово! Кур\'єр вже виїхав. ETA — 18 хв.':'Ready! Courier dispatched. ETA — 18 min.', kb:[lang==='ua'?'📍 Трекінг':'📍 Track', lang==='ua'?'💬 Зв\'язок':'💬 Contact']},
      {t:'card-status', stage:3},
      {t:'bot', body:lang==='ua'?'Букет вручено! 💐 Як вам?':'Delivered! 💐 How was it?', kb:['⭐⭐⭐⭐⭐','⭐⭐⭐⭐','📝 Відгук']},
    ];
  }, [scenario, lang, T]);

  // Auto-advance timeline
  React.useEffect(() => {
    setStep(0);
    setShowTyping(false);
    let cancelled = false;
    let i = 0;
    const advance = () => {
      if (cancelled) return;
      if (i >= messages.length) return;
      const msg = messages[i];
      const isBot = msg.t === 'bot' || msg.t?.startsWith('card');
      const delay = isBot ? 1100 : 700;
      if (isBot) setShowTyping(true);
      setTimeout(() => {
        if (cancelled) return;
        setShowTyping(false);
        setStep(s => Math.max(s, i + 1));
        i++;
        // Pause longer at "open app" web button so user sees it
        const isAppPrompt = messages[i-1]?.webApp;
        const next = isAppPrompt ? 4000 : 800;
        setTimeout(advance, next);
      }, delay);
    };
    advance();
    return () => { cancelled = true; };
  }, [scenario, lang]);

  const visibleMessages = messages.slice(0, step);
  // For "full" scenario, gate post-payment messages behind twaState.justPaid
  const gated = scenario === 'full' ? visibleMessages.filter((m,idx) => idx < 7 || (twaState && twaState.justPaid)) : visibleMessages;

  const handleKb = (label) => {
    if (label === T.openApp || /open|відкр/i.test(label)) onOpenApp && onOpenApp();
  };

  return (
    <div ref={scrollRef} style={tgStyles.body}>
      {gated.map((m,i) => {
        if (m.t === 'date') return <DateLbl key={i}>{m.body}</DateLbl>;
        if (m.t === 'user') return <UserMsg key={i}>{m.body}</UserMsg>;
        if (m.t === 'card-status') return <StatusCard key={i} stage={m.stage} items={[{name:lang==='ua'?'Ніжність':'Tenderness'}]} total={930} T={T}/>;
        if (m.t === 'card-admin') return (
          <div key={i} style={tgStyles.card}>
            <div style={{...tgStyles.cardImg, height:90, background:'linear-gradient(160deg, #e8c454 0%, #f4e3bb 60%, #5d8a3e 100%)'}}>
              <div style={{position:'absolute',inset:0}}><PetalBackdrop palette={['#e8c454','#fafafa','#5d8a3e']} opacity={0.4}/></div>
              <div style={{position:'relative',zIndex:2}}><Bouquet palette={['#e8c454','#fafafa','#5d8a3e']} composition={[{f:'tulip-yellow',n:5},{f:'daisy',n:3}]} size={70}/></div>
            </div>
            <div style={tgStyles.cardBody}>
              <div style={tgStyles.cardTitle}>{lang==='ua'?'Лимонна цедра':'Lemon zest'} · #b12</div>
              <div style={tgStyles.cardDesc}>640 грн · {lang==='ua'?'Активний':'Active'}</div>
            </div>
          </div>
        );
        return (
          <BotMsg key={i} kb={m.kb} webApp={m.webApp} onKb={handleKb} onApp={onOpenApp}>
            {m.body.split('\n').map((line,j)=>(
              <div key={j} style={{marginTop:j?6:0}}>{line}</div>
            ))}
          </BotMsg>
        );
      })}
      {showTyping && <Typing/>}
    </div>
  );
};

window.TgConversation = TgConversation;
