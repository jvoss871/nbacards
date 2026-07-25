'use client'

import { useState } from 'react'

const SECTIONS = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'player-cards',    title: 'Player Cards' },
  { id: 'action-cards',    title: 'Action Cards' },
  { id: 'opening-packs',   title: 'Opening Packs' },
  { id: 'pickem',          title: 'Pick\'em' },
  { id: 'trivia',          title: 'Daily Trivia' },
  { id: 'leaderboard',     title: 'Monthly Leaderboard' },
  { id: 'draft',           title: 'NBA Draft Board' },
  { id: 'prestige',        title: 'Prestige' },
  { id: 'trophies',        title: 'Trophies' },
  { id: 'hall-of-fame',    title: 'Hall of Fame' },
]

export default function HelpPage() {
  const [active, setActive] = useState('getting-started')
  const section = SECTIONS.find(s => s.id === active)!

  return (
    <div className="max-w-3xl mx-auto py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#1a1714]">How to Play</h1>
        <p className="text-[#a39890] text-sm mt-1">
          CardPicks is a daily NBA card game. Collect players, make picks, and conquer trivia.
        </p>
      </div>

      <div className="flex gap-6 items-start">

        {/* Sticky TOC */}
        <nav className="w-40 flex-shrink-0 sticky top-4 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#a39890] mb-2 px-2">Contents</p>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                active === s.id
                  ? 'bg-amber-50 text-amber-700 font-black'
                  : 'text-[#6b6259] hover:bg-[#f0ede8] hover:text-[#1a1714]'
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-[#e2ddd6] rounded-2xl shadow-sm px-5 py-5">
            <h2 className="text-sm font-black text-[#1a1714] mb-4 pb-3 border-b border-[#f0ede8]">{section.title}</h2>
            <div className="text-sm text-[#6b6259] leading-relaxed space-y-3">
              {active === 'getting-started' && <GettingStarted />}
              {active === 'player-cards'    && <PlayerCards />}
              {active === 'opening-packs'   && <OpeningPacks />}
              {active === 'pickem'          && <Pickem />}
              {active === 'trivia'          && <Trivia />}
              {active === 'leaderboard'     && <Leaderboard />}
              {active === 'draft'           && <Draft />}
              {active === 'action-cards'    && <ActionCards />}
              {active === 'prestige'        && <Prestige />}
              {active === 'trophies'        && <Trophies />}
              {active === 'hall-of-fame'    && <HallOfFame />}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Section content ──────────────────────────────────────────────────────── */

function GettingStarted() {
  return (
    <div className="space-y-3">
      <p>
        CardPicks is a daily NBA card game built around three activities: <strong className="text-[#1a1714]">collecting player cards</strong>, <strong className="text-[#1a1714]">making game picks</strong>, and <strong className="text-[#1a1714]">playing daily trivia</strong>. All three feed into the same credit economy.
      </p>
      <InfoBox label="Credits">
        Credits are the in-game currency. You start with <strong className="text-[#1a1714]">200 credits</strong> and earn more through correct picks and trivia wins. Credits buy packs, which give you better cards, which earn more credits. It compounds.
      </InfoBox>
      <InfoBox label="Daily rhythm">
        Each day brings a fresh set of NBA games to pick and a new trivia challenge. There is no time pressure. Picks settle automatically once real game scores are finalized.
      </InfoBox>
      <InfoBox label="The long game">
        Prestige is the endgame. Once you've built a strong collection, you can sacrifice it to permanently prestige your profile, resetting your cards but earning a legendary status marker. Do it five times to reach the Hall of Fame.
      </InfoBox>
    </div>
  )
}

function PlayerCards() {
  const tiers = [
    { label: 'Bronze',   color: 'text-amber-700',  multi: '1.1×',  rel: '42–56%', rarity: 'Common' },
    { label: 'Silver',   color: 'text-slate-600',   multi: '1.25×', rel: '55–68%', rarity: 'Uncommon' },
    { label: 'Gold',     color: 'text-yellow-700',  multi: '1.5×',  rel: '68–80%', rarity: 'Rare' },
    { label: 'Platinum', color: 'text-blue-700',    multi: '2.0×',  rel: '88–95%', rarity: 'Ultra rare' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Every card represents a real NBA player. Tier reflects their skill level. The higher the tier, the rarer the card and the more it earns on a winning pick.
      </p>
      <InfoBox label="Multiplier">
        Fixed by tier. Bronze is <strong className="text-[#1a1714]">1.1×</strong>, Silver <strong className="text-[#1a1714]">1.25×</strong>, Gold <strong className="text-[#1a1714]">1.5×</strong>, Platinum <strong className="text-[#1a1714]">2.0×</strong>. Every card of the same tier earns the same amount on a winning pick.
      </InfoBox>
      <InfoBox label="Reliability">
        A percentage shown when selecting a Phone-a-Player lifeline. Higher tier cards answer correctly more often, but every copy rolls its own unique reliability. Two copies of the same player can have different scores.
      </InfoBox>
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
                <td className="py-2 pr-3"><span className={`font-black text-xs ${t.color}`}>{t.label}</span></td>
                <td className="py-2 pr-3 text-[#a39890]">{t.rarity}</td>
                <td className="py-2 pr-3 font-mono text-[#1a1714]">{t.multi}</td>
                <td className="py-2 font-mono text-[#1a1714]">{t.rel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[#a39890]">
        Duplicate pulls stack as separate copies, each with its own independently rolled reliability.
      </p>
    </div>
  )
}

function OpeningPacks() {
  const packs = [
    { name: 'Starter Pack',  cost: '200 cr',   desc: '3 cards. Mostly Bronze, with real Silver and a rare shot at Gold or Platinum.' },
    { name: 'Hardwood Pack', cost: '600 cr',   desc: '3 cards. Silver is the most likely pull, with solid Gold odds and a better shot at Platinum.' },
    { name: 'Elite Pack',    cost: '2,000 cr', desc: '5 cards. Gold and Silver dominate the odds, with the best Platinum chance of any pack.' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Head to the Pack Store to spend credits on card packs. Each slot draws from the full player roster, weighted by that pack's tier odds. Every pack guarantees at least Bronze per slot — nothing ever comes back empty.
      </p>
      <div className="space-y-2">
        {packs.map(p => (
          <div key={p.name} className="flex gap-3 bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="flex-shrink-0 font-mono text-xs text-amber-700 font-black pt-0.5 w-16">{p.cost}</div>
            <div>
              <div className="font-black text-[#1a1714] text-xs">{p.name}</div>
              <div className="text-xs text-[#a39890] mt-0.5">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <InfoBox label="Bonus action card slot">
        Some packs include a bonus slot that can drop an action card, drawn separately from player cards with its own odds per pack type.
      </InfoBox>
    </div>
  )
}

function Pickem() {
  return (
    <div className="space-y-4">
      <p>
        The Picks screen shows today's NBA games. For each game, pick the team you think will win and lock it in before tip-off.
      </p>
      <InfoBox label="Wagering a card">
        When you lock in a pick, you can optionally wager a player card. The card's multiplier is applied to your credit reward if you win, but the card is forfeited if you lose.
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
      <InfoBox label="Settlement">
        Picks settle automatically once final scores are posted. Credits are awarded or cards are forfeited in the background. No need to return to the app.
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
    { q: 9,  credits: '400' }, { q: 8, credits: '300' }, { q: 7, credits: '200' },
    { q: 6,  credits: '150' },
    { q: 5,  credits: '100', safety: true },
    { q: 4,  credits: '75'  }, { q: 3, credits: '50'  }, { q: 2, credits: '25'  },
    { q: 1,  credits: '10'  },
  ]
  return (
    <div className="space-y-4">
      <p>
        One trivia session per day. Fifteen NBA questions that scale in difficulty. Early questions are casual fan knowledge, later ones require deep historical expertise. Answer all 15 correctly to win <strong className="text-[#1a1714]">1,000 credits</strong>.
      </p>
      <InfoBox label="Difficulty curve">
        <strong className="text-[#1a1714]">Q1–5</strong>: recent seasons, nicknames, basics. <strong className="text-[#1a1714]">Q6–10</strong>: the 2000–2020 era, covering stats, rosters, championships, and coaches. <strong className="text-[#1a1714]">Q11–15</strong>: historians only, covering pre-2000 records, obscure draft history, and deep rules trivia.
      </InfoBox>
      <InfoBox label="20-second timer">
        Each question has a 20-second clock. Time running out counts as a wrong answer and ends the game.
      </InfoBox>
      <InfoBox label="Safety nets (Q5 &amp; Q10)">
        Answering through Q5 locks in <strong className="text-[#1a1714]">100 credits</strong>, even if you miss every question after. Q10 locks in <strong className="text-[#1a1714]">500 credits</strong>. Below a checkpoint, a wrong answer pays nothing.
      </InfoBox>
      <InfoBox label="Walk away">
        After any correct answer you can cash out between rounds and keep what you've earned. Useful when you're unsure about the next question.
      </InfoBox>
      <p className="font-black text-[#1a1714] text-xs uppercase tracking-widest">Lifelines</p>
      <InfoBox label="50 / 50">
        Removes two wrong answers. One use per game. Best saved for questions where you're stuck between two options.
      </InfoBox>
      <InfoBox label="Ask Coach">
        Shows a simulated audience vote. The correct answer tends to get a higher percentage. Treat it as a strong hint, not a guarantee.
      </InfoBox>
      <InfoBox label="Phone a Player">
        Select a card before the game starts. Activate at any point to hear their answer. The card's <strong className="text-[#1a1714]">reliability score</strong> determines how often they're correct. The card is only consumed if you lose after using the lifeline. Win or walk away and it's returned.
      </InfoBox>
      <p className="font-black text-[#1a1714] text-xs uppercase tracking-widest">Credit Ladder</p>
      <div className="grid grid-cols-3 gap-1">
        {rungs.map(r => (
          <div
            key={r.q}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
              r.top    ? 'bg-amber-50 border-amber-300 font-black text-amber-800'
              : r.safety ? 'bg-emerald-50 border-emerald-300 font-semibold text-emerald-800'
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

function Leaderboard() {
  const prizes = [
    { place: '1st', credits: '5,000' },
    { place: '2nd', credits: '2,500' },
    { place: '3rd', credits: '1,000' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Every correct trivia answer counts toward a monthly leaderboard, ranked by total correct answers across every session you play that calendar month — not just your best single run. Check your standing from the Daily Trivia screen.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {prizes.map(p => (
          <div key={p.place} className="bg-[#faf9f6] rounded-xl px-3 py-2.5 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#a39890]">{p.place}</div>
            <div className="font-mono font-black text-[#1a1714] text-sm mt-0.5">{p.credits} cr</div>
          </div>
        ))}
      </div>
      <InfoBox label="Payout timing">
        The top 3 are credited automatically at the start of the next month. Ties go to whoever reached their total first.
      </InfoBox>
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
        Once per year, the NBA holds its Draft. CardPicks lets you build a full board predicting where every prospect lands. Get picks right and earn credits scaled to how many you nail consecutively.
      </p>
      <InfoBox label="Building your board">
        Browse the full prospect pool and drag prospects into draft slots 1 through 30. You can rearrange freely until the board locks before the draft begins.
      </InfoBox>
      <InfoBox label="Scoring">
        Every correct slot earns credits. Payout scales with consecutive correct picks using a triangular formula. Each additional correct pick is worth 100 more than the previous one.
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
    </div>
  )
}

function ActionCards() {
  const cards = [
    { name: 'Skip',        context: 'Trivia', desc: 'Replace the current trivia question with a new one of the same difficulty. Played during an active question.' },
    { name: 'Safety Net',  context: 'Trivia', desc: 'Played between rounds. Locks your most recent question\'s credit value as a guaranteed floor, even if you miss later. Burns on use.' },
    { name: 'Insurance',   context: 'Picks',  desc: 'If your pick loses, your wagered card is returned instead of forfeited. Burns either way.' },
    { name: 'Double Down', context: 'Picks',  desc: 'Doubles your credit reward if the pick wins. No effect on a loss. Cannot stack with Insurance on the same pick.' },
    { name: 'Reroll',      context: 'Packs',  desc: 'Appears beneath each card after you flip it. Tap to replace that slot with a fresh draw of the same or higher tier. Burns on use.' },
    { name: 'Repack',      context: 'Packs',  desc: 'Appears after all cards are revealed. Scraps the entire pack and draws a completely new set. Burns on use.' },
  ]
  const contexts = ['Trivia', 'Picks', 'Packs'] as const
  return (
    <div className="space-y-4">
      <p>
        Action cards are single-use items that give you an edge across all three game modes. They drop from the bonus slot in packs, with odds varying by pack type. Each card burns on use.
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
    { pos: 'PG', roman: 'I',   desc: 'First prestige. The floor of legend status.' },
    { pos: 'SG', roman: 'II',  desc: 'Second prestige. Committed to the long game.' },
    { pos: 'SF', roman: 'III', desc: 'Third prestige. A veteran of the reset.' },
    { pos: 'PF', roman: 'IV',  desc: 'Fourth prestige. Elite dedication.' },
    { pos: 'C',  roman: 'V',   desc: 'Fifth prestige. Hall of Fame unlocked.' },
  ]
  return (
    <div className="space-y-4">
      <p>
        Prestige is the endgame loop for collectors who've built a strong hand. Once your collection is deep enough, you can choose to prestige, permanently advancing your rank while wiping your card collection back to zero.
      </p>
      <InfoBox label="How it works">
        From your Profile, open the prestige picker and choose a legend, an NBA all-time great who represents your next era. Confirming is <strong className="text-[#1a1714]">irreversible</strong>: your cards are cleared and your prestige level advances. Credits are not reset.
      </InfoBox>
      <InfoBox label="What you keep">
        Credits, trophies, and pick history all carry over. Prestige level is permanent and shown on your profile and nav icon as a Roman numeral.
      </InfoBox>
      <div className="space-y-1.5 mt-2">
        {tiers.map(t => (
          <div key={t.pos} className="flex items-center gap-3 bg-[#faf9f6] rounded-xl px-4 py-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
              t.roman === 'V' ? 'bg-amber-400 text-amber-950' : 'bg-[#1a1714] text-white'
            }`}>{t.roman}</span>
            <div>
              <span className="font-black text-[#1a1714] text-xs">{t.pos}</span>
              <p className="text-xs text-[#a39890] mt-0.5">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Trophies() {
  return (
    <div className="space-y-3">
      <p>
        Trophies are milestone achievements tracked automatically from your gameplay. Most require sustained effort. A few require you to deliberately go after them. They are permanent and don't reset on prestige.
      </p>
      <p>
        View your progress and earned trophies on the Profile page.
      </p>
    </div>
  )
}

function HallOfFame() {
  const positions = [
    { roman: 'I',   pos: 'PG', desc: 'First prestige legend' },
    { roman: 'II',  pos: 'SG', desc: 'Second prestige legend' },
    { roman: 'III', pos: 'SF', desc: 'Third prestige legend' },
    { roman: 'IV',  pos: 'PF', desc: 'Fourth prestige legend' },
    { roman: 'V',   pos: 'C',  desc: 'Fifth prestige legend. Hall of Fame unlocked.' },
  ]
  return (
    <div className="space-y-4">
      <p>
        The Hall of Fame is CardPicks' highest honor. To be inducted, you must reach <strong className="text-[#1a1714]">Prestige V</strong>, completing all five prestige cycles and assembling a full Starting Five of NBA legends, one at each position.
      </p>
      <InfoBox label="Starting Five">
        Each time you prestige, you choose an NBA legend who permanently fills that slot. Prestige I locks your PG, Prestige II your SG, and so on through Center at Prestige V. Your five chosen legends become your Starting Five, displayed on your Hall of Fame entry for everyone to see.
      </InfoBox>
      <InfoBox label="Permanent enshrinement">
        Once inducted, your entry is permanent. Username, induction date, and full Starting Five are displayed on the Hall of Fame in the order you were inducted. The earlier you get there, the higher you sit.
      </InfoBox>
      <div className="space-y-1.5 mt-2">
        {positions.map(p => (
          <div key={p.pos} className="flex items-center gap-3 bg-[#faf9f6] rounded-xl px-4 py-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
              p.roman === 'V' ? 'bg-amber-400 text-amber-950' : 'bg-[#1a1714] text-white'
            }`}>{p.roman}</span>
            <div>
              <span className="font-black text-[#1a1714] text-xs">{p.pos}</span>
              <p className="text-xs text-[#a39890] mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Shared ───────────────────────────────────────────────────────────────── */

function InfoBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#f8f6f3] rounded-xl px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-1">{label}</div>
      <div className="text-sm text-[#6b6259] leading-relaxed">{children}</div>
    </div>
  )
}
