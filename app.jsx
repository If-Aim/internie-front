const USE_MOCK = true;
function Header(){
    return (
        <div className="topbar">
            <button className="iconbtn" aria-label="menu" onClick={()=>{/* TODO: 사이드메뉴 열기 */}}>
                <img className="icon" src="./resources/menu-01.svg" alt="메뉴" />
            </button>

            <div className="app-title">internie</div>

            <button className="iconbtn" aria-label="add" onClick={()=>{/* TODO: 일정 추가 */}}>
                <img className="icon" src="./resources/plus-01.svg" alt="추가" />
            </button>
        </div>
    );
}
function EventCard({ title, subtitle }){
    return (
        <article className="card">
        <div className="item">
            <div className="thumb"></div>
            <div>
                <div className="title">{title}</div>
                <div className="subtitle">{subtitle}</div>
            </div>
        </div>
        </article>
    );
}
function MonthHeader({ value, onChange }) {
    const [open,setOpen]=React.useState(false);
    const ref = React.useRef(null);

    // 바깥 클릭 닫기
    React.useEffect(()=>{
        const onDoc=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('click',onDoc); return ()=>document.removeEventListener('click',onDoc);
    },[]);

    // value: '2025-10' → '10월'
    const label = (()=> {
        const [,m]=value.split('-'); return `${Number(m)}월`;
    })();

    // 현재 value 기준 ±5개월 목록
    const months = React.useMemo(()=>{
        const base = new Date(value+'-01T00:00:00');
        return Array.from({length:12},(_,i)=>{
        const d=new Date(base); d.setMonth(d.getMonth()-5+i);
        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return { ym, text:`${d.getMonth()+1}월` };
        });
    },[value]);

    return (
        <div className="month-row" ref={ref} style={{position:'relative'}}>
            <div className="month-left">
                <div className="h1">10월</div>
                <button className="month-btn" aria-label="월 선택" style={{border:0,background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',padding:0}}>
                    <img className="icon" src="./resources/chevron-right.svg" alt="월 선택" style={{width:24,height:24}}/>
                </button>
            </div>
        {open && (
            <div className="month-pop" role="menu" aria-label="월 선택">
            <div className="month-menu">
                {months.map(m=>(
                <button key={m.ym}
                    className="month-item"
                    aria-current={m.ym===value}
                    onClick={()=>{ onChange(m.ym); setOpen(false); }}>
                    {m.text}
                </button>
                ))}
            </div>
            </div>
        )}
        </div>
    );
}
function dateLabel(iso){
    const d=new Date(iso+"T00:00:00"); const w=['일','월','화','수','목','금','토'][d.getDay()];
    const today=new Date(); const same=d.toDateString()===today.toDateString();
    return same ? `${d.getDate()}일 오늘` : `${d.getDate()}일 ${w}요일`;
}
function mockList(){
    const t=o=>{const x=new Date(); x.setDate(x.getDate()+o);
        return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
    return [
        {id:'a1',title:'새로운 이벤트',subtitle:'새로운 이벤트',date:t(0)},
        {id:'a2',title:'새로운 이벤트',subtitle:'새로운 이벤트',date:t(0)},
        {id:'b1',title:'새로운 이벤트',subtitle:'새로운 이벤트',date:t(-1)},
        {id:'b2',title:'새로운 이벤트',subtitle:'새로운 이벤트',date:t(-1)},
        {id:'c1',title:'새로운 이벤트',subtitle:'새로운 이벤트',date:t(-2)},
    ];
}
function App(){
    const [month,setMonth] = React.useState('2025-10');
    const [items] = React.useState(USE_MOCK ? mockList() : []);
    React.useEffect(()=>{
        // 기존 불러오기 로직을 month 사용으로 변경
        (async ()=>{
            const data = await api(`/schedules?month=${month}`);
            setItems(data.items||[]);
        })().catch(console.error);
    },[month]);
    const byDate = React.useMemo(()=>{
        const g={}; items.forEach(it=> (g[it.date]??=[]).push(it));
        return Object.entries(g).sort((a,b)=> a[0]<b[0]?1:-1);
    },[items]);
    return (
        <div className="wrap">
            <Header/>  
            <div className="row" style={{marginTop:23}}>
                <MonthHeader value={month} onChange={setMonth}/>
            </div>
            {byDate.map(([date, arr])=>(
                <section key={date}>
                <h2 className="h2">{dateLabel(date)}</h2>
                {arr.map(it=> <EventCard key={it.id} {...it}/>)}
                </section>
            ))}
        </div>
    );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
