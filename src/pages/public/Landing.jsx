import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BatteryCharging, Building2, CalendarDays,
  CarFront, CheckCircle2, Cpu, Gauge, Globe2, Layers3, Menu, Navigation,
  PlayCircle, Radio, RefreshCw, Shield, ShieldCheck, Truck, Users, X, Zap,
} from 'lucide-react'
import TelemetryCanvas from '@/components/landing/TelemetryCanvas'
import './Landing.css'

const roles = [
  {
    id: 'driver', label: 'Drivers', icon: CarFront, eyebrow: 'DRIVER MOBILE WORKSPACE',
    title: 'Find, reserve & charge in seconds',
    description: 'See nearby availability, plan a charging stop, and follow battery status from one clear workspace.',
    points: ['Find available bays', 'Follow battery and session status', 'Plan the next stop'],
  },
  {
    id: 'operator', label: 'Station Operators', icon: Building2, eyebrow: 'STATION OPERATOR DASHBOARD',
    title: 'Keep every station moving',
    description: 'Watch connector status, investigate faults, and see charging activity across an entire site.',
    points: ['Live connector visibility', 'Session and fault monitoring', 'Site power overview'],
  },
  {
    id: 'fleet', label: 'Fleet Managers', icon: Truck, eyebrow: 'DEPOT FLEET ORCHESTRATOR',
    title: 'Get every vehicle route ready',
    description: 'See which vehicles are charging, match energy plans to shifts, and spot departures that need attention.',
    points: ['Shift-aware schedules', 'Depot capacity overview', 'Departure readiness'],
  },
  {
    id: 'admin', label: 'Network Admins', icon: Shield, eyebrow: 'NETWORK CONTROL CENTER',
    title: 'One view across the network',
    description: 'Bring station health, network activity, and access controls together in a single operating view.',
    points: ['Network-wide health', 'Role-based access', 'Clear issue triage'],
  },
]
const heroWords = ['motion.', 'sync.', 'control.']

function Brand() {
  return <Link className="vg2-brand" to="/" aria-label="VoltGrid home">
    <span className="vg2-brand-mark"><Zap size={19} fill="currentColor" /></span>
    <span>VoltGrid</span><span className="vg2-version">2.0</span>
  </Link>
}

function Header({ onDemo }) {
  const [open, setOpen] = useState(false)
  return <header className="vg2-header"><div className="vg2-shell vg2-header-inner">
    <Brand />
    <nav className={open ? 'vg2-nav is-open' : 'vg2-nav'} aria-label="Main navigation">
      <a href="#hero-visual" onClick={() => setOpen(false)}>How it works</a>
      <a href="#personas" onClick={() => setOpen(false)}>Solutions</a>
      <a href="#features" onClick={() => setOpen(false)}>Modules</a>
      <a href="#hero-visual" onClick={() => setOpen(false)}>Network Health</a>
      <button className="vg2-mobile-demo" type="button" onClick={() => { setOpen(false); onDemo() }}>Simulate Booking</button>
    </nav>
    <div className="vg2-header-actions">
      <button className="vg2-button vg2-button-quiet vg2-demo-header" type="button" onClick={onDemo}><span className="vg2-live-dot" /> Simulate Booking</button>
      <Link className="vg2-button vg2-button-primary vg2-button-small" to="/register">Get started <ArrowRight size={16} /></Link>
    </div>
    <button className="vg2-menu" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X size={22} /> : <Menu size={22} />}</button>
  </div></header>
}

function RotatingWord() {
  const [wordIndex, setWordIndex] = useState(0)
  const [letters, setLetters] = useState(null)
  const intervalRef = useRef(0)
  const indexRef = useRef(0)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const rotate = () => {
      if (document.hidden) return
      indexRef.current = (indexRef.current + 1) % heroWords.length
      const next = heroWords[indexRef.current]
      setWordIndex(indexRef.current)
      window.clearInterval(intervalRef.current)
      if (media.matches) { setLetters(null); return }
      let frame = 0
      intervalRef.current = window.setInterval(() => {
        frame += 1
        const revealed = Math.max(0, Math.floor(((frame - 6) / 16) * next.length))
        setLetters(Array.from(next, (character, index) => ({
          character: index < revealed ? character : 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)],
          settled: index < revealed,
        })))
        if (frame >= 22) { window.clearInterval(intervalRef.current); setLetters(null) }
      }, 32)
    }
    const timer = window.setInterval(rotate, 3800)
    return () => { window.clearInterval(timer); window.clearInterval(intervalRef.current) }
  }, [])

  return <><span className="vg2-rotating" aria-hidden="true">in <span className="vg2-word">{letters ? letters.map(({ character, settled }, index) => <span key={index} className={settled ? '' : 'vg2-scramble'}>{character}</span>) : heroWords[wordIndex]}</span></span><span className="vg2-sr-only">in {heroWords[wordIndex]}</span></>
}

function TelemetryPanel({ boosted, setBoosted, resetToken, setResetToken, soc }) {
  return <div className="vg2-telemetry vg2-glass" id="hero-visual">
    <div className="vg2-window-top">
      <div className="vg2-window-name"><span className="vg2-window-dots"><i /><i /><i /></span><span>VoltGrid // Real-time Telemetry Canvas</span></div>
      <div className="vg2-window-status"><span className="vg2-live-dot" /><span className={boosted ? 'is-boosted' : ''}>STATUS: {boosted ? 'BOOSTED (180 kW)' : 'OPTIMAL (148 kW)'}</span><span className="vg2-bay-id">BAY 04 / DC FAST</span></div>
    </div>
    <div className="vg2-canvas-wrap">
      <TelemetryCanvas boosted={boosted} resetToken={resetToken} />
      <div className="vg2-float vg2-grid-load vg2-glass"><span>GRID LOAD BALANCE</span><strong>98.4% <small>+2.1 kW peak</small></strong></div>
      <div className="vg2-float vg2-soc vg2-glass"><div><span>SOC BATTERY</span><strong>{soc}%</strong></div><div className="vg2-meter"><span style={{ width: `${soc}%` }} /></div><div><span>EST. TIME LEFT</span><b>12 MINS</b></div></div>
      <div className="vg2-canvas-controls"><button type="button" onClick={() => setBoosted(!boosted)}><Zap size={15} /> {boosted ? 'Standard Rate (148kW)' : 'Boost Power (180kW)'}</button><button type="button" onClick={() => setResetToken(resetToken + 1)} aria-label="Reset energy flow simulation" title="Reset energy flow simulation"><RefreshCw size={16} /></button></div>
    </div>
    <div className="vg2-metrics">
      <div><span className="vg2-metric-icon"><Cpu size={20} /></span><span><small>STATION HEALTH</small><strong>99.98% Online</strong></span></div>
      <div><span className="vg2-metric-icon"><Gauge size={20} /></span><span><small>DISPATCH TIME</small><strong>&lt; 420ms latency</strong></span></div>
      <div><span className="vg2-metric-icon"><ShieldCheck size={20} /></span><span><small>ISO 15118 READY</small><strong>Plug &amp; Charge</strong></span></div>
      <div><span className="vg2-metric-icon"><Activity size={20} /></span><span><small>ACTIVE BAYS</small><strong>1,420 Connected</strong></span></div>
    </div>
  </div>
}

function RolePreview({ role, onDemo }) {
  if (role === 'driver') return <div className="vg2-preview">
    <div className="vg2-preview-top"><span>NEARBY CHARGER #408</span><em>AVAILABLE NOW</em></div>
    <div className="vg2-preview-main"><div><strong>VoltGrid SuperHub Central</strong><p>0.8 miles away · 350 kW CCS2 Fast Charger</p></div><button className="vg2-button vg2-button-primary vg2-button-small" type="button" onClick={onDemo}>Reserve Bay 02</button></div>
    <div className="vg2-preview-row"><span>Pre-conditioning status</span><b>Battery primed (28°C)</b></div>
  </div>
  if (role === 'operator') return <div className="vg2-preview"><div className="vg2-preview-top"><span>SITE TOTAL POWER</span><em>480 kW ACTIVE</em></div><div className="vg2-preview-tiles"><div><small>BAY 01 · DC FAST</small><strong>150 kW charging</strong><span>Connector healthy</span></div><div><small>BAY 02 · DC FAST</small><strong>180 kW charging</strong><span>Connector healthy</span></div></div><div className="vg2-preview-row"><span>Open faults</span><b>0 critical</b></div></div>
  if (role === 'fleet') return <div className="vg2-preview"><div className="vg2-preview-top"><span>DEPOT FLEET SCHEDULE</span><em>NIGHT SHIFT</em></div><div className="vg2-preview-list"><div><span>EV-104 · Route A</span><b>Ready by 05:30</b></div><div><span>EV-208 · Route C</span><b>Ready by 06:15</b></div><div><span>EV-311 · Route D</span><b>Charging now</b></div></div><div className="vg2-preview-row"><span>Departure readiness</span><b>12 / 14 vehicles</b></div></div>
  return <div className="vg2-preview"><div className="vg2-preview-top"><span>NETWORK CONTROL CENTER</span><em>ALL SYSTEMS NORMAL</em></div><div className="vg2-preview-tiles vg2-preview-tiles-3"><div><small>ONLINE SITES</small><strong>24 / 24</strong><span>Connected</span></div><div><small>LIVE SESSIONS</small><strong>328</strong><span>Charging</span></div><div><small>ALERTS</small><strong>02</strong><span>Need review</span></div></div><div className="vg2-preview-row"><span>Last network sync</span><b>Just now</b></div></div>
}

function RoleSection({ onDemo }) {
  const [active, setActive] = useState('driver')
  const current = roles.find((role) => role.id === active)
  return <section className="vg2-section vg2-personas" id="personas"><div className="vg2-shell">
    <div className="vg2-section-heading"><span className="vg2-section-pill"><Users size={15} /> TAILORED WORKSPACES</span><h2>Built for everyone behind every kilowatt.</h2><p>Select a role to see how VoltGrid brings the charging ecosystem together.</p></div>
    <div className="vg2-tab-scroll"><div className="vg2-tabs vg2-glass" role="tablist" aria-label="VoltGrid workspaces">{roles.map(({ id, label, icon: Icon }) => <button key={id} id={`vg2-tab-${id}`} type="button" role="tab" aria-controls="vg2-role-panel" aria-selected={active === id} className={active === id ? 'is-active' : ''} onClick={() => setActive(id)}><Icon size={17} /> {label}</button>)}</div></div>
    <div className="vg2-role-card vg2-glass" id="vg2-role-panel" role="tabpanel" aria-labelledby={`vg2-tab-${active}`} key={active}><div className="vg2-role-copy"><span className="vg2-overline">{current.eyebrow}</span><h3>{current.title}</h3><p>{current.description}</p><ul>{current.points.map((point) => <li key={point}><CheckCircle2 size={16} /> {point}</li>)}</ul></div><RolePreview role={active} onDemo={onDemo} /></div>
  </div></section>
}

function FeatureCard({ icon: Icon, eyebrow, title, text, children, wide = false }) {
  return <article className={`vg2-feature vg2-glass${wide ? ' is-wide' : ''}`}><div className="vg2-feature-head"><span className="vg2-feature-icon"><Icon size={22} /></span><span className="vg2-overline">{eyebrow}</span></div><h3>{title}</h3><p>{text}</p>{children}</article>
}

function Features() {
  return <section className="vg2-section vg2-features" id="features"><div className="vg2-shell"><div className="vg2-section-heading"><h2>Engineered for grid-scale performance.</h2><p>Everything you need to orchestrate electric power delivery in one connected platform.</p></div><div className="vg2-feature-grid">
    <FeatureCard icon={Activity} eyebrow="DYNAMIC LOAD BALANCING" title="Grid load in clear view" text="See demand across active chargers and make room for the next session." wide><div className="vg2-feature-widget"><div><span>DEMAND CAPACITY</span><b>820 kW / 1000 kW</b></div><div className="vg2-capacity"><span /></div><div><small>Bay 01 · 150 kW</small><small>Bay 02 · 120 kW</small><small>Bay 03 · Idle</small></div></div></FeatureCard>
    <FeatureCard icon={Radio} eyebrow="CONNECTOR HEALTH" title="Faults before friction" text="Track connector status and surface faults before a driver reaches the bay."><div className="vg2-feature-stat"><span>Connector status</span><b>Healthy</b></div></FeatureCard>
    <FeatureCard icon={CalendarDays} eyebrow="FLEET DEPOT SCHEDULING" title="Route-aware charging" text="Plan charge windows around departure times and available depot power."><div className="vg2-feature-stat"><span>Next departure</span><b>05:30</b></div></FeatureCard>
    <FeatureCard icon={ShieldCheck} eyebrow="CONNECTED STANDARDS" title="Built for an open charging network" text="Connect vehicles, hardware, and operations through widely used charging standards." wide><div className="vg2-standards"><span>OCPP 1.6 / 2.0.1</span><span>ISO 15118</span><span>OCPI roaming</span><span>OpenADR</span></div></FeatureCard>
  </div></div></section>
}

function DemoModal({ onClose, onConfirm, target, setTarget, selectedBay, setSelectedBay, confirmed }) {
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const escape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', escape); document.body.style.overflow = previousOverflow }
  }, [onClose])
  return <div className="vg2-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="vg2-modal vg2-glass" role="dialog" aria-modal="true" aria-labelledby="vg2-modal-title"><div className="vg2-modal-top"><h2 id="vg2-modal-title"><Zap size={19} /> Simulate a charger reservation</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="Close simulation"><X size={20} /></button></div><p className="vg2-modal-note">Interactive preview only. No real bay is reserved.</p><label htmlFor="vg2-bay">SELECT BAY</label><select id="vg2-bay" value={selectedBay} onChange={(event) => setSelectedBay(event.target.value)}><option value="Bay 01 · 150 kW DC fast">Bay 01 · 150 kW DC fast</option><option value="Bay 02 · 350 kW ultra fast">Bay 02 · 350 kW ultra fast</option></select><label htmlFor="vg2-target">TARGET BATTERY CHARGE</label><input id="vg2-target" type="range" min="25" max="100" value={target} onChange={(event) => setTarget(Number(event.target.value))} /><div className="vg2-range-label"><span>Current: 24%</span><span>Target: {target}%</span></div>{confirmed && <div className="vg2-confirmed" role="status"><CheckCircle2 size={18} /> Demo flow started for {selectedBay}.</div>}<button className="vg2-button vg2-button-primary vg2-modal-confirm" type="button" onClick={onConfirm}>{confirmed ? 'Run simulation again' : 'Start reservation simulation'} <ArrowRight size={17} /></button></div></div>
}

export default function Landing() {
  const [boosted, setBoosted] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [demoOpen, setDemoOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [selectedBay, setSelectedBay] = useState('Bay 02 · 350 kW ultra fast')
  const [target, setTarget] = useState(80)
  const [soc, setSoc] = useState(74)
  const showDemo = () => { setConfirmed(false); setDemoOpen(true) }
  const confirmDemo = () => { setConfirmed(true); setBoosted(true); setSoc(Math.min(target, 100)); setResetToken((value) => value + 1) }
  const showFlow = () => { setBoosted(true); document.getElementById('hero-visual')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }

  return <div className="vg2-landing"><Header onDemo={showDemo} /><main>
    <section className="vg2-hero"><div className="vg2-shell"><div className="vg2-hero-composition"><div className="vg2-hero-copy"><span className="vg2-eyebrow"><span className="vg2-live-dot" /> VoltGrid 2.0 <i>•</i> The connected EV infrastructure platform <ArrowUpRight size={15} /></span><h1><span>Every charge</span><RotatingWord /></h1></div><div className="vg2-hero-side"><p>One unified platform to locate chargers, operate stations, and orchestrate electric fleets. Built with sub-second telemetry for drivers, operators, and grid managers.</p><div className="vg2-hero-actions"><a className="vg2-button vg2-button-primary" href="#personas">Explore Live Dashboard <ArrowRight size={18} /></a><button className="vg2-button vg2-button-quiet" type="button" onClick={showFlow}><PlayCircle size={19} /> Watch Energy Flow</button></div></div></div><TelemetryPanel boosted={boosted} setBoosted={setBoosted} resetToken={resetToken} setResetToken={setResetToken} soc={soc} /></div></section>
    <section className="vg2-network-strip"><div className="vg2-shell"><p>THE CONNECTED EV ENERGY ECOSYSTEM</p><div><span><Zap size={20} /> Grid energy</span><span><Radio size={20} /> Fast charging</span><span><Navigation size={20} /> Route planning</span><span><Layers3 size={20} /> Depot operations</span><span><Globe2 size={20} /> Network insight</span></div></div></section>
    <RoleSection onDemo={showDemo} /><Features />
    <section className="vg2-final"><div className="vg2-shell"><div className="vg2-final-card vg2-glass"><span className="vg2-section-pill"><BatteryCharging size={15} /> MOVE WITH VOLTGRID</span><h2>Ready to electrify your network?</h2><p>Bring charging, station operations, and fleet movement into one connected view.</p><div><Link className="vg2-button vg2-button-primary" to="/register">Get started <ArrowRight size={18} /></Link><Link className="vg2-button vg2-button-quiet" to="/modules">Explore modules <ArrowRight size={18} /></Link></div></div></div></section>
  </main><footer className="vg2-footer"><div className="vg2-shell"><Brand /><span>© {new Date().getFullYear()} VoltGrid</span><div><Link to="/modules">Modules</Link><Link to="/login">Sign in</Link><Link to="/register">Get started</Link></div></div></footer>{demoOpen && <DemoModal onClose={() => setDemoOpen(false)} onConfirm={confirmDemo} target={target} setTarget={setTarget} selectedBay={selectedBay} setSelectedBay={setSelectedBay} confirmed={confirmed} />}</div>
}
