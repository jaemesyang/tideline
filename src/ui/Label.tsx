import { useEffect, useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'
import { getSlot, labelSlots, layerEl, requestFrame } from './labelBridge'
import type { WrackItem } from '../seed/deriveWorld'
import { SpecimenLinks } from './SpecimenLinks'

// Field-log labels. Position, opacity, and leader lines are written every
// frame by the projector in scene/Specimen.tsx via labelBridge — React only
// owns content and the open/closed state (one card open at a time).

function LabelCard({ item, open, onToggle }: { item: WrackItem; open: boolean; onToggle: () => void }) {
  const { specimen } = item
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const slot = getSlot(specimen.id)
    slot.card = el
    const ro = new ResizeObserver(() => {
      slot.w = el.offsetWidth
      slot.h = el.offsetHeight
      if (!el.classList.contains('compact')) slot.hFull = slot.h
      requestFrame.current?.() // on-demand rendering: re-run the projector
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      slot.card = null
    }
  }, [specimen.id])

  return (
    <div ref={ref} className={open ? 'label open' : 'label'} style={{ opacity: 0, visibility: 'hidden' }}>
      <button
        type="button"
        className="label-head"
        aria-expanded={open}
        aria-controls={`detail-${specimen.id}`}
        onClick={onToggle}
      >
        <span className="label-meta">
          <span>{item.catalogueNo}</span>
          <span>{specimen.year}</span>
        </span>
        <span className="label-title">{specimen.title}</span>
        <span className="label-summary">{specimen.summary}</span>
        <span className="label-more">{open ? '− close' : '+ detail'}</span>
      </button>
      <div id={`detail-${specimen.id}`} className="label-detail">
        <div>
          <p>{specimen.detail}</p>
          <SpecimenLinks links={specimen.links} className="label-links" />
        </div>
      </div>
    </div>
  )
}

export function LabelLayer() {
  const wrack = useSeed((s) => s.world.wrack)
  const [openId, setOpenId] = useState<string | null>(null)

  // a new tide is a new catalogue — drop stale open state and dead slots
  useEffect(() => {
    setOpenId(null)
    const ids = new Set(wrack.map((w) => w.specimen.id))
    for (const id of [...labelSlots.keys()]) {
      if (!ids.has(id)) labelSlots.delete(id)
    }
  }, [wrack])

  // opening a card quadruples its height; the projector has to re-lay-out, and
  // on demand-rendered frames that only happens if we ask
  useEffect(() => {
    requestFrame.current?.()
  }, [openId])

  return (
    <div
      className="label-layer"
      ref={(el) => {
        layerEl.current = el
      }}
    >
      <svg className="label-leaders" aria-hidden>
        {wrack.map((item) => (
          <g key={item.specimen.id}>
            <line
              ref={(el) => {
                getSlot(item.specimen.id).line = el
              }}
              style={{ opacity: 0 }}
            />
            <circle
              r={3}
              ref={(el) => {
                getSlot(item.specimen.id).dot = el
              }}
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>
      {wrack.map((item) => (
        <LabelCard
          key={item.specimen.id}
          item={item}
          open={openId === item.specimen.id}
          onToggle={() => setOpenId((cur) => (cur === item.specimen.id ? null : item.specimen.id))}
        />
      ))}
    </div>
  )
}
