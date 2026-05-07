// Phone frame — iOS-style, used for the TWA on the right side.
const phoneStyles = {
  shell: {
    position:'relative',
    width:380,
    height:780,
    borderRadius:54,
    background:'#0e1a0a',
    padding:14,
    boxShadow:'0 40px 100px rgba(14,26,10,0.35), 0 0 0 1px rgba(14,26,10,0.5), inset 0 0 0 2px rgba(255,255,255,0.04)',
    flexShrink:0,
  },
  screen: {
    position:'relative',
    width:'100%',
    height:'100%',
    borderRadius:42,
    overflow:'hidden',
    background:'#faf8f2',
    display:'flex',
    flexDirection:'column',
  },
  notch: {
    position:'absolute',
    top:8,
    left:'50%',
    transform:'translateX(-50%)',
    width:108,
    height:30,
    background:'#000',
    borderRadius:18,
    zIndex:50,
  },
  statusBar: {
    height:38,
    paddingTop:12,
    paddingLeft:28,
    paddingRight:28,
    display:'flex',
    justifyContent:'space-between',
    alignItems:'center',
    fontFamily:'Jost, sans-serif',
    fontSize:14,
    fontWeight:600,
    color:'#1a1a1a',
    flexShrink:0,
    zIndex:20,
    position:'relative',
  },
  statusBarDark: { color:'#fff' },
  signalIcons: {
    display:'flex',
    alignItems:'center',
    gap:5,
  },
};

const StatusBar = ({ time='9:41', dark=false }) => (
  <div style={{...phoneStyles.statusBar, ...(dark?phoneStyles.statusBarDark:{})}}>
    <div>{time}</div>
    <div style={phoneStyles.signalIcons}>
      <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="0.5" fill="currentColor"/><rect x="4" y="4" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="8" y="2" width="3" height="8" rx="0.5" fill="currentColor"/><rect x="12" y="0" width="3" height="10" rx="0.5" fill="currentColor"/></svg>
      <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 9.5c.7 0 1.3-.6 1.3-1.3S7.7 6.9 7 6.9s-1.3.6-1.3 1.3.6 1.3 1.3 1.3zM2.5 5C3.7 3.8 5.3 3.1 7 3.1s3.3.7 4.5 1.9l1.1-1.1C11.1 2.4 9.1 1.6 7 1.6S2.9 2.4 1.4 3.9L2.5 5z" fill="currentColor"/></svg>
      <svg width="24" height="10" viewBox="0 0 24 10"><rect x="0.5" y="0.5" width="20" height="9" rx="2.5" fill="none" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="14" height="6" rx="1" fill="currentColor"/><rect x="21" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.4"/></svg>
    </div>
  </div>
);

const PhoneFrame = ({ children, dark=false }) => (
  <div style={phoneStyles.shell}>
    <div style={phoneStyles.notch}></div>
    <div style={phoneStyles.screen}>
      <StatusBar dark={dark}/>
      <div className="phone-scroll no-bounce" style={{flex:1, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column'}}>
        {children}
      </div>
    </div>
  </div>
);

window.PhoneFrame = PhoneFrame;
window.StatusBar = StatusBar;
