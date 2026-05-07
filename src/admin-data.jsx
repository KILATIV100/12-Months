// Admin orders mock data + utilities

const ADMIN_ORDERS = [
  { id:2641, customer:{ua:'Олена К.',en:'Olena K.'}, phone:'+380 67 234 12 88', items:'Ніжність', price:930, status:'work', address:'Вул. Хрещатик, 22', time:'14:00', source:'tinder', florist:'Аня', paid:true, courier:null, created:'09:14' },
  { id:2640, customer:{ua:'Андрій М.',en:'Andrii M.'}, phone:'+380 50 122 45 67', items:'Класика · 21 троянда', price:1450, status:'ready', address:'Вул. Володимирська, 14', time:'13:00', source:'catalog', florist:'Юля', paid:true, courier:'Микола', created:'08:42' },
  { id:2639, customer:{ua:'Софія Р.',en:'Sofia R.'}, phone:'+380 93 887 22 11', items:'Ранкова кава', price:720, status:'delivery', address:'Вул. Антоновича, 56', time:'12:30', source:'construct', florist:'Аня', paid:true, courier:'Сергій', created:'07:55' },
  { id:2638, customer:{ua:'Марія Д.',en:'Maria D.'}, phone:'+380 67 555 41 22', items:'Лаванда', price:680, status:'done', address:'Самовивіз', time:'11:00', source:'catalog', florist:'Юля', paid:true, courier:null, created:'07:12' },
  { id:2637, customer:{ua:'Ігор П.',en:'Ihor P.'}, phone:'+380 99 332 88 14', items:'Польова + конверт', price:610, status:'new', address:'Вул. Сагайдачного, 3', time:'15:30', source:'tinder', florist:null, paid:true, courier:null, created:'09:50' },
  { id:2636, customer:{ua:'Катя В.',en:'Katia V.'}, phone:'+380 63 449 12 30', items:'Хмара', price:1240, status:'new', address:'Вул. Ярославів Вал, 8', time:'17:00', source:'construct', florist:null, paid:true, courier:null, created:'10:02' },
  { id:2635, customer:{ua:'Ольга Т.',en:'Olha T.'}, phone:'+380 67 712 09 45', items:'Карамель', price:980, status:'work', address:'Вул. Лесі Українки, 32', time:'16:00', source:'catalog', florist:'Аня', paid:true, courier:null, created:'10:15' },
  { id:2634, customer:{ua:'Юрій С.',en:'Yurii S.'}, phone:'+380 50 998 33 21', items:'Опівночі', price:1100, status:'cancel', address:'Вул. Мазепи, 11', time:'18:00', source:'tinder', florist:null, paid:false, courier:null, created:'10:32' },
];

const ADMIN_CLIENTS = [
  { id:'c1', name:{ua:'Олена Кравчук',en:'Olena Kravchuk'}, tg:'@olena_k', orders:14, ltv:11200, last:'24 кві', segment:'vip' },
  { id:'c2', name:{ua:'Андрій Мельник',en:'Andrii Melnyk'}, tg:'@andrii_m', orders:8, ltv:9420, last:'18 кві', segment:'regular' },
  { id:'c3', name:{ua:'Софія Романюк',en:'Sofia Romaniuk'}, tg:'@sofia_r', orders:3, ltv:2160, last:'02 кві', segment:'new' },
  { id:'c4', name:{ua:'Марія Демченко',en:'Maria Demchenko'}, tg:'@maria_d', orders:22, ltv:18650, last:'29 кві', segment:'vip' },
  { id:'c5', name:{ua:'Ігор Петренко',en:'Ihor Petrenko'}, tg:'@ihor_p', orders:6, ltv:4280, last:'15 кві', segment:'regular' },
  { id:'c6', name:{ua:'Катя Вознюк',en:'Katia Vozniuk'}, tg:'@katia_v', orders:1, ltv:1240, last:'02 тра', segment:'new' },
  { id:'c7', name:{ua:'Ольга Терещенко',en:'Olha Tereschenko'}, tg:'@olha_t', orders:11, ltv:9870, last:'26 кві', segment:'regular' },
];

const ADMIN_REVIEWS = [
  { id:'r1', from:{ua:'Олена К.',en:'Olena K.'}, stars:5, text:{ua:'Букет неймовірний! Свіжі квіти, гарна композиція, доставили вчасно.',en:'Stunning bouquet! Fresh, beautiful composition, on time.'}, order:2620, when:'24 кві' },
  { id:'r2', from:{ua:'Софія Р.',en:'Sofia R.'}, stars:5, text:{ua:'Кохаю цей сервіс. Підписка щотижня — мрія.',en:'Love this service. Weekly subscription is a dream.'}, order:2610, when:'18 кві' },
  { id:'r3', from:{ua:'Андрій М.',en:'Andrii M.'}, stars:4, text:{ua:'Все чудово, тільки кур\'єр трохи запізнився.',en:'All great, courier was a bit late.'}, order:2598, when:'12 кві' },
];

const KPI = {
  today: { orders:14, revenue:12800, avg:914, conv:'8.4%' },
  week:  { orders:78, revenue:71200, avg:912, conv:'7.9%' },
  month: { orders:312, revenue:284600, avg:912, conv:'8.1%' },
};

const SALES_TREND = [42,55,48,62,71,68,82,76,89,94,87,102,98,118,124];

const TOP_BOUQUETS = [
  { name:'Ніжність', sold:42, revenue:35700, palette:['#dda8ad','#f5dde0','#8aab6e'] },
  { name:'Класика', sold:31, revenue:44950, palette:['#c14b50','#dda8ad','#f5f0e8'] },
  { name:'Ранкова кава', sold:28, revenue:20160, palette:['#eaa280','#f5d6c0','#5d8a3e'] },
  { name:'Карамель', sold:24, revenue:23520, palette:['#e89478','#f4c4af','#b89968'] },
  { name:'Хмара', sold:18, revenue:22320, palette:['#a9c4e4','#d4e0ee','#f5f0e8'] },
];

const SOURCE_SPLIT = [
  { id:'tinder', label:'Tinder', pct:42, color:'#dda8ad' },
  { id:'construct', label:'Конструктор', pct:31, color:'#8aab6e' },
  { id:'catalog', label:'Каталог', pct:22, color:'#c8a84b' },
  { id:'subs', label:'Підписка', pct:5, color:'#a9c4e4' },
];

window.ADMIN = { ORDERS:ADMIN_ORDERS, CLIENTS:ADMIN_CLIENTS, REVIEWS:ADMIN_REVIEWS, KPI, SALES_TREND, TOP_BOUQUETS, SOURCE_SPLIT };
