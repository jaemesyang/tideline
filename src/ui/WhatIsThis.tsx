// The explainer. The build spec forbade explaining the concept in UI copy;
// James asked for this panel later, so it exists — but it stays in register:
// dry, factual, no selling, and it never names what the rare tides carry.

export function WhatIsThis() {
  return (
    <div className="about-panel">
      <p>
        Every visit draws a seed. The seed sets the hour, the weather, the colour of the water, and
        which objects the tide carries in.
      </p>
      <p>
        Scrolling is the tide going out. What it uncovers is the work — each label is the real
        write-up. The résumé at the bottom holds all of it, whether this tide brought it in or not.
      </p>
      <p>
        The same seed rebuilds the same beach exactly, on any machine. Clicking the seed copies a
        link to this one. Reload and it is gone.
      </p>
      <p>Some tides bring things most tides don&rsquo;t.</p>
      <p className="about-colophon">
        React Three Fiber, with a hand-written GLSL shoreline. Every random value comes from one
        seeded generator; nothing here calls Math.random.
      </p>
    </div>
  )
}
