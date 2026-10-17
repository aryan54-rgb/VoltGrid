import { useEffect, useRef } from 'react'

const palette = ['#10b981', '#34d399', '#a7f3d0']

export default function TelemetryCanvas({ boosted, resetToken }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let width = 0
    let height = 0
    let lastTime = 0
    let particles = []

    const nodes = () => [
      { x: width * .18, y: height * .5, label: 'GRID POWER' },
      { x: width * .5, y: height * .5, label: 'DC FAST CHARGER' },
      { x: width * .82, y: height * .5, label: 'EV FLEET BAY' },
    ]

    const seed = () => {
      particles = Array.from({ length: 40 }, (_, index) => ({
        segment: index < 20 ? 0 : 1,
        progress: Math.random(),
        speed: .28 + Math.random() * .35,
        size: 1.6 + Math.random() * 2,
      }))
    }

    const draw = (time = 0) => {
      const delta = Math.min((time - lastTime) / 1000 || 0, .05)
      lastTime = time
      context.clearRect(0, 0, width, height)
      const points = nodes()
      const [grid, charger, fleet] = points

      const line = (stroke, lineWidth) => {
        context.beginPath()
        context.moveTo(grid.x, grid.y)
        context.lineTo(charger.x, charger.y)
        context.lineTo(fleet.x, fleet.y)
        context.strokeStyle = stroke
        context.lineWidth = lineWidth
        context.stroke()
      }
      line('rgba(16,185,129,.18)', 5)
      line('rgba(52,211,153,.48)', 1.5)

      particles.forEach((particle) => {
        if (!media.matches && !document.hidden) {
          particle.progress = (particle.progress + delta * particle.speed * (boosted ? 1.7 : 1)) % 1
        }
        const start = points[particle.segment]
        const end = points[particle.segment + 1]
        const x = start.x + (end.x - start.x) * particle.progress
        context.beginPath()
        context.arc(x, start.y, particle.size, 0, Math.PI * 2)
        context.fillStyle = '#a7f3d0'
        context.shadowBlur = 12
        context.shadowColor = '#10b981'
        context.fill()
        context.shadowBlur = 0
      })

      points.forEach((point, index) => {
        context.beginPath()
        context.arc(point.x, point.y, 23, 0, Math.PI * 2)
        context.fillStyle = 'rgba(16,185,129,.08)'
        context.fill()
        context.strokeStyle = 'rgba(16,185,129,.36)'
        context.stroke()

        context.beginPath()
        context.arc(point.x, point.y, 10, 0, Math.PI * 2)
        context.fillStyle = palette[index]
        context.shadowBlur = 18
        context.shadowColor = palette[index]
        context.fill()
        context.shadowBlur = 0

        context.fillStyle = '#9cafad'
        context.textAlign = 'center'
        context.font = `${width < 470 ? 9 : 11}px ui-monospace, SFMono-Regular, Consolas, monospace`
        context.fillText(point.label, point.x, point.y + 42)
      })

      if (!media.matches) frame = window.requestAnimationFrame(draw)
    }

    const resize = () => {
      const box = canvas.getBoundingClientRect()
      width = box.width
      height = box.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      window.cancelAnimationFrame(frame)
      lastTime = 0
      draw()
    }

    const motionChange = () => resize()
    seed()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    media.addEventListener('change', motionChange)
    resize()
    return () => {
      observer.disconnect()
      media.removeEventListener('change', motionChange)
      window.cancelAnimationFrame(frame)
    }
  }, [boosted, resetToken])

  return <canvas ref={canvasRef} className="vg2-canvas" role="img" aria-label="Animated energy flow from grid power through a fast charger to an electric fleet bay" />
}
