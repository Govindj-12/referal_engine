import React, { useEffect, useState } from 'react'
import { fetchAllReferrals } from '../utils/api'
import { formatDistanceToNow } from 'date-fns'

export default function Referrals({ refreshKey }) {
  const [referrals, setReferrals] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchAllReferrals(100).then(setReferrals).catch(() => {})
  }, [refreshKey])

  const filtered = filter === 'all' ? referrals
    : filter === 'valid' ? referrals.filter(r => r.is_valid)
    : referrals.filter(r => !r.is_valid)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Referrals</h1>
        <p className="page-subtitle">All referral edges in the DAG</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'valid', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: filter === f ? 'var(--accent)' : 'var(--bg2)',
            color: filter === f ? '#fff' : 'var(--text2)',
            border: '1px solid ' + (filter === f ? 'var(--accent)' : 'var(--border)'),
            textTransform: 'capitalize',
          }}>{f} ({filter === f ? filtered.length : f === 'all' ? referrals.length : f === 'valid' ? referrals.filter(r => r.is_valid).length : referrals.filter(r => !r.is_valid).length})</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['New User', 'Referrer', 'Status', 'Reason', 'Created', 'Expires'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 11,
                  color: 'var(--text3)', fontFamily: 'var(--mono)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No referrals</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id} style={{
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'var(--bg3)18',
              }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <div>{r.new_user_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{r.new_user_id.slice(0, 12)}…</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <div>{r.referrer_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{r.referrer_id.slice(0, 12)}…</div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`tag ${r.is_valid ? 'tag-green' : 'tag-red'}`}>
                    {r.is_valid ? 'valid' : 'rejected'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {r.rejection_reason || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: r.expires_at ? 'var(--orange)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  {r.expires_at ? formatDistanceToNow(new Date(r.expires_at), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
