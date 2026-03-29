import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  GitBranch,
  ShieldAlert,
  Users,
  Zap,
  Activity,
  FlaskConical
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/graph', icon: GitBranch, label: 'Graph View' },
  { to: '/referrals', icon: Activity, label: 'Referrals' },
  { to: '/fraud', icon: ShieldAlert, label: 'Fraud Monitor' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/simulate', icon: FlaskConical, label: 'Simulator' },
  { to: '/claim', icon: Zap, label: 'Claim' }
]

export default function Sidebar({ wsConnected, liveEvents }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">R</div>
        <div>
          <div className="sidebar-brand-title">ReferralDAG</div>
          <div className="sidebar-brand-sub">cycle-safe engine</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-status">
        <div className="sidebar-status-row">
          <div className={`status-dot ${wsConnected ? 'is-live' : 'is-offline'}`} />
          <span className="sidebar-status-label">{wsConnected ? 'live' : 'disconnected'}</span>
        </div>
        <div className="sidebar-events">
          {liveEvents.slice(0, 2).map((e, i) => (
            <div key={i} className="sidebar-event-item">{e.data?.message || e.type}</div>
          ))}
        </div>
      </div>
    </aside>
  )
}
