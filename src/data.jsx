// Mock data for the prototype.

const FLOWERS = [
  { id:'peony-pink', name:{ua:'Півонія рожева',en:'Pink peony'}, type:'flower', price:120, color:'#dda8ad', accent:'#f5dde0', shape:'peony', tags:['pastel','round','romantic'] },
  { id:'rose-coral', name:{ua:'Троянда коралова',en:'Coral rose'}, type:'flower', price:90, color:'#e89478', accent:'#f4c4af', shape:'rose', tags:['warm','classic'] },
  { id:'rose-white', name:{ua:'Троянда біла',en:'White rose'}, type:'flower', price:85, color:'#f5f0e8', accent:'#e6dfd0', shape:'rose', tags:['classic','wedding'] },
  { id:'tulip-yellow', name:{ua:'Тюльпан жовтий',en:'Yellow tulip'}, type:'flower', price:55, color:'#e8c454', accent:'#f4e3bb', shape:'tulip', tags:['spring','bright'] },
  { id:'ranunc-peach', name:{ua:'Ранункулюс',en:'Ranunculus'}, type:'flower', price:75, color:'#eaa280', accent:'#f5d6c0', shape:'ranunc', tags:['layered','peach'] },
  { id:'hydrangea', name:{ua:'Гортензія',en:'Hydrangea'}, type:'flower', price:140, color:'#a9c4e4', accent:'#d4e0ee', shape:'hydrangea', tags:['cloud','blue'] },
  { id:'lisianthus', name:{ua:'Еустома',en:'Lisianthus'}, type:'flower', price:80, color:'#c8a2c8', accent:'#e3cbe3', shape:'rose', tags:['lavender'] },
  { id:'daisy', name:{ua:'Ромашка',en:'Daisy'}, type:'flower', price:35, color:'#fafafa', accent:'#fff5b8', shape:'daisy', tags:['field','simple'] },
];

const GREENS = [
  { id:'eucalyptus', name:{ua:'Евкаліпт',en:'Eucalyptus'}, type:'green', price:40, color:'#8aab6e', shape:'euc' },
  { id:'fern', name:{ua:'Папороть',en:'Fern'}, type:'green', price:30, color:'#4a7c2f', shape:'fern' },
  { id:'ruscus', name:{ua:'Рускус',en:'Ruscus'}, type:'green', price:35, color:'#5d8a3e', shape:'ruscus' },
];

const BASES = [
  { id:'kraft', name:{ua:'Крафт',en:'Kraft wrap'}, type:'base', price:80, color:'#b89968', shape:'kraft' },
  { id:'box', name:{ua:'Коробка',en:'Hat box'}, type:'base', price:180, color:'#1c3610', shape:'box' },
  { id:'basket', name:{ua:'Кошик',en:'Basket'}, type:'base', price:220, color:'#9a7848', shape:'basket' },
];

const DECOR = [
  { id:'ribbon-cream', name:{ua:'Стрічка крем',en:'Cream ribbon'}, type:'decor', price:25, color:'#f0ebe0' },
  { id:'ribbon-sage', name:{ua:'Стрічка шавлія',en:'Sage ribbon'}, type:'decor', price:25, color:'#8aab6e' },
];

// Curated bouquets for Tinder + Catalog
const BOUQUETS = [
  { id:'b1', name:{ua:'Ніжність',en:'Tenderness'}, price:850, palette:['#dda8ad','#f5dde0','#8aab6e'], tags:['pastel','romantic'], composition:[{f:'peony-pink',n:5},{f:'eucalyptus',n:3}], occasion:'lover' },
  { id:'b2', name:{ua:'Ранкова кава',en:'Morning brew'}, price:720, palette:['#eaa280','#f5d6c0','#5d8a3e'], tags:['warm','peach'], composition:[{f:'ranunc-peach',n:7},{f:'fern',n:2}], occasion:'just' },
  { id:'b3', name:{ua:'Польова',en:'Field song'}, price:560, palette:['#fafafa','#e8c454','#8aab6e'], tags:['field','spring'], composition:[{f:'daisy',n:9},{f:'tulip-yellow',n:5}], occasion:'mom' },
  { id:'b4', name:{ua:'Хмара',en:'Cloud nine'}, price:1240, palette:['#a9c4e4','#d4e0ee','#f5f0e8'], tags:['cloud','blue'], composition:[{f:'hydrangea',n:3},{f:'rose-white',n:5}], occasion:'lover' },
  { id:'b5', name:{ua:'Карамель',en:'Caramel'}, price:980, palette:['#e89478','#f4c4af','#b89968'], tags:['warm','classic'], composition:[{f:'rose-coral',n:11}], occasion:'bday' },
  { id:'b6', name:{ua:'Лаванда',en:'Lavender'}, price:680, palette:['#c8a2c8','#e3cbe3','#8aab6e'], tags:['lavender','calm'], composition:[{f:'lisianthus',n:7},{f:'eucalyptus',n:3}], occasion:'just' },
  { id:'b7', name:{ua:'Сонячний',en:'Sunny'}, price:520, palette:['#e8c454','#f4e3bb','#5d8a3e'], tags:['bright','spring'], composition:[{f:'tulip-yellow',n:11}], occasion:'office' },
  { id:'b8', name:{ua:'Класика',en:'Classic'}, price:1450, palette:['#c14b50','#dda8ad','#f5f0e8'], tags:['classic','romantic'], composition:[{f:'rose-coral',n:15},{f:'rose-white',n:6}], occasion:'lover' },
  { id:'b9', name:{ua:'Зимовий ранок',en:'Winter morning'}, price:890, palette:['#f5f0e8','#a9c4e4','#8aab6e'], tags:['cool','soft'], composition:[{f:'rose-white',n:7},{f:'eucalyptus',n:5}], occasion:'just' },
  { id:'b10', name:{ua:'Гарбузовий пиріг',en:'Pumpkin pie'}, price:760, palette:['#eaa280','#e8c454','#b89968'], tags:['autumn','warm'], composition:[{f:'ranunc-peach',n:5},{f:'tulip-yellow',n:3}], occasion:'just' },
  { id:'b11', name:{ua:'Опівночі',en:'Midnight'}, price:1100, palette:['#1c3610','#c8a2c8','#dda8ad'], tags:['moody','romantic'], composition:[{f:'lisianthus',n:9},{f:'peony-pink',n:3}], occasion:'lover' },
  { id:'b12', name:{ua:'Лимонна цедра',en:'Lemon zest'}, price:640, palette:['#e8c454','#fafafa','#5d8a3e'], tags:['fresh','bright'], composition:[{f:'tulip-yellow',n:7},{f:'daisy',n:5}], occasion:'office' },
];

const DATES = [
  { id:'d1', label:{ua:'День мами',en:"Mom's day"}, person:{ua:'Мама',en:'Mom'}, date:'2026-05-08', dayDelta:6, color:'#dda8ad', icon:'💐' },
  { id:'d2', label:{ua:'Річниця',en:'Anniversary'}, person:{ua:'Андрій',en:'Andrii'}, date:'2026-05-15', dayDelta:13, color:'#c8a84b', icon:'💍' },
  { id:'d3', label:{ua:'ДН Олі',en:"Olya's bday"}, person:{ua:'Оля',en:'Olya'}, date:'2026-05-22', dayDelta:20, color:'#8aab6e', icon:'🎂' },
  { id:'d4', label:{ua:'ДН Сестри',en:"Sister's bday"}, person:{ua:'Іра',en:'Ira'}, date:'2026-06-03', dayDelta:32, color:'#a9c4e4', icon:'🎁' },
];

const HISTORY = [
  { id:'o1', name:{ua:'Ніжність',en:'Tenderness'}, date:'24 кві', price:850, status:'delivered' },
  { id:'o2', name:{ua:'Карамель',en:'Caramel'}, date:'02 кві', price:980, status:'delivered' },
  { id:'o3', name:{ua:'Польова',en:'Field song'}, date:'14 бер', price:560, status:'delivered' },
];

window.MOCK = { FLOWERS, GREENS, BASES, DECOR, BOUQUETS, DATES, HISTORY };
