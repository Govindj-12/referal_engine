import React, { useEffect, useState } from 'react'
import { fetchFraudFlags, fetchFraudStats } from '../utils/api'
import { formatDistanceToNow } from 'date-fns'
import { ShieldAlert, AlertTriangle, Zap, Copy, Ban } from 'lucide-react'

const REASON_META = {
  cycle:          { label: 'Cycle Detected',   icon: Ban,           color: 'var(--red)',    tag: 'tag-red'    },
  self_referral:  { label: 'Self Referral',     icon: AlertTriangle, color: 'var(--orange)', tag: 'tag-orange' },
  velocity_limit: { label: 'Velocity Limit',    icon: Zap,           color: 'var(--yellow)', tag: 'tag-orange' },
  duplicate:      { label: 'Duplicate',         icon: Copy,          color: 'var(--accent2)',tag: 'tag-purple' },
}

export default function FraudMonitor({ refreshKey }) {
  const [flags, setFlags] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchFraudFlags(100).then(setFlags).catch(() => {})
    fetchFraudStats().then(setStats).catch(() => {})
  }, [refreshKey])

  const filtered = filter === 'all' ? flags : flags.filter(f => f.reason === filter)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Fraud Monitor</h1>
        <p className="page-subtitle">Rejected referrals and fraud detections</p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(REASON_META).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <div key={key} className="card" style={{ cursor: 'pointer', border: filter === key ? `1px solid ${meta.color}` : '1px solid var(--border)' }}
              onClick={() => setFilter(filter === key ? 'all' : key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={meta.color} />
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{key.replace('_', ' ')}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: meta.color }}>{stats[key] || 0}</div>
            </div>
          )
        })}
        <div className="card">
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 8 }}>Total Flags</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{flags.length}</div>
        </div>
      </div>

      {/* Flags table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldAlert size={16} color="var(--red)" />
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Fraud Flags {filter !== 'all' && `— ${REASON_META[filter]?.label}`}</h2>
          <button onClick={() => setFilter('all')} style={{
            marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, fontSize: 11,
            background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)',
            display: filter !== 'all' ? 'block' : 'none',
          }}>Clear filter</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User ID', 'Attempted Referrer', 'Reason', 'Details', 'Time'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>No fraud flags</td></tr>
            )}
            {filtered.map((f, i) => {
              const meta = REASON_META[f.reason] || { label: f.reason, tag: 'tag-red' }
              return (
                <tr key={f.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                    {f.user_id.slice(0, 16)}…
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                    {f.attempted_referrer_id ? f.attempted_referrer_id.slice(0, 16) + '…' : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`tag ${meta.tag}`}>{meta.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)', maxWidth: 280 }}>
                    {f.details || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
