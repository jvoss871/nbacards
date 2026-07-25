'use client'

import { useState } from 'react'

const SECTIONS = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'credits',         title: 'Credits' },
  { id: 'game-modes',      title: 'Game Modes' },
  { id: 'cards',           title: 'Cards' },
  { id: 'prestige',        title: 'Prestige' },
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
              {active === 'credits'        && <Credits />}
              {active === 'game-modes'     && <GameModes />}
              {active === 'cards'          && <Cards />}
              {active === 'prestige'        && <Prestige />}
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
        CardPicks is a daily NBA card game built around three activities: <strong className="text-[#1a1714]">collecting player cards</strong>, <strong className="text-[#1a1714]">making game picks</strong>, and <strong className="text-[#1a1714]">playing daily trivia</strong>. There&apos;s also a yearly NBA Draft prediction board. All of it feeds into the same credit economy — see the <strong className="text-[#1a1714]">Credits</strong> and <strong className="text-[#1a1714]">Game Modes</strong> sections for the full picture.
      </p>
      <InfoBox label="The loop">
        Spend credits on packs to pull player cards. Use those cards to boost your rewards in Pick&apos;em and Trivia. Win, and you earn more credits to open more packs. It compounds.
      </InfoBox>
      <InfoBox label="Daily rhythm">
        Each day brings a fresh set of NBA games to pick and a new trivia challenge. There&apos;s no time pressure beyond the trivia clock itself — picks settle automatically once real game scores are finalized.
      </InfoBox>
      <InfoBox label="The long game">
        Prestige is the endgame. Once you&apos;ve built a strong collection, you can sacrifice it to permanently prestige your profile, resetting your cards but earning a legendary status marker. Do it five times to reach the Hall of Fame.
      </InfoBox>
    </div>
  )
}

function Credits() {
  return (
    <div className="space-y-4">
      <p>
        Credits are CardPicks&apos; currency. Every new account starts with <strong className="text-[#1a1714]">200 credits</strong>. They exist for one purpose: buying packs to build your collection.
      </p>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">Ways to Earn</p>
        <div className="space-y-2">
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">Pick&apos;em</div>
            <div className="text-xs text-[#a39890] mt-0.5">10 credits per correct pick, multiplied if you wagered a card.</div>
          </div>
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">Daily Trivia</div>
            <div className="text-xs text-[#a39890] mt-0.5">Up to 1,000 credits per session, plus monthly leaderboard prizes.</div>
          </div>
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">NBA Draft Board</div>
            <div className="text-xs text-[#a39890] mt-0.5">Payout scales steeply with consecutive correct picks — once a year.</div>
          </div>
        </div>
      </div>
      <InfoBox label="Spending credits">
        Credits buy packs from the Pack Store — Starter, Hardwood, and Elite, each pulling better cards for a higher price. See the <strong className="text-[#1a1714]">Cards</strong> section for the full breakdown.
      </InfoBox>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">Buying Credits</p>
        <p className="text-xs text-[#a39890] mb-2">Need more right now? Credit packages are available from your Profile.</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { credits: '500',   price: '$1.99' },
            { credits: '1,500', price: '$4.99', tag: 'Popular' },
            { credits: '4,000', price: '$9.99', tag: 'Best Value' },
          ].map(pkg => (
            <div key={pkg.credits} className="bg-[#faf9f6] rounded-xl px-3 py-2.5 text-center relative">
              {pkg.tag && <div className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-0.5">{pkg.tag}</div>}
              <div className="font-mono font-black text-[#1a1714] text-sm">{pkg.credits} cr</div>
              <div className="text-[10px] text-[#a39890]">{pkg.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameModes() {
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
  const draftExamples = [
    { n: 1,  credits: '100' },
    { n: 5,  credits: '1,500' },
    { n: 10, credits: '5,500' },
    { n: 20, credits: '21,000' },
    { n: 30, credits: '46,500' },
  ]
  const leaderboardPrizes = [
    { place: '1st', credits: '5,000' },
    { place: '2nd', credits: '2,500' },
    { place: '3rd', credits: '1,000' },
  ]
  return (
    <div className="space-y-6">

      {/* Pick'em */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Pick&apos;em</p>
        <p className="mb-3">
          The Picks screen shows today&apos;s NBA games. For each one, pick the team you think will win and lock it in before tip-off. You can optionally wager a player card — its multiplier applies to your reward if you win, but it&apos;s forfeited if you lose.
        </p>
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
        <p className="text-xs text-[#a39890] mt-2">Picks settle automatically once final scores are posted — no need to return to the app.</p>
      </div>

      <div className="h-px bg-[#f0ede8]" />

      {/* Trivia */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Daily Trivia</p>
        <p className="mb-3">
          One session per day. Fifteen NBA questions that scale in difficulty — early ones are casual fan knowledge, later ones require real historical expertise. Answer all 15 to win <strong className="text-[#1a1714]">1,000 credits</strong>. A 20-second clock runs on each question; letting it expire counts as a miss.
        </p>
        <InfoBox label="Safety nets &amp; walking away">
          Reaching Q5 locks in 100 credits and Q10 locks in 500, even if you miss everything after. Below a checkpoint, a miss pays nothing. After any correct answer you can also cash out and keep what you&apos;ve earned instead of pushing on.
        </InfoBox>
        <p className="text-xs font-black text-[#1a1714] uppercase tracking-widest mt-3 mb-2">Lifelines</p>
        <div className="space-y-2 mb-3">
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">50 / 50</div>
            <div className="text-xs text-[#a39890] mt-0.5">Removes two wrong answers. One use per game.</div>
          </div>
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">Ask Coach</div>
            <div className="text-xs text-[#a39890] mt-0.5">Shows a simulated audience vote — a strong hint, not a guarantee.</div>
          </div>
          <div className="bg-[#faf9f6] rounded-xl px-4 py-3">
            <div className="font-black text-[#1a1714] text-xs">Phone a Player</div>
            <div className="text-xs text-[#a39890] mt-0.5">Pick a card before the game starts, then call on it anytime. It only gets consumed if you lose after using it — win or walk away and it&apos;s returned.</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3">
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
        <InfoBox label="Monthly Leaderboard">
          <p className="mb-2">Every correct answer counts toward a monthly leaderboard, ranked by total correct answers across every session you play that month. Top 3 are paid automatically at the start of the next month.</p>
          <div className="grid grid-cols-3 gap-2">
            {leaderboardPrizes.map(p => (
              <div key={p.place} className="bg-white rounded-lg px-2 py-2 text-center border border-[#e2ddd6]">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#a39890]">{p.place}</div>
                <div className="font-mono font-black text-[#1a1714] text-xs mt-0.5">{p.credits} cr</div>
              </div>
            ))}
          </div>
        </InfoBox>
      </div>

      <div className="h-px bg-[#f0ede8]" />

      {/* Draft */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">NBA Draft Board</p>
        <p className="mb-3">
          Once a year, build a full board predicting where every prospect lands. Browse the prospect pool and drag names into slots 1 through 30, rearranging freely until the board locks before the real draft begins. Payout scales steeply with consecutive correct picks:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Correct Picks</th>
                <th className="py-2 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Total Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede8]">
              {draftExamples.map(e => (
                <tr key={e.n}>
                  <td className="py-2 pr-4 text-[#6b6259]">{e.n} correct</td>
                  <td className="py-2 font-mono font-black text-[#1a1714]">{e.credits} cr</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function Cards() {
  const tiers = [
    { label: 'Bronze',   color: 'text-amber-700',  multi: '1.1×',  rarity: 'Common' },
    { label: 'Silver',   color: 'text-slate-600',   multi: '1.25×', rarity: 'Uncommon' },
    { label: 'Gold',     color: 'text-yellow-700',  multi: '1.5×',  rarity: 'Rare' },
    { label: 'Platinum', color: 'text-blue-700',    multi: '2.0×',  rarity: 'Ultra rare' },
  ]
  const packs = [
    { name: 'Starter Pack',  cost: '200 cr',   desc: '3 cards. Mostly Bronze, with real Silver and a rare shot at Gold or Platinum.' },
    { name: 'Hardwood Pack', cost: '600 cr',   desc: '3 cards. Silver is the most likely pull, with solid Gold odds and a better shot at Platinum.' },
    { name: 'Elite Pack',    cost: '2,000 cr', desc: '5 cards. Gold and Silver dominate the odds, with the best Platinum chance of any pack.' },
  ]
  const actionCards = [
    { name: 'Skip',        context: 'Trivia', desc: 'Replace the current trivia question with a new one of the same difficulty.' },
    { name: 'Safety Net',  context: 'Trivia', desc: 'Locks your most recent question\'s credit value as a guaranteed floor, even if you miss later.' },
    { name: 'Insurance',   context: 'Picks',  desc: 'If your pick loses, your wagered card is returned instead of forfeited.' },
    { name: 'Double Down', context: 'Picks',  desc: 'Doubles your credit reward if the pick wins. No effect on a loss.' },
    { name: 'Reroll',      context: 'Packs',  desc: 'Replace one card slot with a fresh draw of the same or higher tier.' },
    { name: 'Repack',      context: 'Packs',  desc: 'Scrap the entire pack and draw a completely new set.' },
  ]
  const contexts = ['Trivia', 'Picks', 'Packs'] as const
  return (
    <div className="space-y-6">

      {/* Player cards */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Player Cards</p>
        <p className="mb-3">
          Every card represents a real NBA player. Tier reflects skill level — the higher the tier, the rarer the card and the more it earns on a winning pick or trivia phone-a-friend. Duplicate pulls stack as separate copies.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Tier</th>
                <th className="py-2 pr-3 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Rarity</th>
                <th className="py-2 text-[10px] font-black uppercase tracking-widest text-[#a39890]">Multiplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ede8]">
              {tiers.map(t => (
                <tr key={t.label}>
                  <td className="py-2 pr-3"><span className={`font-black text-xs ${t.color}`}>{t.label}</span></td>
                  <td className="py-2 pr-3 text-[#a39890]">{t.rarity}</td>
                  <td className="py-2 font-mono text-[#1a1714]">{t.multi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-px bg-[#f0ede8]" />

      {/* Packs */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Opening Packs</p>
        <p className="mb-3">
          Head to the Pack Store to spend credits on packs. Every pack guarantees at least Bronze per slot — nothing ever comes back empty.
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
        <p className="text-xs text-[#a39890] mt-2">Some packs include a bonus slot that can drop an action card, with its own odds per pack type.</p>
      </div>

      <div className="h-px bg-[#f0ede8]" />

      {/* Action cards */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Action Cards</p>
        <p className="mb-3">
          Single-use items that give you an edge across all three game modes. They drop from the bonus slot in packs, and each one burns on use.
        </p>
        {contexts.map(ctx => (
          <div key={ctx} className="mb-3 last:mb-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#a39890] mb-2">{ctx}</p>
            <div className="space-y-2">
              {actionCards.filter(c => c.context === ctx).map(c => (
                <div key={c.name} className="bg-[#faf9f6] rounded-xl px-4 py-3">
                  <div className="font-black text-[#1a1714] text-xs">{c.name}</div>
                  <div className="text-xs text-[#a39890] mt-0.5 leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
        Prestige is the endgame loop for collectors who&apos;ve built a strong hand. Once your collection is deep enough, you can choose to prestige, permanently advancing your rank while wiping your card collection back to zero.
      </p>
      <InfoBox label="How it works">
        From your Profile, open the prestige picker and choose a legend, an NBA all-time great who represents your next era. Confirming is <strong className="text-[#1a1714]">irreversible</strong>: your cards are cleared and your prestige level advances. Credits are not reset.
      </InfoBox>
      <InfoBox label="What you keep">
        Credits and pick history all carry over. Prestige level is permanent and shown on your profile and nav icon as a Roman numeral.
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
        The Hall of Fame is CardPicks&apos; highest honor. To be inducted, you must reach <strong className="text-[#1a1714]">Prestige V</strong>, completing all five prestige cycles and assembling a full Starting Five of NBA legends, one at each position.
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
