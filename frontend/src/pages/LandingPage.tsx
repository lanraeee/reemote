import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant Access',
    desc: 'Connect to any VM in under a second directly from your browser. No downloads, no plugins, no friction.',
    color: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Zero-Trust Security',
    desc: 'End-to-end encrypted sessions, TOTP two-factor auth, and per-user access controls on every VM.',
    color: 'from-purple-500 to-violet-500',
    glow: 'shadow-purple-500/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Live Monitoring',
    desc: 'Real-time power state, CPU, RAM and disk metrics for every machine in your fleet at a glance.',
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Team Management',
    desc: 'Grant or revoke VM access per user, assign admin roles, and audit every action with full logs.',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
  },
];

const steps = [
  { n: '01', title: 'Add your VMs', desc: 'Register your virtual machines with hostname, specs and credentials.' },
  { n: '02', title: 'Invite your team', desc: 'Create user accounts and assign per-VM access permissions.' },
  { n: '03', title: 'Connect anywhere', desc: 'Open a browser and securely access any permitted VM in one click.' },
];

const stats = [
  { value: '< 1s', label: 'Connection time' },
  { value: 'AES-256', label: 'Encryption' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '2FA', label: 'Built-in auth' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#080d1a] text-white overflow-x-hidden">

      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[120px] animate-float" />
        <div className="absolute top-[30%] right-[-15%] w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px] animate-float-delay" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-cyan-600/6 blur-[100px] animate-float-slow" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* ── Navbar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080d1a]/90 backdrop-blur-xl border-b border-white/5' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">Reemote</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </nav>

          <Link
            to="/login"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:-translate-y-0.5"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/8 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 pulse-dot" />
          Enterprise VM Management Platform
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 animate-slide-in" style={{ animationDelay: '0.05s' }}>
          Remote desktop access,{' '}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            without the hassle
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl leading-relaxed mb-10 animate-slide-in" style={{ animationDelay: '0.1s' }}>
          Reemote gives your team instant, browser-based access to every virtual machine in your fleet — secured with zero-trust auth and real-time monitoring.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-in" style={{ animationDelay: '0.15s' }}>
          <Link
            to="/login"
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-blue-600/30 hover:-translate-y-1 hover:shadow-blue-500/40 text-sm"
          >
            Get started free
          </Link>
          <a
            href="#features"
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl transition-all duration-200 text-sm"
          >
            See features
          </a>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative mt-20 w-full max-w-4xl mx-auto animate-slide-in" style={{ animationDelay: '0.25s' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080d1a] z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="rounded-2xl border border-white/10 bg-[#0c1425]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/50">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a1020] border-b border-white/5">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <div className="flex-1 mx-4 h-6 bg-white/5 rounded-lg flex items-center px-3">
                <span className="text-xs text-slate-500">reemote.vercel.app/dashboard</span>
              </div>
            </div>

            {/* Fake dashboard */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-48 bg-[#080d1a]/80 border-r border-white/5 p-3 hidden sm:block">
                <div className="flex items-center gap-2 mb-5 px-2 pt-1">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600" />
                  <span className="text-xs font-bold">Reemote</span>
                </div>
                {['Dashboard', 'Settings'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 text-xs ${i === 0 ? 'bg-blue-600/15 text-blue-400' : 'text-slate-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-400' : 'bg-slate-600'}`} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 p-4">
                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total VMs', val: '12', color: 'from-blue-600 to-blue-500' },
                    { label: 'Running', val: '8', color: 'from-emerald-600 to-emerald-500' },
                    { label: 'Stopped', val: '4', color: 'from-slate-700 to-slate-600' },
                    { label: 'Total RAM', val: '96 GB', color: 'from-purple-600 to-purple-500' },
                  ].map(c => (
                    <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-3`}>
                      <p className="text-[10px] text-white/60">{c.label}</p>
                      <p className="text-lg font-bold text-white">{c.val}</p>
                    </div>
                  ))}
                </div>

                {/* VM list */}
                <div className="space-y-2">
                  {[
                    { name: 'web-prod-01', state: 'running', cpu: '4', ram: '8 GB' },
                    { name: 'db-primary', state: 'running', cpu: '8', ram: '32 GB' },
                    { name: 'staging-01', state: 'stopped', cpu: '2', ram: '4 GB' },
                  ].map(vm => (
                    <div key={vm.name} className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2.5 border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${vm.state === 'running' ? 'bg-emerald-400 pulse-dot' : 'bg-slate-500'}`} />
                        <span className="text-xs font-medium text-slate-200">{vm.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span>{vm.cpu} CPU</span>
                        <span>{vm.ram}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${vm.state === 'running' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                          {vm.state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Everything your team needs</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Built for teams who need reliable, secure remote access without the overhead of traditional VPN or RDP infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(f => (
              <div key={f.title} className={`group relative p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${f.glow}`}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400 mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.n} className="relative flex flex-col items-start">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(100%+1rem)] right-0 h-px bg-gradient-to-r from-white/10 to-transparent w-[calc(100%-2rem)]" style={{ width: 'calc(100% - 1.5rem)', left: 'calc(100% + 0.5rem)' }} />
                )}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/20 border border-white/10 flex items-center justify-center mb-5">
                  <span className="text-sm font-bold text-blue-300">{s.n}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security section ── */}
      <section id="security" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl border border-white/8 bg-gradient-to-br from-[#0c1425] to-[#0a0f1e] p-10 md:p-14 overflow-hidden relative">
            {/* Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">Security</p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-5">Enterprise-grade, out of the box</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Every session is encrypted end-to-end. Access is gated by JWT tokens with short expiry, 2FA on every account, and full audit logs for compliance.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/8 hover:bg-white/12 border border-white/10 rounded-xl text-sm font-semibold transition-all duration-200"
                >
                  Start securing your fleet
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              <div className="space-y-4">
                {[
                  { icon: '🔐', title: 'End-to-end encryption', desc: 'All VNC traffic encrypted with AES-256 in transit' },
                  { icon: '📱', title: 'TOTP Two-factor auth', desc: 'Google Authenticator & any TOTP-compatible app' },
                  { icon: '📋', title: 'Full audit logs', desc: 'Every login, access and action logged with timestamps' },
                  { icon: '👤', title: 'Granular permissions', desc: 'Per-user, per-VM access control with admin roles' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white/3 border border-white/5">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5">
            Ready to take control?
          </h2>
          <p className="text-slate-400 text-sm mb-10 leading-relaxed">
            Get your team connected to every VM in minutes. No infrastructure changes needed.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-blue-600/30 hover:-translate-y-1 hover:shadow-blue-500/40"
          >
            Get started
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Reemote</span>
            <span className="text-slate-600 text-xs ml-2">© {new Date().getFullYear()} Belloite Ltd. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
