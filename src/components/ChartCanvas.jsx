import React, { useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'

export default function ChartCanvas({
  data,
  chartState,
  hoverData,
  setHoverData,
  setChartState,
  onReset,
}) {
  const canvasRef = useRef(null)

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    const padding = { top: 60, right: 60, bottom: 60, left: 90 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    // Price range
    let minP = Infinity, maxP = -Infinity
    data.forEach(d => {
      minP = Math.min(minP, d.low)
      maxP = Math.max(maxP, d.high)
    })
    const range = maxP - minP
    const pad = range * 0.1 / chartState.priceScale
    minP -= pad; maxP += pad

    const total = data.length
    const base = chartW / total
    const candleW = Math.max(2, base * chartState.scale * 0.7)
    const spacing = Math.max(3, base * chartState.scale * 0.3)
    const priceToY = p => padding.top + chartH * (1 - (p - minP) / (maxP - minP))

    // === GRID LINES ===
    ctx.strokeStyle = '#1f1f1f'
    ctx.lineWidth = 1
    for (let i = 0; i <= 8; i++) {
      const y = padding.top + (chartH / 8) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // === Y-AXIS LABELS ===
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 8; i++) {
      const price = maxP - (maxP - minP) * (i / 8)
      const y = padding.top + (chartH / 8) * i
      ctx.fillText(price.toFixed(2), padding.left - 12, y + 5)
    }

    // === CANDLES ===
    let hoverIdx = -1
    data.forEach((c, i) => {
      const x = padding.left + chartState.offsetX + i * (candleW + spacing)
      if (x + candleW < padding.left || x > width - padding.right) return

      const bullish = c.close >= c.open
      const color = bullish ? '#26a69a' : '#ef5350'

      const highY = priceToY(c.high)
      const lowY = priceToY(c.low)
      const openY = priceToY(c.open)
      const closeY = priceToY(c.close)

      // Wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + candleW / 2, highY)
      ctx.lineTo(x + candleW / 2, lowY)
      ctx.stroke()

      // Body
      ctx.fillStyle = color
      const bodyH = Math.abs(closeY - openY)
      const bodyY = Math.min(openY, closeY)
      ctx.fillRect(x, bodyY, candleW, Math.max(1, bodyH))

      // Hover detection
      if (hoverData && Math.abs(hoverData.x - (x + candleW / 2)) < (candleW + spacing) / 2) {
        hoverIdx = i

        // Vertical crosshair
        ctx.strokeStyle = '#64748b'
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(x + candleW / 2, padding.top)
        ctx.lineTo(x + candleW / 2, height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // === X-AXIS LABELS (dynamic interval fix) ===
    ctx.fillStyle = '#94a3b8'
    ctx.font = '13px monospace'
    ctx.textAlign = 'center'

    let interval = Math.floor(total / 12)
    const scaleFactor = chartState.scale || 1
    interval = Math.max(1, Math.floor(interval / scaleFactor))
    if (interval < 1) interval = 1

    data.forEach((c, i) => {
      if (i % interval === 0) {
        const x = padding.left + chartState.offsetX + i * (candleW + spacing) + candleW / 2
        if (x >= padding.left && x <= width - padding.right) {
          ctx.fillText(c.time, x, height - padding.bottom + 25)
        }
      }
    })

    // === AXES ===
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()

    // === HORIZONTAL CROSSHAIR (price) ===
    if (hoverData && hoverData.y >= padding.top && hoverData.y <= height - padding.bottom) {
      const price = maxP - (hoverData.y - padding.top) / chartH * (maxP - minP)
      ctx.strokeStyle = '#64748b'
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(padding.left, hoverData.y)
      ctx.lineTo(width - padding.right, hoverData.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Price badge
      const badgeW = 80, badgeH = 28
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(padding.left - badgeW - 10, hoverData.y - badgeH / 2, badgeW, badgeH)
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(price.toFixed(2), padding.left - 15, hoverData.y + 5)
    }

    // === OHLC TOOLTIP ===
    if (hoverIdx >= 0 && hoverIdx < data.length) {
      const c = data[hoverIdx]
      const bullish = c.close >= c.open

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(padding.left + 15, padding.top + 15, 360, 56)

      ctx.font = 'bold 15px monospace'
      ctx.textAlign = 'left'
      const infos = [
        { l: 'O', v: c.open.toFixed(2), col: '#94a3b8' },
        { l: 'H', v: c.high.toFixed(2), col: '#94a3b8' },
        { l: 'L', v: c.low.toFixed(2), col: '#94a3b8' },
        { l: 'C', v: c.close.toFixed(2), col: bullish ? '#26a69a' : '#ef5350' },
      ]
      let x = padding.left + 30
      infos.forEach(i => {
        ctx.fillStyle = i.col
        ctx.fillText(`${i.l}: ${i.v}`, x, padding.top + 38)
        x += 90
      })

      ctx.fillStyle = '#64748b'
      ctx.font = '13px monospace'
      ctx.fillText(c.timestamp, padding.left + 30, padding.top + 58)
    }
  }

  useEffect(() => {
    if (!data) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    drawChart()

    const onResize = () => drawChart()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [data, chartState, hoverData])

  // === Mouse Events ===
  const handleMouseDown = e => {
    setChartState(p => ({ ...p, isDragging: true, startX: e.clientX, startOffsetX: p.offsetX }))
  }

  const handleMouseMove = e => {
    const rect = canvasRef.current.getBoundingClientRect()
    setHoverData({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (chartState.isDragging) {
      const dx = e.clientX - chartState.startX
      setChartState(p => ({ ...p, offsetX: p.startOffsetX + dx }))
    }
  }

  const handleMouseUp = () => {
    setChartState(p => ({ ...p, isDragging: false }))
  }

  const handleWheel = e => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const overYAxis = mouseX < 90
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setChartState(p => ({
      ...p,
      ...(overYAxis
        ? { priceScale: Math.max(0.1, Math.min(10, p.priceScale * delta)) }
        : { scale: Math.max(0.1, Math.min(10, p.scale * delta)) })
    }))
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Sleek Dark Theme Button */}
      <button
        onClick={onReset}
        className="group absolute right-6 top-6 flex items-center gap-2 rounded-xl
                   bg-[#0f172a] px-5 py-2.5 text-sm font-medium text-cyan-400
                   border border-cyan-700/50 shadow-[0_0_10px_rgba(0,255,255,0.1)]
                   transition-all duration-300
                   hover:text-cyan-300 hover:border-cyan-400/60
                   hover:shadow-[0_0_18px_rgba(0,255,255,0.3)]
                   hover:-translate-y-[1px] active:scale-95"
      >
        <RotateCcw
          size={16}
          className="transition-transform duration-500 group-hover:rotate-[360deg] text-cyan-400"
        />
        <span>Load New</span>
      </button>
    </div>
  )
}
