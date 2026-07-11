'use client'

import { useState, useRef } from 'react'

const SECTIONS = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'player-cards',    title: 'Player Cards' },
  { id: 'opening-packs',   title: 'Opening Packs' },
  { id: 'pickem',          title: 'Pick\'em' },
  { id: 'trivia',          title: 'Daily Trivia' },
  { id: 'draft',           title: 'NBA Draft Board' },
  { id: 'action-cards',    title: 'Action Cards' },
  { id: 'prestige',        title: 'Prestige' },
  { id: 'trophies',        title: 'Trophies' },
  { id: 'hall-of-fame',   title: 'Hall of Fame' },
]

export default function HelpPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({ 'getting-started': true })
  const refs = useRef<Record<string, HTMLElement | null>>({})

  function toggle(id: string) {
    setOpen(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function scrollTo(id: string) {
    const el = refs.current[id]
    if (!el) return
    if (!open[id]) setOpen(prev => ({ ...prev, [id]: true }))
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1a1714]">How to Play</h1>
        <p className="text-[#a39890] text-sm mt-1">
          CardPicks is a daily NBA card game — collect players, make picks, and conquer trivia.
        </p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sticky TOC */}
        <nav className="hidden md:block w-44 flex-shrink-0 sticky top-4 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a39890] mb-2 px-2">Contents</p>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[#6b6259] hover:bg-[#f0ede8] hover:text-[#1a1714] transition-colors"
            >
              {s.title}
            </button>
          ))}
        </nav>

        {/* Accordion sections */}
        <div className="flex-1 min-w-0 space-y-2">
          {SECTIONS.map(s => (
            <Accordion
              key={s.id}
              id={s.id}
              title={s.title}
              isOpen={!!open[s.id]}
              onToggle={() => toggle(s.id)}
              ref={el => { refs.current[s.id] = el }}
            >
              {s.id === 'getting-started' && <GettingStarted />}
              {s.id === 'player-cards'    && <PlayerCards />}
              {s.id === 'opening-packs'   && <OpeningPacks />}
              {s.id === 'pickem'          && <Pickem />}
              {s.id === 'trivia'          && <Trivia />}
              {s.id === 'draft'           && <Draft />}
              {s.id === 'action-cards'    && <ActionCards />}
              {s.id === 'prestige'        && <Prestige />}
              {s.id === 'trophies'        && <Trophies />}
              {s.id === 'hall-of-fame'   && <HallOfFame />}
            </Accordion>
          ))}
        </div>
      </div>
    </div>
  )
}

import { forwardRef } from 'react'

const Accordion = forwardRef<HTMLElement, {
  id: string
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}>(function Accordion({ title, isOpen, onToggle, children }, ref) {
  return (
    <section ref={ref} className="bg-white border border-[#e2ddd6] rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#faf9f6] transition-colors"
      >
        <span className="text-sm font-black text-[#1a1714]">{title}</span>
        <span className={`text-[#a39890] text-xs transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 space-y-3 text-sm text-[#6b6259] leading-relaxed border-t border-[#f0ede8]">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </section>
  )
})

/* ─── Section content ──────────────────────────────────────────── */

function GettingStarted() {
  return (
    <div className="space-y-3">
      <p>
        CardPicks is a daily NBA card game built around three activities: <strong className="text-[#1a1714]">collecting player cards</strong>, <strong className="text-[#1a1714]">making game picks</strong>, and <strong className="text-[#1a1714]">playing daily trivia</strong>. All three feed into the same credit economy.
      </p>
      <InfoBox label="Credits">
        Credits are the in-game currency. You start with <strong className="text-[#1a1714]">200 credits</strong> and earn more through correct picks and trivia wins. Credits buy packs, which give you better cards, which earn more credits — a compounding loop.
      </InfoBox>
      <InfoBox label="Daily rhythm">
        Each day brings a fresh set of NBA games to pick and a new trivia challenge. There is no time pressure — picks settle automatically once real game scores are finalized.
      </InfoBox>
      <InfoBox label="The long game">
        Prestige is the endgame. Once you've built a strong collection, you can sacrifice it to permanently prestige your profile — resetting your cards but earning a legendary status marker.
      </InfoBox>
    </div>
  )
}

function PlayerCards() {
  const tiers = [
    { label: 'Bronze',   color: 'text-amber-700',  bg: 'bg-amber-50  border-amber-200',  multi: '1.1×',  rel: '42–56%', rarity: 'Common' },
    { label: 'Silver',   color: 'text-slate-600',   bg: 'bg-slate-50  border-slate-200',  multi: '1.25×', rel: '55–68%', rarity: 'Uncommon' },
    { label: 'Gold',     color: 'text-yellow-700',  bg: 'bg-yellow-50 border-yellow-200', multi: '1.5×',  rel: '68–80%', rarity: 'Rare' },
    { label: 'Platinum', color: 'text-blue-700',    bg: 'bg-blue-50   border-blue-200',   multi: '2.0×',  rel: '88–95%', rarity: 'Ultra rare' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Every card represents a real NBA player. Tier reflects their skill level — the higher the tier, the rarer the card and the more it earns on a winning pick.
      </p>
      <p>
        Each card has two key stats rolled at the moment you pull it:
      </p>
      <div className="space-y-2">
        <InfoBox label="Multiplier">
          Shown on the card face. Multiplier is fixed by tier — Bronze is <strong className="text-[#1a1714]">1.1×</strong>, Silver <strong className="text-[#1a1714]">1.25×</strong>, Gold <strong className="text-[#1a1714]">1.5×</strong>, Platinum <strong className="text-[#1a1714]">2.0×</strong>. Every card of the same tier earns the same amount on a winning pick.
        </InfoBox>
        <InfoBox label="Reliability">
          A percentage shown on the card when selecting a Phone-a-Player lifeline in trivia. Higher tier cards answer correctly more often, but every copy rolls its own unique reliability — two copies of the same player can have different scores.
        </InfoBox>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Tier</th>
              <th className="py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Rarity</th>
              <th className="py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Multiplier</th>
              <th className="py-2 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Reliability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede8]">
            {tiers.map(t => (
              <tr key={t.label}>
                <td className="py-2 pr-3">
                  <span className={`font-black text-xs ${t.color}`}>{t.label}</span>
                </td>
                <td className="py-2 pr-3 text-[#a39890]">{t.rarity}</td>
                <td className="py-2 pr-3 font-mono text-[#1a1714]">{t.multi}</td>
                <td className="py-2 font-mono text-[#1a1714]">{t.rel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#a39890]">
        Duplicate pulls stack as separate copies in your collection, each with its own independently rolled reliability and multiplier.
      </p>
    </div>
  )
}

function OpeningPacks() {
  const packs = [
    { name: 'Starter Pack', cost: '200 cr', desc: 'Mostly Bronze and Silver. Occasional Gold. Good for building early depth.' },
    { name: 'Hardwood Pack', cost: '500 cr', desc: 'Better Gold odds with a slim Platinum chance. The sweet spot for credits-per-pull.' },
    { name: 'Elite Pack', cost: '2,000 cr', desc: 'Guaranteed Gold minimum per slot. Real Platinum odds. Maximum ceiling.' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Head to the Pack Store to spend credits on card packs. Each slot in a pack draws from the full player roster, weighted by that pack's tier odds. One slot per pack is <strong className="text-[#1a1714]">guaranteed</strong> to hit the minimum tier — no shutouts.
      </p>
      <div className="space-y-2">
        {packs.map(p => (
          <div key={p.name} className="flex gap-3 bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="flex-shrink-0 font-mono text-xs text-amber-700 font-black pt-0.5">{p.cost}</div>
            <div>
              <div className="font-black text-[#1a1714] text-xs">{p.name}</div>
              <div className="text-xs text-[#a39890] mt-0.5">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <InfoBox label="Platinum reveal">
        Pulling a Platinum card triggers a cinematic reveal — the screen dims, gold light rays burst outward, and the card tier is announced. It's designed to feel like an event because it is one.
      </InfoBox>
      <InfoBox label="Bonus action card slot">
        Some packs include a bonus slot that can drop an action card. This is drawn separately from the player cards and has its own odds per pack type. The bonus card is revealed last, after all player cards are shown.
      </InfoBox>
      <InfoBox label="Reroll">
        If you have a Reroll action card, it appears as a card beneath each player card after you flip it. Tap it to replace that slot with a fresh draw of the same or higher tier. Reroll is only available on the card you just flipped — you decide in the moment.
      </InfoBox>
      <InfoBox label="Repack">
        If you have a Repack action card, it appears below the navigation buttons once all cards are revealed. Tap it to scrap the entire pack and draw a completely new set. Your original cards are removed and the new draw takes their place. Best used when you're unhappy with the full pull.
      </InfoBox>
    </div>
  )
}

function Pickem() {
  return (
    <div className="space-y-4">
      <p>
        The Picks screen shows today's NBA games. For each game, pick the team you think will win. You can make one pick per game, and lock it in at any time before tip-off.
      </p>
      <InfoBox label="Wagering a card">
        When you lock in a pick, you can optionally wager a player card from your collection. Wagering raises your potential payout but adds real risk — the card is on the line.
      </InfoBox>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Outcome</th>
              <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-[#a39890]">No Wager</th>
              <th className="py-2 text-[10px] font-black uppercase tracking-widest text-[#a39890]">With Wager</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede8]">
            <tr>
              <td className="py-2 pr-4 font-semibold text-[#1a1714]">Correct pick</td>
              <td className="py-2 pr-4 text-[#a39890]">+10 cr</td>
              <td className="py-2 text-emerald-700 font-black">+10 × multiplier cr, card safe</td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-semibold text-[#1a1714]">Wrong pick</td>
              <td className="py-2 pr-4 text-[#a39890]">0 cr</td>
              <td className="py-2 text-red-600">0 cr, card lost</td>
            </tr>
          </tbody>
        </table>
      </div>

      <InfoBox label="Action cards on picks">
        Two action cards can be played when placing a wager — but not both on the same pick:
        <ul className="mt-1.5 space-y-1">
          <li><strong className="text-[#1a1714]">Insurance</strong> — if your pick loses, your wagered card is returned to you. The Insurance card burns either way.</li>
          <li><strong className="text-[#1a1714]">Double Down</strong> — doubles your credit reward if the pick wins. No effect on a loss.</li>
        </ul>
      </InfoBox>

      <InfoBox label="Settlement">
        Picks settle automatically once final scores are posted. You'll see the result in your picks history along with credits earned or cards lost. There's no need to return to the app — it all resolves in the background.
      </InfoBox>
    </div>
  )
}

function Trivia() {
  const rungs = [
    { q: 15, credits: '1,000', top: true },
    { q: 14, credits: '900' }, { q: 13, credits: '800' }, { q: 12, credits: '700' },
    { q: 11, credits: '600' },
    { q: 10, credits: '500', safety: true },
    { q: 9, credits: '400' }, { q: 8, credits: '300' }, { q: 7, credits: '200' },
    { q: 6, credits: '150' },
    { q: 5, credits: '100', safety: true },
    { q: 4, credits: '75' }, { q: 3, credits: '50' }, { q: 2, credits: '25' },
    { q: 1, credits: '10' },
  ]
  return (
    <div className="space-y-4">
      <p>
        One trivia session per day. Fifteen NBA questions that scale in difficulty — early questions are casual fan knowledge, later ones require deep historical expertise. Answer all 15 correctly to win <strong className="text-[#1a1714]">1,000 credits</strong>.
      </p>

      <div className="space-y-2">
        <InfoBox label="Difficulty curve">
          <strong className="text-[#1a1714]">Q1–5</strong> cover recent seasons (2015–present), nicknames, and general NBA basics. <strong className="text-[#1a1714]">Q6–10</strong> go into the 2000–2020 era — stats, rosters, championships, coaches. <strong className="text-[#1a1714]">Q11–15</strong> are for historians: pre-2000 records, obscure draft history, deep rules trivia.
        </InfoBox>
        <InfoBox label="20-second timer">
          Each question has a 20-second clock. Time running out counts as a wrong answer and ends the game. The clock appears on screen and changes color as time drops.
        </InfoBox>
        <InfoBox label="Safety nets (Q5 &amp; Q10)">
          Q5 and Q10 are checkpoints. Answering through Q5 locks in <strong className="text-[#1a1714]">100 credits</strong> — even if you miss every question after. Q10 locks in <strong className="text-[#1a1714]">500 credits</strong>. Below a checkpoint, a wrong answer pays nothing.
        </InfoBox>
        <InfoBox label="Walk away">
          After answering any question correctly, you can cash out between rounds and keep what you've earned. Useful when you're unsure about the next question and don't want to risk losing a safety net payout.
        </InfoBox>
        <InfoBox label="Flag a question (beta)">
          If you believe a question has an incorrect answer or is poorly worded, tap <strong className="text-[#1a1714]">🚩 Flag question</strong> after the answer is revealed. Flagged questions go to an admin review queue. This feature is available during the beta period.
        </InfoBox>
      </div>

      <p className="font-black text-[#1a1714] text-xs uppercase tracking-widest">Lifelines</p>
      <div className="space-y-2">
        <InfoBox label="50/50">
          Removes two wrong answers, leaving you with a 50/50 choice. One use per game. Best saved for medium or hard questions where you're stuck between two options.
        </InfoBox>
        <InfoBox label="Ask Coach">
          Reveals a simulated audience vote across all four answers. The correct answer gets a higher audience percentage, but not always the highest — treat it as a strong hint, not a guarantee.
        </InfoBox>
        <InfoBox label="Phone a Player">
          Before the game starts, select a player card from your collection. At any point during the game, activate the lifeline to hear their answer. The card's <strong className="text-[#1a1714]">reliability score</strong> determines how often they're correct — a Platinum card is right 88–95% of the time, a Bronze card is right about half the time. The card is only consumed if you <em>lose</em> the game after using the lifeline. Win or walk away and it's returned to you.
        </InfoBox>
      </div>

      <p className="font-black text-[#1a1714] text-xs uppercase tracking-widest mt-2">Credit Ladder</p>
      <div className="grid grid-cols-3 gap-1">
        {rungs.map(r => (
          <div
            key={r.q}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
              r.top
                ? 'bg-amber-50 border-amber-300 font-black text-amber-800'
                : r.safety
                ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-800'
                : 'bg-[#f8f6f3] border-[#ece8e3] text-[#6b6259]'
            }`}
          >
            <span className="text-[10px] font-bold opacity-60">Q{r.q}</span>
            <span>{r.credits}</span>
            {r.safety && <span className="text-[9px] font-black text-emerald-600">SAFE</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Draft() {
  const examples = [
    { n: 1,  credits: '100' },
    { n: 5,  credits: '1,500' },
    { n: 10, credits: '5,500' },
    { n: 20, credits: '21,000' },
    { n: 30, credits: '46,500' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Once per year, the NBA holds its Draft — and CardPicks lets you build a full board predicting where every prospect lands. Get picks right and earn credits scaled to how many you nail in a row.
      </p>
      <InfoBox label="Building your board">
        Head to the Draft tab when it's open. Browse the full prospect pool and drag prospects into draft slots 1 through 30 to predict their landing spot. You can rearrange freely until the board locks.
      </InfoBox>
      <InfoBox label="Lock deadline">
        Your board must be submitted before the draft begins. Once it locks, no changes can be made. The lock time is shown on the draft board and in admin settings.
      </InfoBox>
      <InfoBox label="Scoring">
        After the real draft concludes, boards are scored automatically. Every correct slot earns credits — and the payout scales with consecutive correct picks using a triangular formula:
      </InfoBox>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Correct Picks</th>
              <th className="py-2 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Total Credits</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0ede8]">
            {examples.map(e => (
              <tr key={e.n}>
                <td className="py-2 pr-4 text-[#6b6259]">{e.n} correct</td>
                <td className="py-2 font-mono font-black text-[#1a1714]">{e.credits} cr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#a39890]">
        Formula: 100 × n × (n+1) / 2. Each additional correct pick is worth 100 credits more than the previous one — 1st earns 100, 2nd earns 200, 3rd earns 300, and so on.
      </p>
      <InfoBox label="Viewing results">
        Once scored, your board shows which picks landed correctly and how many credits you earned. Boards are preserved in your history so you can compare year over year.
      </InfoBox>
    </div>
  )
}

function ActionCards() {
  const cards = [
    { name: 'Skip',        context: 'Trivia', desc: 'Replace the current trivia question with a new one of the same difficulty. Useful when you draw a question outside your knowledge. Played during an active question.' },
    { name: 'Safety Net',  context: 'Trivia', desc: 'Played between rounds. Locks your most recent completed question\'s credit value as a guaranteed floor — even if you answer wrong later. One use per game, burns on use.' },
    { name: 'Insurance',   context: 'Picks',  desc: 'Played when wagering a card on a pick. If your pick loses, your wagered card is returned to you instead of being forfeited. Insurance always burns on use, win or lose.' },
    { name: 'Double Down', context: 'Picks',  desc: 'Played when wagering a card on a pick. Doubles the credit reward if you win. No effect on a loss. Cannot be stacked with Insurance on the same pick.' },
    { name: 'Reroll',      context: 'Packs',  desc: 'Appears as an action card beneath each player card the moment you flip it. Tap it to replace that slot with a fresh draw of the same or higher tier. You decide per card — once you flip the next card, the window to reroll the previous one is gone. Burns on use.' },
    { name: 'Repack',      context: 'Packs',  desc: 'Appears as an action card below the navigation buttons once all cards are revealed. Scraps the entire pack and draws a completely new set. Your original cards are removed and the new draw takes their place. Burns on use.' },
  ]
  const contexts = ['Trivia', 'Picks', 'Packs'] as const
  return (
    <div className="space-y-4">
      <p>
        Action cards are single-use items that give you an edge across all three game modes. They drop from the bonus slot in packs, with odds varying by pack type. Each card burns on use — you only ever get one activation.
      </p>
      <p>
        Action cards are stored in your collection and can be viewed any time. You can hold multiples of the same type.
      </p>
      {contexts.map(ctx => (
        <div key={ctx}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">{ctx}</p>
          <div className="space-y-2">
            {cards.filter(c => c.context === ctx).map(c => (
              <div key={c.name} className="bg-[#faf9f6] rounded-xl px-4 py-3">
                <div className="font-black text-[#1a1714] text-xs">{c.name}</div>
                <div className="text-xs text-[#a39890] mt-0.5 leading-relaxed">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Prestige() {
  const tiers = [
    { pos: 'PG', label: 'Point Guard',    roman: 'I',   desc: 'First prestige. The floor of legend status.' },
    { pos: 'SG', label: 'Shooting Guard', roman: 'II',  desc: 'Second prestige. Committed to the long game.' },
    { pos: 'SF', label: 'Small Forward',  roman: 'III', desc: 'Third prestige. A veteran of the reset.' },
    { pos: 'PF', label: 'Power Forward',  roman: 'IV',  desc: 'Fourth prestige. Elite dedication.' },
    { pos: 'C',  label: 'Center',         roman: 'V',   desc: 'Fifth prestige. The pinnacle of CardPicks.' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Prestige is the endgame loop for collectors who've built a strong hand. Once your collection is deep enough, you can choose to prestige — permanently advancing your rank while wiping your card collection back to zero.
      </p>
      <InfoBox label="How it works">
        From the Collection screen, open the prestige picker and choose your legend — the NBA all-time great who will represent your next era. Confirming the selection is <strong className="text-[#1a1714]">irreversible</strong>: your cards are cleared and your prestige level advances. Credits are not reset.
      </InfoBox>
      <InfoBox label="What you keep">
        Your credits, trophies, and pick history carry over. Prestige level is permanent and shown on your profile and nav icon using Roman numerals.
      </InfoBox>
      <InfoBox label="Why prestige?">
        Prestige levels are a bragging right and a signal of sustained play. Later tiers unlock prestige-specific trophies and are visible to future game features being built around them.
      </InfoBox>
      <div className="space-y-1.5 mt-2">
        {tiers.map(t => (
          <div key={t.pos} className="flex items-center gap-3 bg-[#faf9f6] rounded-xl px-4 py-2.5">
            <span className="w-8 h-8 rounded-full bg-[#1a1714] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{t.roman}</span>
            <div>
              <span className="font-black text-[#1a1714] text-xs">{t.pos} — {t.label}</span>
              <p className="text-xs text-[#a39890] mt-0.5">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Trophies() {
  const groups = [
    {
      label: 'Collection',
      items: [
        { name: 'First Pull', desc: 'Open your first pack.' },
        { name: 'Platinum Hit', desc: 'Pull your first Platinum card.' },
        { name: 'Century', desc: 'Own 100 player cards across your collection.' },
        { name: 'Full Coverage', desc: 'Hold at least one card representing all 30 NBA teams.' },
      ],
    },
    {
      label: 'Trivia',
      items: [
        { name: 'First Win', desc: 'Win a complete trivia game (all 15 correct).' },
        { name: 'Pure', desc: 'Win a game without using any lifelines.' },
        { name: 'Veteran', desc: 'Win five trivia games over time.' },
        { name: 'Safety First', desc: 'Reach Q10 and walk away with the safety net payout.' },
      ],
    },
    {
      label: 'Picks',
      items: [
        { name: 'On the Board', desc: 'Log your first correct pick.' },
        { name: 'Quarter Century', desc: 'Record 25 correct picks.' },
        { name: 'Sharp', desc: 'Maintain 70% accuracy over at least 30 settled picks.' },
        { name: 'Streak', desc: 'Win 5 picks in a row.' },
        { name: 'High Roller', desc: 'Win a pick with a Platinum card wagered.' },
      ],
    },
    {
      label: 'Prestige',
      items: [
        { name: 'Ascended', desc: 'Complete your first prestige.' },
        { name: 'The Full Circle', desc: 'Reach prestige V — the highest rank.' },
      ],
    },
  ]
  return (
    <div className="space-y-4">
      <p>
        Trophies are milestone achievements tracked automatically from your gameplay. Most require sustained effort — a few require you to deliberately go after them. There are no participation trophies.
      </p>
      <p>
        Trophies are visible on your Profile page and are permanent — they don't reset on prestige.
      </p>
      {groups.map(g => (
        <div key={g.label}>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">{g.label}</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {g.items.map(item => (
              <div key={item.name} className="bg-[#faf9f6] rounded-xl px-3 py-2.5">
                <div className="font-black text-[#1a1714] text-xs">{item.name}</div>
                <div className="text-xs text-[#a39890] mt-0.5 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HallOfFame() {
  const positions = [
    { roman: 'I',   pos: 'PG', label: 'Point Guard',    desc: 'First prestige legend' },
    { roman: 'II',  pos: 'SG', label: 'Shooting Guard', desc: 'Second prestige legend' },
    { roman: 'III', pos: 'SF', label: 'Small Forward',  desc: 'Third prestige legend' },
    { roman: 'IV',  pos: 'PF', label: 'Power Forward',  desc: 'Fourth prestige legend' },
    { roman: 'V',   pos: 'C',  label: 'Center',         desc: 'Fifth prestige legend — Hall of Fame unlocked' },
  ]
  return (
    <div className="space-y-4">
      <p>
        The Hall of Fame is CardPicks' highest honor. To be inducted, you must reach <strong className="text-[#1a1714]">Prestige V</strong> — completing all five prestige cycles and assembling a full Starting Five of NBA legends, one at each position.
      </p>
      <InfoBox label="Starting Five">
        Each time you prestige, you choose an NBA legend who permanently represents that slot on your roster. Prestige I locks in your Point Guard, Prestige II your Shooting Guard, and so on through Center at Prestige V. Your five chosen legends become your Starting Five — displayed on your Hall of Fame entry for everyone to see.
      </InfoBox>
      <InfoBox label="Permanent enshrinement">
        Once inducted, your entry is permanent. Your username, induction date, and full Starting Five are displayed on the Hall of Fame page in the order you were inducted — the earlier you get there, the higher you sit on the wall.
      </InfoBox>
      <div className="space-y-1.5 mt-2">
        {positions.map(p => (
          <div key={p.pos} className="flex items-center gap-3 bg-[#faf9f6] rounded-xl px-4 py-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
              p.roman === 'V'
                ? 'bg-amber-400 text-amber-950'
                : 'bg-[#1a1714] text-white'
            }`}>{p.roman}</span>
            <div>
              <span className="font-black text-[#1a1714] text-xs">{p.pos} — {p.label}</span>
              <p className="text-xs text-[#a39890] mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#a39890]">
        The Hall of Fame page is accessible from the navigation. If no one has been inducted yet, it waits — a permanent reminder of what's possible.
      </p>
    </div>
  )
}

/* ─── Shared components ──────────────────────────────────────────── */

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f8f6f3] rounded-xl px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-1">{label}</div>
      <div className="text-sm text-[#6b6259] leading-relaxed">{children}</div>
    </div>
  )
}
