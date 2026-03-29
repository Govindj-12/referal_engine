import React, { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import Referrals from './pages/Referrals'
import FraudMonitor from './pages/FraudMonitor'
import UsersPage from './pages/UsersPage'
import Simulator from './pages/Simulator'
import ClaimPage from './pages/ClaimPage'
import { useWebSocket } from './hooks/useWebSocket'

function AppInner() {
  const [liveEvents, setLiveEvents] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleWsEvent = useCallback((event) => {
    setLiveEvents(prev => [event, ...prev].slice(0, 20))
    setRefreshKey(k => k + 1)
  }, [])

  const wsConnected = useWebSocket(handleWsEvent)

  return (
    <div className="app-shell">
      <Sidebar wsConnected={wsConnected} liveEvents={liveEvents} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard refreshKey={refreshKey} liveEvents={liveEvents} />} />
          <Route path="/graph" element={<GraphView />} />
          <Route path="/referrals" element={<Referrals refreshKey={refreshKey} />} />
          <Route path="/fraud" element={<FraudMonitor refreshKey={refreshKey} />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/simulate" element={<Simulator />} />
          <Route path="/claim" element={<ClaimPage onSuccess={() => setRefreshKey(k => k + 1)} />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
