import React, { useEffect, useState } from 'react'
import { fetchUsers, fetchUserRewards, createUser } from '../utils/api'
import { formatDistanceToNow } from 'date-fns'
import { Plus, X } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [rewards, setRewards] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = () => fetchUsers().then(setUsers).catch(() => {})

  useEffect(() => { load() }, [])

  const openUser = (u) => {
    setSelectedUser(u)
    fetchUserRewards(u.id).then(setRewards).catch(() => setRewards([]))
  }

  const handleCreate = async () => {
    if (!form.name || !form.email) return
    setCreating(true)
    try {
      await createUser(form)
      setMsg({ ok: true, text: `User "${form.name}" created!` })
      setForm({ name: '', email: '' })
      setShowCreate(false)
      load()
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'Error creating user' })
    }
    setCreating(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const statusColor = s => s === 'active' ? 'var(--green)' : s === 'flagged' ? 'var(--red)' : 'var(--text3)'

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} registered users</p>
        </div>
        <button onClick={() => setShowCreate(s => !s)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, background: 'var(--accent)',
          color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={14} /> New User
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          background: msg.ok ? 'rgba(62,207,142,0.1)' : 'rgba(247,95,95,0.1)',
          border: `1px solid ${msg.ok ? 'var(--green)' : 'var(--red)'}`,
          color: msg.ok ? 'var(--green)' : 'var(--red)', fontSize: 13,
        }}>{msg.text}</div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>NAME</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="Jane Doe"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>EMAIL</label>
            <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="jane@example.com"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
          </div>
          <button onClick={handleCreate} disabled={creating} style={{
            padding: '8px 20px', borderRadius: 6, background: 'var(--green)',
            color: '#fff', fontSize: 13, fontWeight: 600, height: 38,
          }}>{creating ? '...' : 'Create'}</button>
          <button onClick={() => setShowCreate(false)} style={{
            padding: '8px', borderRadius: 6, background: 'var(--bg3)',
            color: 'var(--text2)', border: '1px solid var(--border)', height: 38,
          }}><X size={14} /></button>
        </div>
      )}

      <div className={`users-layout ${selectedUser ? 'has-selection' : ''}`}>
        {/* Users table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Status', 'Balance', 'Joined'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}
                  onClick={() => openUser(u)}
                  style={{
                    borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    background: selectedUser?.id === u.id ? 'var(--accent)08' : 'transparent',
                  }}>
                  <td style={{ padding: '11px 16px', fontSize: 13 }}>
                    {u.name}
                    {u.is_root && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>root</span>}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{u.email}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ color: statusColor(u.status), fontSize: 12, fontFamily: 'var(--mono)' }}>● {u.status}</span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--yellow)' }}>₹{u.reward_balance}</td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Reward panel */}
        {selectedUser && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>{selectedUser.name}</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', color: 'var(--text3)' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                ['Balance', `₹${selectedUser.reward_balance}`, 'var(--yellow)'],
                ['Status', selectedUser.status, statusColor(selectedUser.status)],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 10 }}>REWARD HISTORY ({rewards.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflow: 'auto' }}>
              {rewards.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>No rewards yet</div>}
              {rewards.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg3)', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--yellow)' }}>+₹{r.amount}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>depth {r.depth_level}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
