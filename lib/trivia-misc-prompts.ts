export const MISC_CATEGORIES = ['pop_culture', 'all_star_weekend', 'front_office'] as const
export type MiscCategory = typeof MISC_CATEGORIES[number]

export const MISC_CATEGORY_LABELS: Record<MiscCategory, string> = {
  pop_culture:      'Pop Culture',
  all_star_weekend: 'All-Star Weekend',
  front_office:     'Front Office & History',
}

export const MISC_CATEGORY_PROMPTS: Record<MiscCategory, string> = {
  pop_culture: `POP CULTURE — celebrities, movies, TV, music, and media tied to the NBA. These facts are outside the model's usual trivia comfort zone, so only use things that are genuinely well-documented and famous — do not invent celebrity connections.

Cover a mix of these areas — pick a different one each question, do not cluster:

CELEBRITY FANS & COURTSIDE REGULARS:
- "Which director is famously a courtside regular at New York Knicks games?" (Spike Lee)
- "Which actor was known for his courtside seat at Los Angeles Lakers games for decades?" (Jack Nicholson)
- "Which rapper co-owns a stake in the Charlotte-area basketball scene through business ties to Michael Jordan's brand?" (avoid if uncertain — prefer verified ownership facts)
- "Which pop star performed the halftime show at an NBA All-Star Game?" (use only verified, famous examples, e.g. Usher, Nelly)

MOVIES & TV:
- "Which 1996 movie starred Michael Jordan alongside animated Looney Tunes characters?" (Space Jam)
- "Which NBA-themed comedy starred Will Ferrell and Woody Harrelson as a fictional minor pro team?" (Semi-Pro)
- "Which 2019 film starring Adam Sandler featured Kevin Garnett playing a fictionalized version of himself?" (Uncut Gems)
- "Which 1996 basketball comedy starred Lil' Bow Wow as a kid who befriends Michael Jordan's shoes?" (Like Mike)
- "Which streaming documentary series chronicled Michael Jordan's final season with the Chicago Bulls?" (The Last Dance)

VIDEO GAMES:
- "Which NBA legend appeared on the cover of the very first NBA 2K game?" (verify before using — Allen Iverson appeared on early covers)
- "What is the name of the long-running annual NBA video game franchise published by 2K?" (NBA 2K)

MUSIC:
- "Which rapper's stage name is also the nickname of a legendary Lakers guard, 'Magic'?" (avoid ambiguous — prefer direct, verifiable facts)
- "Which artist recorded the song 'Basketball' that became an anthem referencing NBA culture?" (Kurtis Blow)

Only include a fact if you are highly confident it is accurate and well-known — when in doubt, pick a safer, more famous fact instead.`,

  all_star_weekend: `ALL-STAR WEEKEND — the 3-Point Contest, Slam Dunk Contest, Skills Challenge, Rising Stars, and the All-Star Game itself.

Cover a mix of these areas — pick a different one each question, do not cluster:

FORMAT & RULES:
- "What color is the special extra-value ball used in the 3-Point Contest?" (red, white, and blue — often called the 'money ball')
- "How many points is a made shot with the special money ball worth in the 3-Point Contest?" (2 points, vs. 1 for a regular shot)
- "How many total balls does a shooter attempt from each rack in the modern 3-Point Contest?" (5 balls per rack)
- "How many dunk attempts is a contestant typically given per round in the Slam Dunk Contest?" (2 attempts)
- "What is the maximum score a judge can award a dunk in the Slam Dunk Contest?" (10)
- "How many judges typically score each dunk in the Slam Dunk Contest?" (5)

DUNK CONTEST HISTORY:
- "Who won the first NBA Slam Dunk Contest in 1984?" (Larry Nance)
- "Which player famously jumped over a car during a Slam Dunk Contest performance?" (Blake Griffin, 2011)
- "Which player used a mini trampoline during his 2000 Slam Dunk Contest performance?" (Vince Carter)
- "Which guard won back-to-back Slam Dunk Contests in 1985 and 1986?" (Dominique Wilkins won 1985 and 1990 — verify exact years before using)
- "Which player famously dunked from the free-throw line to win a Slam Dunk Contest?" (Michael Jordan and Julius Erving both did this — use carefully, specify one)

3-POINT CONTEST HISTORY:
- "Who won the very first NBA 3-Point Contest in 1986?" (Larry Bird)
- "Which player holds the record for most 3-Point Contest titles?" (Larry Bird and Craig Hodges each won 3 — verify before using)
- "Which Warriors star won the 3-Point Contest in the same season as being named regular season MVP?" (Stephen Curry, 2015)

SKILLS CHALLENGE & RISING STARS:
- "What does the Skills Challenge test besides shooting?" (dribbling and passing under time pressure)
- "What is the name of the event that showcases top rookies and second-year players during All-Star Weekend?" (Rising Stars)

ALL-STAR GAME:
- "What is the award called that is given to the All-Star Game's most valuable player?" (NBA All-Star Game MVP)
- "Which format did the NBA switch to for team selection, replacing strict East vs. West rosters with team captains drafting players?" (Elam Ending / Captains' Draft format, introduced 2018)

Only include a fact if you are highly confident it is accurate — All-Star Weekend trivia is easy to misremember (exact years, exact scores), so favor durable, well-documented facts over precise numbers you're not certain of.`,

  front_office: `FRONT OFFICE & LEAGUE HISTORY — commissioners, owners, franchise relocations/renamings, and league structure. Distinct from on-court "history" trivia — this is about the business and administrative side of the league.

Cover a mix of these areas — pick a different one each question, do not cluster:

COMMISSIONERS:
- "Who was the NBA commissioner immediately before Adam Silver?" (David Stern)
- "In what year did Adam Silver become NBA commissioner?" (2014)
- "Who was the first commissioner of the NBA (then the BAA)?" (Maurice Podoloff)
- "Which commissioner served the longest tenure in NBA history?" (David Stern, 1984–2014)
- "Who was the NBA commissioner during the 1998–99 lockout?" (David Stern)

FRANCHISE RELOCATIONS & RENAMINGS:
- "The Oklahoma City Thunder were previously known as which franchise?" (Seattle SuperSonics)
- "The Brooklyn Nets were previously based in which state before relocating?" (New Jersey)
- "The Utah Jazz franchise originally played in which city before moving to Utah?" (New Orleans)
- "The New Orleans Pelicans were previously known by what name?" (New Orleans/Charlotte Hornets)
- "Which team moved from Vancouver to Memphis in 2001?" (Memphis Grizzlies)
- "The Los Angeles Clippers franchise was originally based in which city?" (Buffalo, as the Buffalo Braves)

OWNERSHIP:
- "Which Dallas Mavericks owner was widely known for his active presence on social media and Shark Tank appearances?" (Mark Cuban)
- "Which former NBA player became majority owner of the Charlotte Hornets?" (Michael Jordan)

LEAGUE STRUCTURE & EXPANSION:
- "What year did the NBA and ABA complete their merger?" (1976)
- "How many teams joined the NBA from the ABA during the 1976 merger?" (4 — Nets, Nuggets, Pacers, Spurs)
- "Which expansion team joined the NBA in 1995 alongside the Toronto Raptors?" (Vancouver Grizzlies)
- "What is the format used to determine the order of the NBA Draft Lottery?" (weighted odds based on regular-season record)
- "How many teams currently make up the NBA?" (30)

Only include a fact if you are highly confident it is accurate — commissioner order, relocation years, and ownership facts are exactly the kind of thing that's easy to get subtly wrong, so favor the most durable, widely-reported facts.`,
}
