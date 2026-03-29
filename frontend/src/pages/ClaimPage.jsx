import React, { useState, useEffect } from 'react'
import { fetchUsers, claimReferral } from '../utils/api'
import { Zap, CheckCircle, XCircle } from 'lucide-react'

export default function ClaimPage({ onSuccess }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ new_user_id: '', referrer_id: '', expires_in_days: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetchUsers().then(u => {
      setUsers(u)
      if (u.length >= 2) {
        setForm(f => ({ ...f, new_user_id: u[0].id, referrer_id: u[1].id }))
      }
    })
  }, [])

  const handleClaim = async () => {
    if (!form.new_user_id || !form.referrer_id) return
    setLoading(true); setResult(null)
    try {
      const body = {
        new_user_id: form.new_user_id,
        referrer_id: form.referrer_id,
        ...(form.expires_in_days ? { expires_in_days: parseInt(form.expires_in_days) } : {}),
      }
      const r = await claimReferral(body)
      setResult(r)
      if (r.success) onSuccess?.()
    } catch (e) {
      setResult({ success: false, message: e.response?.data?.detail || 'Request failed' })
    }
    setLoading(false)
  }

  const Field = ({ label, field, type = 'select', placeholder }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{label}</label>
      {type === 'select' ? (
        <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{
          background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
          padding: '9px 12px', borderRadius: 8, fontSize: 13,
        }}>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
          ))}
        </select>
      ) : (
        <input
          type="number" placeholder={placeholder} value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontFamily: 'var(--mono)' }}
        />
      )}
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Claim Referral</h1>
        <p className="page-subtitle">
          Test the cycle detection engine in real time
        </p>
      </div>

      <div className="claim-layout">
        {/* Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Zap size={16} color="var(--accent)" />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Referral Claim</h3>
          </div>

          <Field label="NEW USER (child)" field="new_user_id" />
          <Field label="REFERRER (parent)" field="referrer_id" />
          <Field label="EXPIRES IN DAYS (optional — temporal expiry)" field="expires_in_days" type="number" placeholder="e.g. 30" />

          <button onClick={handleClaim} disabled={loading} style={{
            padding: '11px', borderRadius: 8, marginTop: 4,
            background: loading ? 'var(--bg3)' : 'linear-gradient(135deg, var(--accent), var(--accent2))',
            color: loading ? 'var(--text3)' : '#fff', fontWeight: 700, fontSize: 14,
            transition: 'all 0.2s',
          }}>
            {loading ? 'Checking DAG…' : '⚡ Claim Referral'}
          </button>

          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', lineHeight: 1.6 }}>
            The engine will check for:<br />
            • Self-referral<br />
            • Velocity limit<br />
            • Duplicate referral<br />
            • DAG cycle detection
          </div>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="card" style={{
              borderColor: result.success ? 'var(--green)' : 'var(--red)',
              borderWidth: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                {result.success
                  ? <CheckCircle size={24} color="var(--green)" />
                  : <XCircle size={24} color="var(--red)" />
                }
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: result.success ? 'var(--green)' : 'var(--red)' }}>
                    {result.success ? 'Referral Accepted' : 'Referral Rejected'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{result.message}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {[
                  ['Reason', result.reason || (result.success ? 'valid' : '—')],
                  ['Response Time', result.response_time_ms != null ? `${result.response_time_ms}ms` : '—'],
                  ['Detection Time', result.detection_time_ms != null ? `${result.detection_time_ms}ms` : '—'],
                  ['Root Assigned', result.user_assigned_as_root ? 'Yes' : 'No'],
                  ...(result.referral_id ? [['Referral ID', result.referral_id.slice(0, 12) + '…']] : []),
                  ...(result.rewards_distributed ? [['Rewards Sent', result.rewards_distributed.length]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)' }}>{String(val)}</div>
                  </div>
                ))}
              </div>

              {result.rewards_distributed?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 8 }}>REWARDS DISTRIBUTED</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {result.rewards_distributed.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'rgba(62,207,142,0.08)',
                        borderRadius: 6, border: '1px solid rgba(62,207,142,0.2)',
                      }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                          Depth {r.depth} — {r.user_id.slice(0, 16)}…
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)' }}>
                          +₹{r.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text3)' }}>
              <Zap size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>Submit a claim to see cycle detection results</div>
              <div style={{ fontSize: 12, marginTop: 8, fontFamily: 'var(--mono)' }}>
                Target: &lt;100ms detection time
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>How DAG Cycle Detection Works</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['1', 'Proposed edge: new_user → referrer is loaded', 'var(--accent)'],
                ['2', 'Full graph is built from DB using NetworkX DiGraph', 'var(--accent2)'],
                ['3', 'Edge is added temporarily and is_directed_acyclic_graph() is checked', 'var(--green)'],
                ['4', 'If cycle: edge rejected, user flagged as fraud and assigned root', 'var(--red)'],
                ['5', 'If valid: edge committed, rewards propagated up the chain', 'var(--green)'],
              ].map(([n, desc, color]) => (
                <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: `${color}20`,
                    border: `1px solid ${color}`, color, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{n}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, paddingTop: 3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
