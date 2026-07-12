import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HeroTerminal() {
  return (
    <div className="relative flex justify-center items-center py-8">
      {/* Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(59,130,246,0.13) 0%, transparent 80%)',
        }}
      />

      {/* Terminal window */}
      <div
        className="relative z-10 w-full max-w-[480px] rounded-2xl overflow-hidden border border-white/8 shadow-2xl shadow-black/70"
        style={{
          background: '#0b1220',
          transform: 'perspective(1100px) rotateY(-4deg) rotateX(2deg)',
        }}
      >
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6" style={{ background: '#070d18' }}>
          <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
          <span className="font-mono text-xs text-slate-600 ml-3 select-none">web-prod-01 — bash</span>
        </div>

        {/* Terminal body */}
        <div className="p-5 font-mono text-[13px] leading-relaxed space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-violet-400">❯</span>
            <span className="text-slate-300">reemote connect web-prod-01</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span>✓</span>
            <span>Session established &mdash; 41ms</span>
          </div>

          <div className="pt-3 text-[11px] text-slate-600">Last login: Fri Jul 11 08:22:14 from 10.0.0.1</div>

          <div className="flex gap-2 pt-2">
            <span className="text-cyan-400">root@web-prod-01</span>
            <span className="text-slate-500">:~#</span>
            <span className="text-slate-300">df -h /</span>
          </div>
          <div className="text-[11px] text-slate-400 pl-1 space-y-0.5">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-slate-500">Filesystem</span>
              <span className="text-slate-500">Size</span>
              <span className="text-slate-500">Used</span>
              <span className="text-slate-500">Avail</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span>/dev/sda1</span>
              <span>200G</span>
              <span className="text-amber-400">148G</span>
              <span className="text-emerald-400">52G</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <span className="text-cyan-400">root@web-prod-01</span>
            <span className="text-slate-500">:~#</span>
            <span className="text-slate-300">systemctl status nginx</span>
          </div>
          <div className="text-[11px] pl-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">●</span>
              <span className="text-white">nginx.service</span>
              <span className="text-slate-400">- A high performance web server</span>
            </div>
            <div className="text-slate-400 pl-4">Loaded: loaded (/lib/systemd/system/nginx.service)</div>
            <div className="pl-4">
              <span className="text-slate-400">Active: </span>
              <span className="text-emerald-400">active (running)</span>
              <span className="text-slate-500"> since 142 days ago</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <span className="text-cyan-400">root@web-prod-01</span>
            <span className="text-slate-500">:~#</span>
            <span className="text-white animate-pulse">▋</span>
          </div>
        </div>
      </div>

      {/* Floating badge: fleet status */}
      <div className="absolute top-4 right-0 z-20 flex items-center gap-3 rounded-xl border border-white/8 px-3.5 py-2.5 shadow-xl"
           style={{ background: '#0e1e30', backdropFilter: 'blur(12px)' }}>
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" style={{ animationDelay: '0.3s' }} />
          <span className="w-2 h-2 rounded-full bg-slate-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-none">8 / 10 online</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fleet nominal</p>
        </div>
      </div>

      {/* Floating badge: encryption */}
      <div className="absolute bottom-4 left-0 z-20 flex items-center gap-3 rounded-xl border border-white/8 px-3.5 py-2.5 shadow-xl"
           style={{ background: '#0e1e30', backdropFilter: 'blur(12px)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
             style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
          🔐
        </div>
        <div>
          <p className="text-xs font-semibold text-white leading-none">AES-256 · TLS 1.3</p>
          <p className="text-[10px] text-slate-400 mt-0.5">End-to-end encrypted</p>
        </div>
      </div>

      {/* Floating badge: latency */}
      <div className="absolute top-1/2 -right-2 z-20 -translate-y-1/2 rounded-xl border px-3.5 py-3 shadow-xl text-center"
           style={{ background: '#0e1e30', borderColor: 'rgba(16,185,129,0.25)', backdropFilter: 'blur(12px)' }}>
        <p className="text-emerald-400 text-xl font-bold leading-none">41ms</p>
        <p className="text-[10px] text-slate-400 mt-1">latency</p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: 'from-blue-500 to-cyan-500',
    shadow: 'rgba(59,130,246,0.25)',
    title: 'Sub-50ms connections',
    desc: 'Optimised WebSocket transport delivers a native-feel remote session from any browser, anywhere in the world.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'rgba(139,92,246,0.25)',
    title: 'Zero-trust security',
    desc: 'JWT sessions with short expiry, TOTP two-factor auth, and per-user VM permissions baked in from day one.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'rgba(16,185,129,0.25)',
    title: 'Live fleet monitoring',
    desc: 'Real-time power state, CPU, RAM and disk across every machine in your fleet. Spot issues before users do.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'rgba(245,158,11,0.25)',
    title: 'Granular access control',
    desc: 'Invite teammates, assign admin roles, and grant or revoke VM access per user in seconds.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Register your machines',
    desc: 'Add each VM with its hostname, specs, and credentials. Takes 30 seconds per machine.',
  },
  {
    n: '02',
    title: 'Invite your team',
    desc: 'Create user accounts and define exactly which VMs each person can access.',
  },
  {
    n: '03',
    title: 'Connect from anywhere',
    desc: 'One click in the browser. No client, no VPN, no setup — just a secure session.',
  },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: '#050914' }}>

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[900px] h-[900px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)' }} />
        <div className="absolute top-[40%] -right-64 w-[700px] h-[700px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)' }} />
        <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 65%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0"
             style={{
               backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.18) 1px, transparent 1px)',
               backgroundSize: '36px 36px',
               opacity: 0.35,
             }} />
      </div>

      {/* ── Navbar ── */}
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={scrolled ? { background: 'rgba(5,9,20,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)', boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <span className="font-bold text-[17px] tracking-tight">Reemote</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {['Features', 'How it works', 'Security'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                 className="text-sm text-slate-400 hover:text-white transition-colors duration-150">
                {l}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors px-1">
              Sign in
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-px"
              style={{ background: '#fff', color: '#0f172a', boxShadow: '0 2px 12px rgba(255,255,255,0.12)' }}
            >
              Get started →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-6 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-center">

            {/* Left: copy */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium mb-8 border"
                   style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.22)', color: '#93c5fd' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-dot" />
                Secure browser-based remote access
              </div>

              <h1 className="text-[3.2rem] sm:text-[3.8rem] lg:text-[4.2rem] font-extrabold tracking-tight leading-[1.04] mb-6">
                Your VM fleet,{' '}
                <br className="hidden sm:block" />
                <span style={{
                  background: 'linear-gradient(90deg, #60a5fa 0%, #22d3ee 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  one click away
                </span>
              </h1>

              <p className="text-[1.05rem] leading-relaxed mb-10 max-w-[480px]" style={{ color: '#94a3b8' }}>
                Reemote gives your team instant remote desktop access to every virtual machine — directly from the browser. No client software, no VPN, no hassle.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
                  }}
                >
                  Start for free
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-white/8"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
                >
                  How it works
                </a>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-8 mt-12 pt-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { val: '< 50ms', lbl: 'avg session latency' },
                  { val: 'AES-256', lbl: 'end-to-end encryption' },
                  { val: '99.9%', lbl: 'uptime guarantee' },
                ].map(s => (
                  <div key={s.val}>
                    <p className="text-[1.1rem] font-bold text-white leading-none">{s.val}</p>
                    <p className="text-[11px] mt-1" style={{ color: '#64748b' }}>{s.lbl}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: terminal visual */}
            <div className="hidden lg:block">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#60a5fa' }}>Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything your team needs</h2>
            <p className="text-[15px] max-w-lg mx-auto leading-relaxed" style={{ color: '#64748b' }}>
              Built for infrastructure teams who need reliable, secure remote access without the baggage.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px ${f.shadow}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4"
                  style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))`, boxShadow: `0 4px 12px ${f.shadow}` }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${f.gradient}`}>
                    {f.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: steps */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3">Up and running in minutes</h2>
              <p className="text-[15px] mb-10 leading-relaxed" style={{ color: '#64748b' }}>
                No complex setup. No networking changes. Just register, invite, connect.
              </p>

              <div className="space-y-8">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="flex gap-5">
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm"
                         style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}>
                      {s.n}
                    </div>
                    <div className="pt-1">
                      <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-10 px-6 py-3.5 text-sm font-semibold rounded-xl text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
              >
                Get started now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Right: VM list graphic */}
            <div className="hidden lg:block rounded-2xl overflow-hidden border"
                 style={{ background: '#0b1220', borderColor: 'rgba(255,255,255,0.07)' }}>
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b"
                   style={{ borderColor: 'rgba(255,255,255,0.05)', background: '#070d18' }}>
                <span className="text-sm font-semibold text-white">Virtual Machines</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  8 running
                </span>
              </div>

              {/* VM rows */}
              <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
                {[
                  { name: 'web-prod-01', host: '10.0.1.10', cpu: 4, ram: '8 GB', state: 'running' },
                  { name: 'db-primary',  host: '10.0.1.20', cpu: 8, ram: '32 GB', state: 'running' },
                  { name: 'api-server',  host: '10.0.1.30', cpu: 4, ram: '16 GB', state: 'running' },
                  { name: 'staging-01',  host: '10.0.2.10', cpu: 2, ram: '4 GB',  state: 'stopped' },
                  { name: 'dev-box',     host: '10.0.2.20', cpu: 2, ram: '8 GB',  state: 'stopped' },
                ].map(vm => (
                  <div key={vm.name} className="flex items-center justify-between px-5 py-3.5 group transition-colors"
                       style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                       onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'}
                       onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${vm.state === 'running' ? 'bg-emerald-400 pulse-dot' : 'bg-slate-600'}`} />
                      <div>
                        <p className="text-sm font-medium text-white">{vm.name}</p>
                        <p className="text-[11px]" style={{ color: '#475569' }}>{vm.host}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: '#475569' }}>
                      <span>{vm.cpu} CPU</span>
                      <span>{vm.ram}</span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${vm.state === 'running' ? 'text-emerald-400' : 'text-slate-500'}`}
                            style={{ background: vm.state === 'running' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)' }}>
                        {vm.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connect button area */}
              <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#475569' }}>Click any machine to connect</span>
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#60a5fa' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-dot" />
                    Live
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="rounded-3xl p-10 md:p-14 relative overflow-hidden"
            style={{ background: '#0b1220', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Glow accent */}
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />

            <div className="relative grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#34d399' }}>Security</p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-5">Enterprise-grade, out of the box</h2>
                <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#64748b' }}>
                  Security isn't a feature — it's the foundation. Every session, every user, every machine is protected by default.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-200 hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                >
                  Secure your fleet
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: '🔒', title: 'AES-256 encryption', desc: 'All traffic encrypted in transit, every session.' },
                  { icon: '📱', title: 'TOTP 2FA', desc: 'Google Authenticator or any TOTP app supported.' },
                  { icon: '🗝️', title: 'Short-lived tokens', desc: 'JWT sessions expire quickly, reducing exposure.' },
                  { icon: '📋', title: 'Audit logs', desc: 'Every login and access event recorded with timestamps.' },
                ].map(item => (
                  <div key={item.title} className="rounded-xl p-4"
                       style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-2xl mb-3 block">{item.icon}</span>
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl px-10 py-16 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(124,58,237,0.15) 100%)',
              border: '1px solid rgba(59,130,246,0.2)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
                Ready to connect?
              </h2>
              <p className="text-[15px] leading-relaxed mb-10 max-w-lg mx-auto" style={{ color: '#94a3b8' }}>
                Get your entire team accessing VMs securely from their browsers in under 10 minutes.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 text-[15px] font-bold rounded-2xl text-white transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  boxShadow: '0 6px 28px rgba(37,99,235,0.5)',
                }}
              >
                Get started free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Reemote</span>
            <span className="text-xs ml-2" style={{ color: '#334155' }}>
              © {new Date().getFullYear()} Belloite Ltd
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: '#475569' }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
