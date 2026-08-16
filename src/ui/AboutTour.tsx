import { useRef, useState } from 'react'
import { Tour } from './Tour'

// `what is this?` sits under the title in the middle of the frame, not off in
// the corner chrome: at scroll 0 it is the only thing to do besides scroll, and
// a first-time visitor should not have to hunt for it. It fades out with the
// intro line as the tide starts to go out (the projector in Specimen.tsx owns
// that), so it never competes with the wrack once there is work on screen.

export function AboutTour() {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)

  // The tour takes focus onto its card; hand it back where it came from, or a
  // keyboard visitor lands at the top of the document on close.
  const close = () => {
    setOpen(false)
    btn.current?.focus()
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="about-toggle"
        aria-pressed={open}
        onClick={() => setOpen((o) => !o)}
      >
        what is this?
      </button>
      {open && <Tour onClose={close} />}
    </>
  )
}
