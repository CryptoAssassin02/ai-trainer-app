'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type ProgressiveEvent =
  | { type: 'structure_generated'; data: any }
  | { type: 'mesocycle_progress'; data: { planId: string; mesocycleNumber: number; status: 'generating' | 'complete' } }
  | { type: 'completed'; data: { planId: string } }
  | { type: 'error'; data: { message: string; details?: any } }

export function useWorkoutGeneration() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastEvent, setLastEvent] = useState<ProgressiveEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const disconnect = useCallback(() => {
    try {
      abortRef.current?.abort()
    } catch {}
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const connectProgressive = useCallback(async (
    planId: string,
    requestBody: Record<string, any> = {},
    onEvent?: (evt: ProgressiveEvent) => void
  ) => {
    if (isStreaming) return
    setError(null)
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'
    const token = (typeof window !== 'undefined') ? (sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')) : null

    try {
      const res = await fetch(`${baseURL}/workouts/${planId}/generate-progressive`, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody || {}),
        signal: controller.signal
      })

      if (!res.ok || !res.body) {
        throw new Error(`Failed to open SSE stream (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      // Parse SSE chunks line-by-line
      const processChunk = (text: string) => {
        buffer += text
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)

          const lines = rawEvent.split('\n')
          let eventType: string | null = null
          let dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim()
            }
          }

          if (!eventType) continue
          try {
            const data = dataStr ? JSON.parse(dataStr) : {}
            const mapped: ProgressiveEvent = { type: eventType as any, data } as ProgressiveEvent
            setLastEvent(mapped)
            onEvent?.(mapped)
            if (eventType === 'completed' || eventType === 'error') {
              disconnect()
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      // Read loop
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        processChunk(chunk)
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      const msg = e?.message || 'SSE connection failed'
      setError(msg)
      onEvent?.({ type: 'error', data: { message: msg } })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [disconnect, isStreaming])

  useEffect(() => () => disconnect(), [disconnect])

  return {
    isStreaming,
    lastEvent,
    error,
    connectProgressive,
    disconnect,
  }
}

export type UseWorkoutGenerationReturn = ReturnType<typeof useWorkoutGeneration>


