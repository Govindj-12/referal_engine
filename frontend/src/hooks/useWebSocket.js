import { useEffect, useRef, useState, useCallback } from 'react'

export function useWebSocket(onEvent) {
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.host
    ws.current = new WebSocket(`${proto}://${host}/api/ws`)

    ws.current.onopen = () => setConnected(true)
    ws.current.onclose = () => {
      setConnected(false)
      setTimeout(connect, 3000)
    }
    ws.current.onerror = () => ws.current?.close()
    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type !== 'ping') onEventRef.current?.(msg)
      } catch {}
    }
  }, [])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return connected
}
