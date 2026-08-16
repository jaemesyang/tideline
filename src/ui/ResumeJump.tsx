import { scrollToResume } from '../lib/scroll'

// The impatient exit, top right: rides the tide all the way out to the résumé
// block at the deepest point. (Replaced the spec's /plain skip link.)

export function ResumeJump() {
  return (
    <button type="button" className="resume-jump" onClick={scrollToResume}>
      résumé →
    </button>
  )
}
