// The light rig per time of day: direction and intensities for the scene's
// lights. Lives here rather than in Beach.tsx because Water.tsx needs the sun's
// direction too — the reflected lane on the water has to sit under the same sun
// the objects cast from.
import type { TimeOfDay } from './palettes'

export const RIG: Record<TimeOfDay, { dir: [number, number, number]; dirI: number; hemiI: number }> = {
  dawn: { dir: [-8, 4, 6], dirI: 1.15, hemiI: 1.35 },
  overcast: { dir: [0, 10, 4], dirI: 0.7, hemiI: 1.5 },
  afternoon: { dir: [6, 9, 3], dirI: 1.35, hemiI: 1.4 },
  dusk: { dir: [8, 3, 5], dirI: 0.95, hemiI: 1.1 },
  night: { dir: [-4, 7, -2], dirI: 0.6, hemiI: 0.85 },
}
