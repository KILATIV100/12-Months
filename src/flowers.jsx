// Stylized geometric SVG flowers — used everywhere (Tinder cards, Constructor, Catalog).
// All return <svg> elements; size controlled by parent.

const Flower = ({ shape, color, accent, size=80, sway=false, style={} }) => {
  const animStyle = sway ? { animation:'float 4s ease-in-out infinite', ...style } : style;
  const a = accent || color;
  switch(shape) {
    case 'peony': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <circle cx="50" cy="50" r="32" fill={color} opacity="0.45"/>
        <circle cx="40" cy="42" r="18" fill={a} opacity="0.85"/>
        <circle cx="60" cy="44" r="18" fill={a} opacity="0.85"/>
        <circle cx="50" cy="58" r="18" fill={a} opacity="0.85"/>
        <circle cx="50" cy="50" r="14" fill={color}/>
        <circle cx="50" cy="50" r="6" fill={a}/>
      </svg>
    );
    case 'rose': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <circle cx="50" cy="50" r="30" fill={color}/>
        <circle cx="50" cy="50" r="22" fill={a} opacity="0.7"/>
        <circle cx="50" cy="50" r="14" fill={color}/>
        <circle cx="50" cy="50" r="7" fill={a}/>
        <path d="M 50 35 Q 60 50 50 65 Q 40 50 50 35" fill={a} opacity="0.4"/>
      </svg>
    );
    case 'tulip': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <path d="M 50 25 Q 30 30 32 60 Q 35 75 50 75 Q 65 75 68 60 Q 70 30 50 25 Z" fill={color}/>
        <path d="M 50 25 Q 42 35 44 55 Q 48 70 50 70 Q 52 70 56 55 Q 58 35 50 25 Z" fill={a} opacity="0.5"/>
        <path d="M 50 75 L 50 92" stroke="#5d8a3e" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    );
    case 'ranunc': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <circle cx="50" cy="50" r="30" fill={color} opacity="0.5"/>
        <circle cx="50" cy="50" r="24" fill={a}/>
        <circle cx="50" cy="50" r="18" fill={color} opacity="0.7"/>
        <circle cx="50" cy="50" r="12" fill={a}/>
        <circle cx="50" cy="50" r="6" fill={color}/>
      </svg>
    );
    case 'hydrangea': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        {[[35,35],[55,32],[68,48],[60,66],[40,68],[28,52],[48,48]].map(([x,y],i)=>(
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M -8 0 L 0 -8 L 8 0 L 0 8 Z" fill={i%2 ? a : color}/>
            <circle r="2" fill="#fff" opacity="0.5"/>
          </g>
        ))}
      </svg>
    );
    case 'daisy': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        {[0,45,90,135,180,225,270,315].map(d=>(
          <ellipse key={d} cx="50" cy="30" rx="7" ry="13" fill={color} transform={`rotate(${d} 50 50)`}/>
        ))}
        <circle cx="50" cy="50" r="8" fill={a}/>
      </svg>
    );
    case 'euc': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <path d="M 50 95 L 50 10" stroke={color} strokeWidth="2"/>
        {[20,35,50,65,80].map((y,i)=>(
          <g key={i}>
            <ellipse cx={i%2?38:62} cy={y} rx="9" ry="6" fill={color} opacity="0.85" transform={`rotate(${i%2?-25:25} ${i%2?38:62} ${y})`}/>
          </g>
        ))}
      </svg>
    );
    case 'fern': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <path d="M 50 95 L 50 10" stroke={color} strokeWidth="2"/>
        {[18,30,42,54,66,78].map((y,i)=>{
          const len = 18 - i*1.5;
          return (<g key={i}>
            <path d={`M 50 ${y} Q ${50-len/2} ${y-len/3} ${50-len} ${y}`} stroke={color} strokeWidth="2" fill="none"/>
            <path d={`M 50 ${y} Q ${50+len/2} ${y-len/3} ${50+len} ${y}`} stroke={color} strokeWidth="2" fill="none"/>
          </g>);
        })}
      </svg>
    );
    case 'ruscus': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={animStyle}>
        <path d="M 50 95 L 50 10" stroke={color} strokeWidth="2"/>
        {[20,32,44,56,68].map((y,i)=>(
          <g key={i}>
            <ellipse cx={i%2?34:66} cy={y} rx="11" ry="5" fill={color} transform={`rotate(${i%2?-30:30} ${i%2?34:66} ${y})`}/>
          </g>
        ))}
      </svg>
    );
    case 'kraft': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
        <path d="M 25 40 L 75 40 L 80 90 L 20 90 Z" fill={color} opacity="0.85"/>
        <path d="M 25 40 L 50 25 L 75 40 Z" fill={color}/>
        <path d="M 50 40 L 50 90" stroke="#000" strokeOpacity="0.1" strokeWidth="1"/>
      </svg>
    );
    case 'box': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
        <rect x="20" y="35" width="60" height="55" rx="4" fill={color}/>
        <rect x="20" y="35" width="60" height="10" fill="#fff" opacity="0.15"/>
        <rect x="46" y="20" width="8" height="22" fill={color} opacity="0.7"/>
      </svg>
    );
    case 'basket': return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={style}>
        <path d="M 25 50 Q 50 80 75 50 L 80 85 L 20 85 Z" fill={color}/>
        <path d="M 30 50 Q 50 35 70 50" stroke={color} strokeWidth="3" fill="none"/>
        <path d="M 30 65 L 70 65 M 30 75 L 70 75" stroke="#000" strokeOpacity="0.15" strokeWidth="1"/>
      </svg>
    );
    default: return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={size/3} fill={color}/></svg>;
  }
};

// Composed bouquet illustration: arrange flowers + greens + base
const Bouquet = ({ palette=['#dda8ad','#f5dde0','#8aab6e'], composition=[], size=200, base='kraft' }) => {
  const all = [...(window.MOCK?.FLOWERS||[]), ...(window.MOCK?.GREENS||[])];
  // expand composition
  let parts = [];
  composition.forEach(({f,n}) => {
    const def = all.find(x=>x.id===f);
    if (!def) return;
    for (let i=0;i<Math.min(n,9);i++) parts.push(def);
  });
  // arrange in arc
  const positions = [];
  const total = parts.length;
  parts.forEach((p,i) => {
    // bouquet shape: cluster at top, narrow at bottom
    const ring = i < 3 ? 0 : i < 9 ? 1 : 2;
    const ringCount = ring===0 ? 3 : ring===1 ? 6 : Math.max(1,total-9);
    const ringIdx = ring===0 ? i : ring===1 ? i-3 : i-9;
    const r = ring===0 ? 12 : ring===1 ? 26 : 38;
    const startA = ring===0 ? -90 : ring===1 ? -150 : -160;
    const endA = ring===0 ? -90 : ring===1 ? -30 : -20;
    const t = ringCount<=1 ? 0.5 : ringIdx/(ringCount-1);
    const angle = (startA + (endA-startA)*t) * Math.PI/180;
    positions.push({
      x: 100 + Math.cos(angle)*r,
      y: 90 + Math.sin(angle)*r * 0.85,
      flower: p,
      z: ring,
    });
  });
  // sort by y so back is drawn first
  positions.sort((a,b)=>a.y-b.y);

  const baseDef = (window.MOCK?.BASES||[]).find(b=>b.id===base) || { color:'#b89968', shape:'kraft' };

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{display:'block'}}>
      {/* stems */}
      <g opacity="0.6">
        {positions.map((p,i)=>(
          <line key={i} x1={p.x} y1={p.y+10} x2={100+(p.x-100)*0.2} y2={150} stroke="#5d8a3e" strokeWidth="1.5"/>
        ))}
      </g>
      {/* base */}
      <g transform="translate(60 130) scale(0.8)">
        <Flower shape={baseDef.shape} color={baseDef.color} size={100}/>
      </g>
      {/* flowers */}
      {positions.map((p,i)=>{
        const sz = p.z===0 ? 42 : p.z===1 ? 36 : 30;
        return (
          <g key={i} transform={`translate(${p.x-sz/2} ${p.y-sz/2})`}>
            <Flower shape={p.flower.shape} color={p.flower.color} accent={p.flower.accent} size={sz}/>
          </g>
        );
      })}
    </svg>
  );
};

// Background pattern: distributed petal silhouettes
const PetalBackdrop = ({ palette=['#dda8ad','#f5dde0','#8aab6e'], opacity=0.6 }) => (
  <svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{position:'absolute',inset:0,opacity}}>
    {[
      [50,60,palette[0]],[110,40,palette[1]],[180,80,palette[2]||palette[0]],
      [260,30,palette[1]],[340,70,palette[0]],[80,160,palette[1]],
      [220,170,palette[0]],[320,200,palette[2]||palette[1]],[60,260,palette[0]],
      [180,290,palette[1]],[290,280,palette[0]],[360,330,palette[2]||palette[1]],
      [40,360,palette[1]],[140,360,palette[0]],
    ].map(([x,y,c],i)=>(
      <g key={i} transform={`translate(${x} ${y}) rotate(${(i*53)%360})`}>
        <ellipse rx="14" ry="22" fill={c} opacity="0.55"/>
      </g>
    ))}
  </svg>
);

window.Flower = Flower;
window.Bouquet = Bouquet;
window.PetalBackdrop = PetalBackdrop;
