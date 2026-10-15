import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const APPS = [
  ['terminal', '⌘', 'Terminal'], ['projects', '▦', 'Projects'], ['experience', '◷', 'Experience'],
  ['skills', '✦', 'Skills'], ['resume', '▤', 'Resume'], ['about', '◎', 'About'],
  ['contact', '✉', 'Contact'], ['playground', '◇', 'Playground'],
];
const CONTENT = {
  terminal: { eyebrow: 'shell', title: 'Terminal', body: <div className="terminal"><p><b>anukool@portfolio</b>:~$ whoami</p><p className="accent">Anukool Yadav · AI/ML Engineer</p><p><b>anukool@portfolio</b>:~$ echo "Build something meaningful."</p><p>Build something meaningful.</p><span className="cursor">▋</span></div> },
  projects: { eyebrow: 'work', title: 'Projects', body: <><p className="lead">Selected experiments and shipped systems.</p><div className="cards"><article><b>Crop Maturity Vision</b><span>Computer vision · CNN · Research</span></article><article><b>Air Quality Forecasting</b><span>Deep learning · Time series</span></article><article><b>More projects loading…</b><span>Connected to the portfolio API soon</span></article></div></> },
  experience: { eyebrow: 'timeline', title: 'Experience', body: <div className="timeline"><div><b>2025 — Present</b><span>AI / ML Engineering · Building practical models</span></div><div><b>2022 — 2026</b><span>B.Tech Computer Science · LPU</span></div></div> },
  skills: { eyebrow: 'toolkit', title: 'Skills', body: <div className="skill-list">{['Python','Machine Learning','Computer Vision','TensorFlow / PyTorch','Data Analysis','C++'].map((s, i) => <div key={s}><span>{s}</span><i style={{ '--level': `${88 - i * 5}%` }} /></div>)}</div> },
  resume: { eyebrow: 'document', title: 'Resume', body: <><p className="lead">A concise overview of my work, education, and technical toolkit.</p><a className="action" href="/download/resume">Download resume <span>↗</span></a></> },
  about: { eyebrow: 'identity', title: 'About', body: <><p className="lead">I’m Anukool, a Punjab-based Computer Science student focused on machine learning and real-world impact.</p><p className="muted">This workspace is the first phase of a personal operating system for sharing ideas, projects, and experiments.</p></> },
  contact: { eyebrow: 'signal', title: 'Contact', body: <><p className="lead">Have an idea, opportunity, or collaboration in mind?</p><a className="action" href="mailto:captioncoolnew@gmail.com">Send a message <span>↗</span></a></> },
  playground: { eyebrow: 'status: undecided', title: 'Playground', body: <div className="empty"><span>◇</span><p>A creative space is taking shape.</p><small>Experiments, visualizations, and tiny tools will live here.</small></div> },
};

function Window({ id, z, onFocus, onClose, onMinimize, onMaximize }) {
  const data = CONTENT[id]; const ref = useRef(null); const drag = useRef(null); const [max, setMax] = useState(false);
  const move = e => { if (!drag.current || max) return; const x = e.clientX - drag.current.dx; const y = e.clientY - drag.current.dy; ref.current.style.left = `${Math.max(8, x)}px`; ref.current.style.top = `${Math.max(36, y)}px`; };
  useEffect(() => { const up = () => { drag.current = null; }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); }; });
  return <section ref={ref} className={`window ${max ? 'maximized' : ''}`} style={{ zIndex: z }} onPointerDown={onFocus}>
    <header onPointerDown={e => { drag.current = { dx: e.clientX - ref.current.offsetLeft, dy: e.clientY - ref.current.offsetTop }; }}><span className="window-icon">{APPS.find(a => a[0] === id)[1]}</span><span>{data.title}</span><div className="window-actions"><button onClick={onMinimize}>−</button><button onClick={() => { setMax(!max); onMaximize(); }}>□</button><button onClick={onClose}>×</button></div></header>
    <div className="window-body"><small className="eyebrow">{data.eyebrow}</small><h2>{data.title}</h2>{data.body}</div>
  </section>;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('os-theme') || 'dark'); const [open, setOpen] = useState(['about']); const [z, setZ] = useState({ about: 1 }); const [launcher, setLauncher] = useState(false); const [time, setTime] = useState(new Date());
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('os-theme', theme); }, [theme]); useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const launch = id => { setOpen(o => o.includes(id) ? o : [...o, id]); setZ(v => ({ ...v, [id]: Math.max(...Object.values(v), 0) + 1 })); setLauncher(false); };
  const focus = id => setZ(v => ({ ...v, [id]: Math.max(...Object.values(v), 0) + 1 }));
  return <main className="desktop"><div className="noise" /><nav className="topbar"><span className="brand"><i /> ANUKOOL OS</span><span className="status">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '☼' : '☾'}</button></span></nav>
    <div className="welcome"><small>PERSONAL WORKSPACE / 001</small><h1>Welcome to<br /><em>Anukool OS.</em></h1><p>Ideas, systems, and experiments — arranged for exploration.</p></div>
    {open.map(id => <Window key={id} id={id} z={z[id] || 1} onFocus={() => focus(id)} onClose={() => setOpen(o => o.filter(x => x !== id))} onMinimize={() => setOpen(o => o.filter(x => x !== id))} onMaximize={() => focus(id)} />)}
    {launcher && <div className="launcher"><div className="launcher-inner"><div className="launcher-head"><b>Applications</b><button onClick={() => setLauncher(false)}>×</button></div>{APPS.map(([id, icon, label]) => <button key={id} onClick={() => launch(id)}><span>{icon}</span>{label}</button>)}</div></div>}
    <footer className="dock"><button className="launcher-button" onClick={() => setLauncher(!launcher)}>◈</button>{APPS.filter(a => open.includes(a[0])).map(([id, icon, label]) => <button className="dock-app" key={id} onClick={() => focus(id)}><span>{icon}</span><small>{label}</small></button>)}</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
