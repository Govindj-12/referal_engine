import React, { useState, useEffect } from 'react'
import { fetchUsers, simulateRewards } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { FlaskConical } from 'lucide-react'

export default function Simulator() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ referrer_id: '', reward_percent: 10, depth: 3, num_referrals: 5 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUsers().then(u => {
      setUsers(u)
      if (u.length > 0) setForm(f => ({ ...f, referrer_id: u[0].id }))
    })
  }, [])

  const run = async () => {
    if (!form.referrer_id) return
    setLoading(true); setError(null)
    try {
      const r = await simulateRewards(form)
      setResult(r)
    } catch (e) {
      setError(e.response?.data?.detail || 'Simulation error')
    }
    setLoading(false)
  }

  const COLORS = ['#0d7a67', '#b7642f', '#238f50', '#ca6d2a', '#bb3b2f']

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reward Simulator</h1>
        <p className="page-subtitle">Project reward cost before applying rule changes</p>
      </div>

      <div className="two-col-layout">
        {/* Config panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={16} color="var(--accent2)" />
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Simulation Config</h3>
          </div>

          {[
            { label: 'REFERRER', key: 'referrer_id', type: 'select' },
            { label: 'REWARD %', key: 'reward_percent', type: 'number', min: 0.1, max: 100, step: 0.5 },
            { label: 'DEPTH', key: 'depth', type: 'number', min: 1, max: 5, step: 1 },
            { label: 'PROJECTED REFERRALS', key: 'num_referrals', type: 'number', min: 1, max: 1000, step: 1 },
          ].map(({ label, key, type, ...rest }) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{label}</label>
              {type === 'select' ? (
                <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  color: 'var(--text)', padding: '7px 12px', borderRadius: 6, fontSize: 13,
                }}>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <input type="number" value={form[key]} {...rest}
                  onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '7px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'var(--mono)' }} />
              )}
            </div>
          ))}

          <button onClick={run} disabled={loading} style={{
            padding: '10px', borderRadius: 8, background: 'var(--accent2)',
            color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 4,
          }}>{loading ? 'Simulating...' : 'Run Simulation'}</button>
          {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 6 }}>Projected Total Cost</div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--yellow)', letterSpacing: '-0.03em' }}>₹{result.projected_cost}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
                  <div>Reward %: <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{form.reward_percent}%</span></div>
                  <div>Depth: <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{form.depth}</span></div>
                  <div>Referrals: <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{form.num_referrals}</span></div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="card">
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Cost by Depth Level</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={result.breakdown} barSize={40}>
                    <XAxis dataKey="depth" tick={{ fill: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)' }} tickFormatter={v => `L${v}`} />
                    <YAxis tick={{ fill: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)' }} tickFormatter={v => `₹${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8 }}
                      formatter={(v, n) => [`₹${v}`, n]}
                    />
                    <Bar dataKey="subtotal" radius={[4, 4, 0, 0]}>
                      {result.breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Depth', 'Ancestors', 'Reward/Referral', 'Subtotal'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < result.breakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13 }}>Level {row.depth}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13 }}>{row.ancestors}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--yellow)' }}>₹{row.reward_per_referral}</td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: COLORS[i % COLORS.length] }}>₹{row.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text3)' }}>
              <FlaskConical size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>Configure and run a simulation to see projected costs</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
