'use client'

import React, { useEffect, useRef, useState } from 'react'

type EnvelopeInfo = {
  envelope: { id: string; document_type: string; filename: string; status: string }
  recipient: { id: string; name: string; email: string; status: string }
  pdfUrl: string
}

export default function SignPage({ params }: { params: { token: string } }) {
  const token = params.token
  const [info, setInfo] = useState<EnvelopeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/esign/${token}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        setInfo(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const getPos = (evt: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: evt.clientX - rect.left, y: evt.clientY - rect.top }
    }

    const onDown = (e: PointerEvent) => {
      drawing.current = true
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
    const onMove = (e: PointerEvent) => {
      if (!drawing.current) return
      const { x, y } = getPos(e)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#000'
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    const onUp = () => {
      drawing.current = false
      ctx.closePath()
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [canvasRef.current])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const submitSignature = async () => {
    if (!canvasRef.current) return
    setSubmitting(true)
    setError(null)
    try {
  const dataUrl = canvasRef.current.toDataURL('image/png')
  const signature_base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      const res = await fetch(`/api/esign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_base64 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to submit signature')
      // Reload envelope status
      const refreshed = await fetch(`/api/esign/${token}`)
      const refreshedData = await refreshed.json()
      setInfo(refreshedData)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sign Document</h1>
      {loading && <div>Loading…</div>}
      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {info && (
        <div className="space-y-6">
          <div className="rounded border p-4">
            <div className="mb-3 text-sm text-gray-600">
              <div>Document: {info.envelope.filename}</div>
              <div>Recipient: {info.recipient.name} ({info.recipient.email})</div>
              <div>Status: {info.envelope.status}</div>
            </div>
            <div className="h-[70vh]">
              <iframe src={info.pdfUrl} className="h-full w-full" title="Document PDF" />
            </div>
          </div>
          <div className="rounded border p-4">
            <div className="mb-2 font-medium">Draw your signature</div>
            <canvas ref={canvasRef} width={700} height={200} className="w-full border" />
            <div className="mt-3 flex gap-2">
              <button onClick={clearCanvas} className="rounded bg-gray-200 px-3 py-2 text-sm">Clear</button>
              <button
                onClick={submitSignature}
                disabled={submitting}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Signature'}
              </button>
            </div>
            {info.envelope.status === 'Completed' && (
              <div className="mt-3 text-green-700">All parties have signed. You may close this window.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
