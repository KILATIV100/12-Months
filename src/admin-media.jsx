// Admin Media Library — file-manager style page for managing photos
// of flowers, vases (containers/bases), and real bouquet photos.
// Per-item galleries: each catalog item can have multiple photos with one "primary".

const AdminMedia = ({ lang }) => {
  const [folder, setFolder] = React.useState('bouquets'); // bouquets | flowers | vases | cards
  const [selected, setSelected] = React.useState(null);   // item id selected for gallery view
  const [view, setView] = React.useState('grid');         // grid | list
  const [uploading, setUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Persistent state — uploaded files per (folder, itemId)
  const [library, setLibrary] = React.useState(() => {
    // Seed with mocked counts so it looks lived-in
    return {
      bouquets: {
        b1:  { primary:0, photos:[{n:'tenderness-01.jpg',w:'420',h:'520',date:'02 тра',hash:'#dda8ad'},{n:'tenderness-02.jpg',w:'420',h:'520',date:'02 тра',hash:'#f5dde0'},{n:'tenderness-03.jpg',w:'420',h:'420',date:'02 тра',hash:'#8aab6e'}] },
        b2:  { primary:0, photos:[{n:'morning-01.jpg',w:'420',h:'520',date:'28 кві',hash:'#eaa280'},{n:'morning-02.jpg',w:'420',h:'420',date:'28 кві',hash:'#f5d6c0'}] },
        b3:  { primary:0, photos:[{n:'field-01.jpg',w:'420',h:'520',date:'24 кві',hash:'#fafafa'}] },
        b4:  { primary:0, photos:[{n:'cloud-01.jpg',w:'420',h:'520',date:'22 кві',hash:'#a9c4e4'},{n:'cloud-02.jpg',w:'420',h:'420',date:'22 кві',hash:'#d4e0ee'},{n:'cloud-03.jpg',w:'420',h:'520',date:'22 кві',hash:'#f5f0e8'},{n:'cloud-04.jpg',w:'420',h:'420',date:'22 кві',hash:'#a9c4e4'}] },
        b5:  { primary:0, photos:[{n:'caramel-01.jpg',w:'420',h:'520',date:'18 кві',hash:'#e89478'}] },
        b6:  { primary:0, photos:[] },
        b7:  { primary:0, photos:[{n:'sunny-01.jpg',w:'420',h:'420',date:'14 кві',hash:'#e8c454'}] },
        b8:  { primary:0, photos:[{n:'classic-01.jpg',w:'420',h:'520',date:'10 кві',hash:'#c14b50'},{n:'classic-02.jpg',w:'420',h:'520',date:'10 кві',hash:'#dda8ad'}] },
        b9:  { primary:0, photos:[] },
        b10: { primary:0, photos:[{n:'pumpkin-01.jpg',w:'420',h:'420',date:'05 кві',hash:'#eaa280'}] },
        b11: { primary:0, photos:[{n:'midnight-01.jpg',w:'420',h:'520',date:'01 кві',hash:'#1c3610'}] },
        b12: { primary:0, photos:[] },
      },
      flowers: {
        'peony-pink':  { primary:0, photos:[{n:'peony-01.jpg',w:'420',h:'420',date:'03 тра',hash:'#dda8ad'},{n:'peony-02.jpg',w:'420',h:'520',date:'03 тра',hash:'#f5dde0'}] },
        'rose-coral':  { primary:0, photos:[{n:'rose-coral-01.jpg',w:'420',h:'420',date:'01 тра',hash:'#e89478'}] },
        'rose-white':  { primary:0, photos:[{n:'rose-white-01.jpg',w:'420',h:'420',date:'29 кві',hash:'#f5f0e8'}] },
        'tulip-yellow':{ primary:0, photos:[{n:'tulip-01.jpg',w:'420',h:'520',date:'27 кві',hash:'#e8c454'}] },
        'ranunc-peach':{ primary:0, photos:[] },
        'hydrangea':   { primary:0, photos:[{n:'hydrangea-01.jpg',w:'420',h:'420',date:'25 кві',hash:'#a9c4e4'}] },
        'lisianthus':  { primary:0, photos:[] },
        'daisy':       { primary:0, photos:[{n:'daisy-01.jpg',w:'420',h:'420',date:'22 кві',hash:'#fafafa'}] },
        'eucalyptus':  { primary:0, photos:[{n:'euc-01.jpg',w:'420',h:'520',date:'20 кві',hash:'#8aab6e'}] },
        'fern':        { primary:0, photos:[] },
        'ruscus':      { primary:0, photos:[] },
      },
      vases: {
        'kraft':  { primary:0, photos:[{n:'kraft-01.jpg',w:'420',h:'420',date:'15 кві',hash:'#b89968'},{n:'kraft-02.jpg',w:'420',h:'520',date:'15 кві',hash:'#9a7848'}] },
        'box':    { primary:0, photos:[{n:'box-01.jpg',w:'420',h:'420',date:'15 кві',hash:'#1c3610'}] },
        'basket': { primary:0, photos:[{n:'basket-01.jpg',w:'420',h:'420',date:'15 кві',hash:'#9a7848'}] },
        'vase-glass': { primary:0, photos:[], _custom:{name:{ua:'Скляна ваза',en:'Glass vase'},color:'#a9c4e4'} },
        'vase-ceramic': { primary:0, photos:[], _custom:{name:{ua:'Керамічна ваза',en:'Ceramic vase'},color:'#f5f0e8'} },
      },
      cards: {
        'card-romantic': { primary:0, photos:[{n:'card-rom-01.jpg',w:'420',h:'300',date:'10 кві',hash:'#dda8ad'}], _custom:{name:{ua:'Романтична листівка',en:'Romantic card'},color:'#dda8ad'} },
        'card-bday':     { primary:0, photos:[], _custom:{name:{ua:'З Днем Народження',en:'Happy Birthday'},color:'#c8a84b'} },
        'card-thanks':   { primary:0, photos:[], _custom:{name:{ua:'Дякую',en:'Thank you'},color:'#8aab6e'} },
      },
    };
  });

  const folders = [
    { id:'bouquets', l:lang==='ua'?'Готові букети':'Bouquets', i:'❀', desc:lang==='ua'?'Реальні фото для каталогу':'Real photos for catalog' },
    { id:'flowers',  l:lang==='ua'?'Квіти':'Flowers', i:'✿', desc:lang==='ua'?'Фото квітів для конструктора':'Flower photos for builder' },
    { id:'vases',    l:lang==='ua'?'Вази та обгортка':'Vases & wraps', i:'⌬', desc:lang==='ua'?'Контейнери та обгортки':'Containers & wraps' },
    { id:'cards',    l:lang==='ua'?'Листівки':'Cards', i:'✉', desc:lang==='ua'?'Шаблони листівок':'Card templates' },
  ];

  // Build items list for current folder
  const items = React.useMemo(() => {
    if (folder === 'bouquets') {
      return window.MOCK.BOUQUETS.map(b => ({ id:b.id, name:b.name, color:b.palette[0], palette:b.palette, sub:`${b.price} грн`, type:'bouquet', src:b }));
    }
    if (folder === 'flowers') {
      return [...window.MOCK.FLOWERS, ...window.MOCK.GREENS].map(f => ({ id:f.id, name:f.name, color:f.color, sub:`${f.price} грн/${lang==='ua'?'шт':'pc'}`, type:'flower', src:f }));
    }
    if (folder === 'vases') {
      const built = window.MOCK.BASES.map(b => ({ id:b.id, name:b.name, color:b.color, sub:`${b.price} грн`, type:'vase', src:b }));
      const custom = Object.entries(library.vases).filter(([k,v])=>v._custom).map(([k,v])=>({ id:k, name:v._custom.name, color:v._custom.color, sub:lang==='ua'?'кастом':'custom', type:'vase' }));
      return [...built, ...custom];
    }
    // cards
    return Object.entries(library.cards).map(([k,v])=>({ id:k, name:v._custom.name, color:v._custom.color, sub:lang==='ua'?'шаблон':'template', type:'card' }));
  }, [folder, lang, library]);

  const folderData = library[folder] || {};

  // Stats for header
  const totalPhotos = Object.values(folderData).reduce((s,v)=>s+(v.photos?.length||0),0);
  const itemsWithPhotos = Object.values(folderData).filter(v=>(v.photos?.length||0)>0).length;
  const itemsTotal = items.length;
  const missing = itemsTotal - itemsWithPhotos;

  // ── Upload handler — accepts FileList, generates object-URLs
  const handleFiles = (fileList, targetItemId) => {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    setTimeout(() => {
      setLibrary(prev => {
        const next = {...prev, [folder]: {...prev[folder]}};
        const itemId = targetItemId || (selected ? selected.id : 'unsorted');
        const cur = next[folder][itemId] || { primary:0, photos:[] };
        const newPhotos = files.map(f => ({
          n: f.name, w:'420', h:'520',
          date: lang==='ua'?'щойно':'just now',
          url: URL.createObjectURL(f),
          size: Math.round(f.size/1024),
        }));
        next[folder][itemId] = {
          ...cur,
          photos: [...cur.photos, ...newPhotos],
        };
        return next;
      });
      setUploading(false);
    }, 600);
  };

  // ── Drop handlers
  const onDrop = (e, targetItemId) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files, targetItemId);
  };
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  // ── Photo render — uses uploaded URL or placeholder gradient
  const PhotoTile = ({ photo, isPrimary, onSetPrimary, onDelete, large }) => (
    <div style={{
      position:'relative', borderRadius:10, overflow:'hidden',
      aspectRatio: photo.w/photo.h, background:`linear-gradient(135deg, ${photo.hash||'#dda8ad'}, ${photo.hash?photo.hash+'88':'#f5dde0'})`,
      border: isPrimary ? '2px solid #8aab6e' : '1px solid rgba(14,26,10,0.06)',
      cursor:'pointer',
    }}>
      {photo.url ? (
        <img src={photo.url} alt={photo.n} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
      ) : (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <PhotoPlaceholder color={photo.hash}/>
        </div>
      )}
      {isPrimary && (
        <div style={{position:'absolute',top:6,left:6,padding:'3px 8px',background:'#8aab6e',color:'#fff',fontSize:9,fontFamily:'"DM Mono",monospace',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',borderRadius:100}}>
          ★ {lang==='ua'?'основне':'primary'}
        </div>
      )}
      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'6px 8px',background:'linear-gradient(to top, rgba(14,26,10,0.7), transparent)',color:'#fff',fontSize:10,fontFamily:'"DM Mono",monospace',display:'flex',justifyContent:'space-between'}}>
        <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'70%'}}>{photo.n}</span>
        <span>{photo.date}</span>
      </div>
      <div className="photo-actions" style={{position:'absolute',top:6,right:6,display:'flex',gap:4,opacity:0,transition:'opacity 0.15s'}}>
        {!isPrimary && <div onClick={(e)=>{e.stopPropagation();onSetPrimary&&onSetPrimary();}} title={lang==='ua'?'Зробити основним':'Set primary'} style={{width:24,height:24,borderRadius:6,background:'rgba(255,255,255,0.92)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,cursor:'pointer'}}>★</div>}
        <div onClick={(e)=>{e.stopPropagation();onDelete&&onDelete();}} title={lang==='ua'?'Видалити':'Delete'} style={{width:24,height:24,borderRadius:6,background:'rgba(193,75,80,0.92)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,cursor:'pointer'}}>✕</div>
      </div>
    </div>
  );

  // If selected — show item gallery view
  if (selected) {
    const data = folderData[selected.id] || { primary:0, photos:[] };
    return (
      <div>
        {/* Breadcrumb */}
        <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#666',marginBottom:14,fontFamily:'"DM Mono",monospace',letterSpacing:'0.04em'}}>
          <span onClick={()=>setSelected(null)} style={{cursor:'pointer',color:'#8aab6e'}}>{folders.find(f=>f.id===folder).l}</span>
          <span>/</span>
          <span style={{color:'#1c3610',fontWeight:500}}>{selected.name[lang]}</span>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:64,height:64,borderRadius:14,background:`linear-gradient(135deg,${selected.color},${selected.palette?selected.palette[1]:selected.color}66)`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {selected.type==='bouquet' && <Bouquet palette={selected.palette} composition={selected.src.composition} size={56}/>}
              {selected.type==='flower' && <div style={{width:36,height:36,borderRadius:'50%',background:selected.color,boxShadow:'inset -3px -3px 8px rgba(0,0,0,0.1)'}}></div>}
              {selected.type!=='bouquet'&&selected.type!=='flower' && <div style={{width:36,height:36,borderRadius:6,background:selected.color}}></div>}
            </div>
            <div>
              <div style={adminStyles.pageTitle}>{selected.name[lang]}</div>
              <div style={adminStyles.pageSub}>{data.photos.length} {lang==='ua'?'фото':'photos'} · {selected.sub}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <div style={adminStyles.topAction} onClick={()=>fileInputRef.current?.click()}>📁 {lang==='ua'?'Обрати файли':'Choose files'}</div>
            <div style={adminStyles.topPrimary} onClick={()=>fileInputRef.current?.click()}>＋ {lang==='ua'?'Завантажити фото':'Upload photos'}</div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files, selected.id)}/>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={(e)=>onDrop(e, selected.id)}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          style={{
            border: `2px dashed ${dragOver?'#8aab6e':'rgba(14,26,10,0.15)'}`,
            background: dragOver ? 'rgba(138,171,110,0.08)' : '#faf8f2',
            borderRadius: 14, padding:'30px 20px', textAlign:'center',
            marginBottom:18, transition:'all 0.15s', cursor:'pointer',
          }}
          onClick={()=>fileInputRef.current?.click()}>
          {uploading ? (
            <>
              <div style={{fontSize:32,marginBottom:8}}>⏳</div>
              <div style={{fontSize:13,color:'#1c3610',fontWeight:500}}>{lang==='ua'?'Завантажуємо...':'Uploading...'}</div>
            </>
          ) : (
            <>
              <div style={{fontSize:32,marginBottom:8,opacity:0.5}}>📥</div>
              <div style={{fontSize:13,color:'#1c3610',fontWeight:500,marginBottom:3}}>{lang==='ua'?'Перетягніть фото сюди':'Drop photos here'}</div>
              <div style={{fontSize:11,color:'#888'}}>{lang==='ua'?'або натисніть, щоб обрати з комп\'ютера':'or click to choose from your computer'} · JPG, PNG, WebP · {lang==='ua'?'до 10 МБ':'up to 10 MB'}</div>
            </>
          )}
        </div>

        {/* Photos grid */}
        {data.photos.length > 0 ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
            {data.photos.map((p,i)=>(
              <div key={i} className="photo-tile" onMouseEnter={(e)=>{const a=e.currentTarget.querySelector('.photo-actions'); if(a)a.style.opacity=1;}} onMouseLeave={(e)=>{const a=e.currentTarget.querySelector('.photo-actions'); if(a)a.style.opacity=0;}}>
                <PhotoTile
                  photo={p}
                  isPrimary={i===data.primary}
                  onSetPrimary={()=>setLibrary(prev=>({...prev,[folder]:{...prev[folder],[selected.id]:{...prev[folder][selected.id],primary:i}}}))}
                  onDelete={()=>setLibrary(prev=>{
                    const cur = prev[folder][selected.id];
                    const newPhotos = cur.photos.filter((_,j)=>j!==i);
                    const newPrimary = cur.primary===i ? 0 : (cur.primary>i?cur.primary-1:cur.primary);
                    return {...prev,[folder]:{...prev[folder],[selected.id]:{photos:newPhotos,primary:newPrimary}}};
                  })}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{...adminStyles.card,textAlign:'center',padding:'40px 20px',color:'#888'}}>
            <div style={{fontSize:40,opacity:0.3,marginBottom:8}}>📷</div>
            <div style={{fontSize:14,color:'#1c3610',fontWeight:500,marginBottom:4}}>{lang==='ua'?'Поки що немає фото':'No photos yet'}</div>
            <div style={{fontSize:11.5,color:'#888'}}>{lang==='ua'?'Завантажте перше фото вище — клієнти побачать його у Telegram-каталозі':'Upload the first photo above — customers will see it in the Telegram catalog'}</div>
          </div>
        )}

        {/* Tips */}
        <div style={{...adminStyles.card,marginTop:14,background:'rgba(138,171,110,0.06)',border:'1px solid rgba(138,171,110,0.2)'}}>
          <div style={{fontSize:11,color:'#4a7c2f',fontFamily:'"DM Mono",monospace',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8,fontWeight:600}}>💡 {lang==='ua'?'Поради':'Tips'}</div>
          <ul style={{margin:0,paddingLeft:18,fontSize:12.5,color:'#1c3610',lineHeight:1.7}}>
            <li>{lang==='ua'?'Найкраще працюють фото на світлому фоні (білий або кремовий)':'Photos on a light background (white or cream) work best'}</li>
            <li>{lang==='ua'?'Перше "основне" фото показується у каталозі — оберіть найкраще':'The "primary" photo is shown in the catalog — pick the best one'}</li>
            <li>{lang==='ua'?selected.type==='bouquet'?'Додайте 3–5 ракурсів: загальний, зверху, деталі квітів':'Add 3–5 angles: full shot, top-down, flower details':lang==='ua'?'Достатньо 1–2 фото — рівне освітлення без тіней':'1–2 photos is enough — even light, no shadows'}</li>
          </ul>
        </div>
      </div>
    );
  }

  // ── Folder/grid view
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={adminStyles.pageTitle}>{lang==='ua'?'Медіа':'Media'}</div>
          <div style={adminStyles.pageSub}>{lang==='ua'?'Усі фотографії магазину. Клієнти бачать їх у Telegram — у каталозі, конструкторі, листівках.':'All shop photos. Customers see them in Telegram — catalog, builder, cards.'}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={adminStyles.topAction}>📁 {lang==='ua'?'Папка':'New folder'}</div>
          <div style={adminStyles.topPrimary} onClick={()=>fileInputRef.current?.click()}>📥 {lang==='ua'?'Завантажити':'Upload'}</div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files, 'unsorted')}/>
        </div>
      </div>

      {/* Folder tabs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {folders.map(f=>{
          const fdata = library[f.id] || {};
          const photos = Object.values(fdata).reduce((s,v)=>s+(v.photos?.length||0),0);
          const active = folder===f.id;
          return (
            <div key={f.id} onClick={()=>{setFolder(f.id); setSelected(null);}} style={{
              padding:'14px 16px', borderRadius:14, cursor:'pointer',
              background: active ? '#0e1a0a' : '#fff',
              color: active ? '#faf8f2' : '#1c3610',
              border: active ? 'none' : '1px solid rgba(14,26,10,0.06)',
              transition:'all 0.15s',
            }}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:22,opacity:active?0.9:0.7}}>{f.i}</span>
                <span style={{fontFamily:'"DM Mono",monospace',fontSize:10,letterSpacing:'0.06em',color:active?'rgba(250,248,242,0.6)':'#8aab6e',padding:'2px 7px',background:active?'rgba(250,248,242,0.1)':'rgba(138,171,110,0.12)',borderRadius:100,fontWeight:600}}>{photos} {lang==='ua'?'фото':'photos'}</span>
              </div>
              <div style={{fontFamily:'"Cormorant Garamond",serif',fontSize:20,fontWeight:500,lineHeight:1.1,marginBottom:2}}>{f.l}</div>
              <div style={{fontSize:11,opacity:active?0.65:0.55,lineHeight:1.4}}>{f.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Stats bar */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'10px 14px',background:'#fff',borderRadius:10,border:'1px solid rgba(14,26,10,0.06)',marginBottom:12,fontSize:12}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#8aab6e'}}></span>
          <span style={{color:'#666'}}>{lang==='ua'?'З фото':'With photos'}:</span>
          <b style={{color:'#1c3610'}}>{itemsWithPhotos} / {itemsTotal}</b>
        </div>
        {missing>0 && (
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'#c14b50'}}></span>
            <span style={{color:'#666'}}>{lang==='ua'?'Без фото':'Missing'}:</span>
            <b style={{color:'#c14b50'}}>{missing}</b>
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{color:'#666'}}>{lang==='ua'?'Загалом':'Total'}:</span>
          <b style={{color:'#1c3610'}}>{totalPhotos} {lang==='ua'?'фото':'photos'}</b>
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:4,background:'#f5f1e8',padding:3,borderRadius:7}}>
          {[{id:'grid',i:'▦'},{id:'list',i:'≡'}].map(v=>(
            <div key={v.id} onClick={()=>setView(v.id)} style={{padding:'4px 10px',fontSize:13,cursor:'pointer',borderRadius:5,background:view===v.id?'#fff':'transparent',color:view===v.id?'#0e1a0a':'#888'}}>{v.i}</div>
          ))}
        </div>
      </div>

      {/* Items grid (each item shows its primary photo or placeholder) */}
      {view==='grid' ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
          {items.map(it=>{
            const data = folderData[it.id] || { primary:0, photos:[] };
            const primary = data.photos[data.primary];
            const count = data.photos.length;
            return (
              <div key={it.id} onClick={()=>setSelected(it)}
                onDrop={(e)=>onDrop(e, it.id)}
                onDragOver={(e)=>{e.preventDefault(); e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.boxShadow='0 0 0 2px #8aab6e';}}
                onDragLeave={(e)=>{e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='';}}
                style={{
                  background:'#fff', borderRadius:12, overflow:'hidden',
                  border:'1px solid rgba(14,26,10,0.06)', cursor:'pointer',
                  transition:'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e=>{if(!e.currentTarget.style.transform){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 16px rgba(14,26,10,0.06)';}}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                <div style={{aspectRatio:'1', background: primary ? `linear-gradient(135deg,${primary.hash||it.color},${(primary.hash||it.color)}88)` : '#f5f1e8',position:'relative',overflow:'hidden'}}>
                  {primary ? (
                    primary.url ? (
                      <img src={primary.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <PhotoPlaceholder color={primary.hash} item={it}/>
                      </div>
                    )
                  ) : (
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#aaa'}}>
                      <div style={{fontSize:28,opacity:0.4}}>📷</div>
                      <div style={{fontSize:10,marginTop:4,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em'}}>{lang==='ua'?'без фото':'no photo'}</div>
                    </div>
                  )}
                  {count>0 && (
                    <div style={{position:'absolute',top:6,right:6,padding:'3px 7px',background:'rgba(14,26,10,0.7)',color:'#fff',fontSize:10,fontFamily:'"DM Mono",monospace',borderRadius:100,backdropFilter:'blur(4px)'}}>×{count}</div>
                  )}
                  {!count && (
                    <div style={{position:'absolute',top:6,right:6,padding:'3px 7px',background:'#c14b50',color:'#fff',fontSize:9,fontFamily:'"DM Mono",monospace',letterSpacing:'0.05em',textTransform:'uppercase',borderRadius:100,fontWeight:600}}>!</div>
                  )}
                </div>
                <div style={{padding:'10px 12px'}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#1c3610',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{it.name[lang]}</div>
                  <div style={{fontSize:10.5,color:'#888',marginTop:2,fontFamily:'"DM Mono",monospace',letterSpacing:'0.04em'}}>{it.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{...adminStyles.card,padding:0,overflow:'hidden'}}>
          <table style={adminStyles.table}>
            <thead><tr style={{background:'#faf8f2'}}>
              <th style={adminStyles.th}>{lang==='ua'?'Елемент':'Item'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Фото':'Photos'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Основне':'Primary'}</th>
              <th style={adminStyles.th}>{lang==='ua'?'Оновлено':'Updated'}</th>
              <th style={adminStyles.th}></th>
            </tr></thead>
            <tbody>
              {items.map(it=>{
                const data = folderData[it.id] || { primary:0, photos:[] };
                const last = data.photos[data.photos.length-1];
                return (
                  <tr key={it.id} onClick={()=>setSelected(it)} style={{cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#faf8f2'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={adminStyles.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:8,background:it.color}}></div>
                        <div>
                          <div style={{fontWeight:500,color:'#1c3610'}}>{it.name[lang]}</div>
                          <div style={{fontSize:10.5,color:'#888',fontFamily:'"DM Mono",monospace'}}>{it.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{...adminStyles.td,fontFamily:'"Cormorant Garamond",serif',fontSize:18,fontWeight:500,color:data.photos.length?'#1c3610':'#c14b50'}}>{data.photos.length}</td>
                    <td style={adminStyles.td}>{data.photos.length ? <span style={adminStyles.statusPill('#4a7c2f','rgba(138,171,110,0.18)')}>★ {lang==='ua'?'обрано':'set'}</span> : <span style={adminStyles.statusPill('#a13a3f','rgba(193,75,80,0.13)')}>{lang==='ua'?'нема':'none'}</span>}</td>
                    <td style={{...adminStyles.td,color:'#666',fontFamily:'"DM Mono",monospace',fontSize:11}}>{last?last.date:'—'}</td>
                    <td style={{...adminStyles.td,textAlign:'right',color:'#aaa'}}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {missing>0 && (
        <div style={{...adminStyles.card,marginTop:14,background:'rgba(232,196,84,0.08)',border:'1px solid rgba(232,196,84,0.3)',display:'flex',alignItems:'center',gap:14}}>
          <div style={{fontSize:24}}>⚠</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:'#1c3610',fontWeight:600,marginBottom:2}}>{lang==='ua'?`${missing} ${missing===1?'елемент':'елементів'} без фото`:`${missing} item${missing===1?'':'s'} without photos`}</div>
            <div style={{fontSize:11.5,color:'#666'}}>{lang==='ua'?'Клієнти бачать заглушки замість фото у Telegram. Натисніть на елемент, щоб додати фото.':'Customers see placeholders instead of photos in Telegram. Tap an item to add photos.'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Decorative SVG placeholder when no real upload yet
const PhotoPlaceholder = ({ color='#dda8ad', item }) => (
  <svg viewBox="0 0 100 100" width="80%" height="80%" style={{maxWidth:200,maxHeight:200}}>
    <defs>
      <radialGradient id="pp1" cx="50%" cy="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.7"/>
        <stop offset="100%" stopColor={color} stopOpacity="0.2"/>
      </radialGradient>
    </defs>
    <circle cx="50" cy="50" r="35" fill="url(#pp1)"/>
    <circle cx="42" cy="42" r="14" fill={color} opacity="0.45"/>
    <circle cx="58" cy="48" r="11" fill={color} opacity="0.55"/>
    <circle cx="50" cy="60" r="9" fill={color} opacity="0.4"/>
  </svg>
);

window.AdminMedia = AdminMedia;
