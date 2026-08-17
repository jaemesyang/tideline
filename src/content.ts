export type ObjectKey =
  | 'driftwood'
  | 'bottle'
  | 'glassFloat'
  | 'buoy'
  | 'net'
  | 'crate'
  | 'shell'
  | 'kelp'
  | 'rope'
  | 'canister'

export type Specimen = {
  id: string
  title: string
  kind: 'project' | 'writing' | 'about' | 'contact'
  object: ObjectKey
  year: string
  summary: string // one line, appears on the label
  detail: string // 2-4 sentences, expands on click
  links?: { label: string; url: string }[]
}

export const specimens: Specimen[] = [
  {
    id: 'about',
    title: 'About',
    kind: 'about',
    object: 'shell',
    year: '—',
    summary: 'Sophomore at Lakeside School in Seattle.',
    detail: "Hi! My name's James and welcome to my personal website, to be honest I was just really bored one week and decided to make this, I hope you enjoy. I wanted the website to be unique and different than other personal websites I've seen, so I decided to add some creative twists, such as the website never being the same each time you reload it. Most of the projects you see on the beach are a compilation of me figuring out what I want to do.",
  },
  {
    id: 'scrapped',
    title: 'Scrapped: Bin Sorter',
    kind: 'project',
    object: 'canister',
    year: '2026',
    summary: 'Point your camera at something and it tells you which bin.',
    detail:
      'Trained an image classifier to sort items into compost, recycling, or landfill, running on-device so it works without signal. Built with TODO_STACK. Shipped to the App Store. On real photos it gets the bin right about 62% of the time, better than the 33% you would get guessing between three bins, and not good enough to trust. It fails on anything unusual, and a wrong call contaminates the bin it goes into, so being confidently wrong is worse than being unsure.',
    links: [{ label: 'App Store', url: 'TODO_APPSTORE_URL' }],
  },
  {
    id: 'security',
    title: 'Systems security research',
    kind: 'project',
    object: 'crate',
    year: '2026',
    summary: 'Breaking a web app, then fixing it.',
    detail:
      'Working remotely under a professor at UNC Charlotte on a vulnerable Java web app running in a VM. I ran real SQL injection attacks against it, including login bypass, injected accounts, and dropped tables, then mapped the control flow and data flow to show how each one reached the database. The root cause was user input concatenated straight into a Statement instead of a PreparedStatement. One path turned out not to be injectable at all, and working out why taught me more than the attacks did. Now rewriting it so the attacks stop working.',
  },
  {
    id: 'worldcup',
    title: 'World Cup 2026 prediction model',
    kind: 'project',
    object: 'glassFloat',
    year: '2026',
    summary: 'Predicted all 103 matches before the tournament started.',
    detail:
      'Elo ratings feeding a Poisson goal model, run through Monte Carlo simulation for the group and knockout stages. Built with TODO_STACK. Committed and timestamped the probabilities on June 9, before a ball was kicked, so the score is honest. Final Brier was 0.534 across all 103 matches, where lower is better and a coin flip scores 0.667. It underweighted draws badly, worst call being Spain and Cabo Verde 0-0 at 1.44. And with no player-level data it overrated the South American sides; Brazil losing to Norway was the single worst prediction at 1.384.',
    links: [{ label: 'github', url: 'https://github.com/jaemesyang/wc2026model' }],
  },
  {
    id: 'orbit',
    title: 'Orbital mechanics simulator',
    kind: 'project',
    object: 'driftwood',
    year: '2026',
    summary: 'A star and three planets, simulated from scratch.',
    detail:
      'Newtonian gravity in Python, no libraries doing the physics for me. Uses Velocity Verlet integration, which conserves energy over long runs where the obvious approach drifts and the orbits spiral apart. Wrote every line myself, no AI-generated code, on purpose, because the point was learning it. The star does not move yet, and there is no way to change anything without editing the source.',
    links: [{ label: 'github', url: 'https://github.com/jaemesyang/orbit-sim' }],
  },
  {
    id: 'problems',
    title: 'Competition problem writing',
    kind: 'project',
    object: 'bottle',
    year: '2023–present',
    summary: 'Problems for Mustang Math, WAMO, InteGIRLS, and others.',
    detail:
      'Written TODO_COUNT problems across four national organizations, reaching over 10,000 students. Regional lead for Mustang Math, coordinating 50+ Washington volunteers. A problem has to be hard and it has to teach something, and those two things fight each other. A problem can be brutal and leave a student with nothing. Getting both at once is the part that takes work.',
  },
  {
    id: 'competitions',
    title: 'Competitions',
    kind: 'writing',
    object: 'rope',
    year: '2022–present',
    summary: 'AIME 4× · USACO Silver · ACSL perfect score · 3rd at National Science Bowl.',
    detail:
      'Also the MIT Science Bowl Invitational and the Pacific Northwest Regional. These measure how fast I solve problems someone else already wrote, which is a narrower thing than it looks like from the outside. I keep doing them for the people.',
  },
  {
    id: 'contact',
    title: 'Contact',
    kind: 'contact',
    object: 'net',
    year: '—',
    summary: 'Reachable by email.',
    detail: 'Best way to reach me is email. GitHub has most of the code.',
    links: [
      { label: 'email', url: 'mailto:james.yang142@gmail.com' },
      { label: 'github', url: 'https://github.com/jaemesyang' },
    ],
  },
]
