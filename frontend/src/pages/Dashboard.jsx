import React, { useEffect, useState } from 'react'
import { fetchMetrics, fetchActivity } from '../utils/api'
import { Users, GitMerge, CheckCircle, XCircle, ShieldAlert, IndianRupee, GitBranch } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function MetricCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: 'clamp(22px, 2.2vw, 32px)',
        fontWeight: 800,
        color: 'var(--text)',
        letterSpacing: '-0.03em',
        lineHeight: 1.08,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{sub}</div>}
    </div>
  )
}

function eventIcon(type) {
  if (type === 'referral_valid') return { icon: '✓', color: 'var(--green)' }
  if (type === 'referral_rejected') return { icon: '✕', color: 'var(--red)' }
  if (type === 'fraud_detected') return { icon: '⚠', color: 'var(--orange)' }
  if (type === 'referral_created') return { icon: '→', color: 'var(--accent)' }
  if (type === 'cycle_prevented') return { icon: '⊙', color: 'var(--red)' }
  return { icon: '·', color: 'var(--text3)' }
}

function eventLabel(e) {
  if (e.type === 'referral_valid') return `Referral: ${e.new_user_id?.slice(0,8)} ← ${e.referrer_id?.slice(0,8)}`
  if (e.type === 'referral_rejected') return `Rejected: ${e.reason || 'unknown'}`
  if (e.type === 'fraud_detected') return `Fraud [${e.reason}]: ${e.user_id?.slice(0,8)}`
  if (e.data?.message) return e.data.message
  return e.type
}

function formatRupee(value) {
  if (value >= 1000000) {
    return `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`
  }
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)}`
}

export default function Dashboard({ refreshKey, liveEvents }) {
  const [metrics, setMetrics] = useState(null)
  const [activity, setActivity] = useState([])

  useEffect(() => {
    fetchMetrics().then(setMetrics).catch(() => {})
    fetchActivity(30).then(setActivity).catch(() => {})
  }, [refreshKey])

  const cards = metrics ? [
    { icon: Users,       label: 'Total Users',    value: metrics.total_users,             color: 'var(--accent)' },
    { icon: GitMerge,    label: 'Total Referrals',value: metrics.total_referrals,          color: 'var(--accent2)' },
    { icon: CheckCircle, label: 'Valid',           value: metrics.valid_referrals,          color: 'var(--green)', sub: `${metrics.total_referrals ? Math.round(metrics.valid_referrals/metrics.total_referrals*100) : 0}% acceptance rate` },
    { icon: XCircle,     label: 'Rejected',        value: metrics.rejected_referrals,       color: 'var(--red)' },
    { icon: ShieldAlert, label: 'Fraud Attempts',  value: metrics.fraud_attempts,           color: 'var(--orange)' },
    { icon: IndianRupee, label: 'Rewards Paid',    value: formatRupee(metrics.total_rewards_distributed), color: 'var(--yellow)' },
    { icon: GitBranch,   label: 'Root Nodes',      value: metrics.root_users,               color: 'var(--text2)' },
  ] : []

  // Merge live WS events into top of feed
  const allActivity = [...liveEvents.filter(e => e.data), ...activity]

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">System Dashboard</h1>
        <p className="page-subtitle">Real-time metrics for the cycle-safe referral engine</p>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {metrics ? cards.map(c => <MetricCard key={c.label} {...c} />) : (
          Array(7).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ height: 110, background: 'var(--bg3)', animation: 'pulse-dot 1.5s infinite' }} />
          ))
        )}
      </div>

      {/* Ratio bar */}
      {metrics && metrics.total_referrals > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>Referral health</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>
              {metrics.valid_referrals} valid · {metrics.rejected_referrals} rejected
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${(metrics.valid_referrals / metrics.total_referrals) * 100}%`,
              background: 'linear-gradient(90deg, var(--green), var(--accent))',
              transition: 'width 0.5s',
            }} />
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Activity Feed</h2>
          <span className="tag tag-blue">live</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {allActivity.length === 0 && (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No activity yet</div>
          )}
          {allActivity.slice(0, 25).map((e, i) => {
            const { icon, color } = eventIcon(e.type)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
                borderBottom: i < allActivity.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, background: `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color, flexShrink: 0, marginTop: 1,
                }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{eventLabel(e)}</div>
                  {e.details && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{e.details}</div>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  {e.timestamp ? formatDistanceToNow(new Date(e.timestamp), { addSuffix: true }) : 'just now'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
