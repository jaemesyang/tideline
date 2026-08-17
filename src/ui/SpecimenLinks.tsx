import type { Specimen } from '../content'

// A tide is ephemeral and its seed is never in the URL, so a link that
// navigates this tab away destroys the beach the visitor was standing on and
// no back button brings it back. Anything that leaves the site opens in a new
// tab instead; mailto: stays put, because it hands off to a mail client rather
// than navigating and a blank tab would be left behind.
//
// Placeholder URLs (the TODO_ ones still in content.ts) render as plain text.
// An <a href="TODO_APPSTORE_URL"> resolves relative and 404s on any host.

const PLACEHOLDER = /^TODO/

export function SpecimenLinks({
  links,
  className,
}: {
  links: Specimen['links']
  className: string
}) {
  if (!links || links.length === 0) return null
  return (
    <ul className={className}>
      {links.map((l) => (
        <li key={l.url}>
          {PLACEHOLDER.test(l.url) ? (
            <span className="link-pending">{l.label}</span>
          ) : (
            <a
              href={l.url}
              {...(/^https?:/i.test(l.url)
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              {l.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}
