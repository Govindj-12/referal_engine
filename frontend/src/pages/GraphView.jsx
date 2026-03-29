import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { fetchUsers, fetchUserGraph } from '../utils/api'

export default function GraphView() {
  const svgRef = useRef()
  const [users, setUsers] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [depth, setDepth] = useState(3)
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    fetchUsers().then(u => {
      setUsers(u)
      if (u.length > 0) setSelectedId(u.find(x => x.is_root)?.id || u[0].id)
    })
  }, [])

  useEffect(() => {
    if (selectedId) {
      setLoading(true)
      fetchUserGraph(selectedId, depth)
        .then(g => { setGraph(g); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [selectedId, depth])

  useEffect(() => {
    if (!graph || !svgRef.current) return
    const container = svgRef.current.parentElement
    const W = container.clientWidth || 800
    const H = 520

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', W).attr('height', H)

    // Defs: arrowhead
    svg.append('defs').append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 -5 10 10')
      .attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#0d7a67').attr('opacity', 0.6)

    const nodes = graph.nodes.map(n => ({ ...n }))
    const links = graph.edges.map(e => ({ source: e.source, target: e.target }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(108).strength(0.82))
      .force('charge', d3.forceManyBody().strength(-235))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide(32))
      .alphaDecay(0.015)
      .velocityDecay(0.17)

    const g = svg.append('g')

    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform)))

    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#0d7a6766').attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

    const nodeG = g.append('g').selectAll('g').data(nodes).join('g')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.12).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('mouseenter', (e, d) => setTooltip({ x: e.offsetX, y: e.offsetY, node: d }))
      .on('mouseleave', () => setTooltip(null))

    nodeG.append('circle')
      .attr('r', d => d.id === selectedId ? 18 : 14)
      .attr('fill', d => {
        if (d.status === 'flagged') return '#f75f5f22'
        if (d.is_root) return '#0d7a6722'
        return '#b7642f22'
      })
      .attr('stroke', d => {
        if (d.status === 'flagged') return '#bb3b2f'
        if (d.is_root) return '#0d7a67'
        if (d.id === selectedId) return '#238f50'
        return '#b7642f'
      })
      .attr('stroke-width', d => d.id === selectedId ? 3 : 1.5)

    nodeG.append('text')
      .attr('text-anchor', 'middle').attr('dy', '0.35em')
      .attr('fill', '#e7eef6').attr('font-size', '8px')
      .attr('font-family', 'JetBrains Mono')
      .text(d => d.name.split(' ')[0].slice(0, 6))

    nodeG.append('text')
      .attr('text-anchor', 'middle').attr('dy', 26)
      .attr('fill', '#9eb2c7').attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono')
      .text(d => `₹${d.reward_balance}`)

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [graph, selectedId])

  const statusColor = s => s === 'flagged' ? 'var(--red)' : s === 'active' ? 'var(--green)' : 'var(--text3)'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Referral Graph</h1>
        <p className="page-subtitle">DAG visualization - drag nodes, scroll to zoom</p>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>SELECT USER</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{
            background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)',
            padding: '6px 12px', borderRadius: 6, fontSize: 13, minWidth: 200,
          }}>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} {u.is_root ? '(root)' : ''}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>DEPTH</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4, 5].map(d => (
              <button key={d} onClick={() => setDepth(d)} style={{
                width: 34, height: 34, borderRadius: 6,
                background: depth === d ? 'var(--accent)' : 'var(--bg3)',
                color: depth === d ? '#fff' : 'var(--text2)',
                border: '1px solid ' + (depth === d ? 'var(--accent)' : 'var(--border2)'),
                fontSize: 13, fontWeight: 600,
              }}>{d}</button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { color: '#0d7a67', label: 'Root node' },
            { color: '#b7642f', label: 'Regular' },
            { color: '#238f50', label: 'Selected' },
            { color: '#bb3b2f', label: 'Flagged' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* SVG canvas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', minHeight: 520 }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg2)', zIndex: 10,
          }}>
            <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>building graph...</div>
          </div>
        )}
        <svg ref={svgRef} style={{ display: 'block', width: '100%' }} />

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 10,
            background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '10px 14px', pointerEvents: 'none', zIndex: 20,
            minWidth: 160,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{tooltip.node.name}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
              {tooltip.node.email}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 4 }}>
              Balance: <span style={{ color: 'var(--yellow)' }}>₹{tooltip.node.reward_balance}</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className={`tag ${tooltip.node.status === 'active' ? 'tag-green' : 'tag-red'}`}>
                {tooltip.node.status}
              </span>
              {tooltip.node.is_root && <span className="tag tag-blue">root</span>}
            </div>
          </div>
        )}
      </div>

      {/* Node list */}
      {graph && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Nodes in view ({graph.nodes.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {graph.nodes.map(n => (
              <div key={n.id} onClick={() => setSelectedId(n.id)} style={{
                padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                background: n.id === selectedId ? 'var(--accent)18' : 'var(--bg3)',
                border: '1px solid ' + (n.id === selectedId ? 'var(--accent)' : 'var(--border)'),
                fontSize: 12,
              }}>
                <span style={{ color: statusColor(n.status) }}>●</span>{' '}
                {n.name}
                {n.is_root && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 4 }}>root</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
