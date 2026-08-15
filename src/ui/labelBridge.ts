// Shared mutable registry between the DOM label layer (ui/Label.tsx) and the
// R3F frame loop (scene/Specimen.tsx), which projects object positions and
// writes card transforms / leader lines straight to these elements. Same
// pattern as lib/scroll.ts `tide`: per-frame data never touches React state.

export type LabelSlot = {
  card: HTMLDivElement | null
  line: SVGLineElement | null
  dot: SVGCircleElement | null
  w: number // cached card size — kept fresh by a ResizeObserver
  h: number
}

export const labelSlots = new Map<string, LabelSlot>()

export function getSlot(id: string): LabelSlot {
  let slot = labelSlots.get(id)
  if (!slot) {
    slot = { card: null, line: null, dot: null, w: 0, h: 0 }
    labelSlots.set(id, slot)
  }
  return slot
}

/** The intro line fades out against scroll; the frame loop drives it too. */
export const introEl: { current: HTMLElement | null } = { current: null }

/** Whole label layer — fades out as the résumé block scrolls in over the beach. */
export const layerEl: { current: HTMLElement | null } = { current: null }
