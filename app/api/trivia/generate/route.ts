import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const DIFFICULTY_PROMPTS: Record<number, string> = {
  1: `EASY — any casual NBA fan should get these right.
ERA: 2015–present, plus timeless general knowledge.

Cover ALL of these topic areas — pick a different one each question, do not cluster:

RULES & BASICS:
- "How many points is a free throw worth?" (1)
- "How many quarters are in an NBA game?" (4)
- "How many minutes is a regulation NBA quarter?" (12)
- "How many players per team are on the court at once?" (5)
- "How many points is a three-point shot worth?" (3)
- "What does NBA stand for?" (National Basketball Association)
- "What is a triple-double?" (double digits in 3 categories)
- "How tall is an NBA regulation basketball hoop?" (10 feet)

NICKNAMES (iconic, universally known):
- "Which NBA player is known as 'The King'?" (LeBron James)
- "What is Steph Curry's nickname?" (Chef Curry)
- "Who is 'The Greek Freak'?" (Giannis Antetokounmpo)
- "Which player is nicknamed 'Slim Reaper'?" (Kevin Durant)
- "What is Luka Doncic's nickname?" (Luka Magic)
- "Who is known as 'The Joker'?" (Nikola Jokic)
- "What is Joel Embiid's nickname?" (The Process)

TROPHIES & AWARDS:
- "What trophy is given to the NBA Finals champion?" (Larry O'Brien Trophy)
- "What is the award for the NBA's best defensive player called?" (Defensive Player of the Year)
- "Which award goes to the NBA's most improved player?" (Most Improved Player Award)
- "What is the NBA's award for best sixth man called?" (Sixth Man of the Year)

ARENAS:
- "What is the name of the arena where the Golden State Warriors play?" (Chase Center)
- "Where do the Boston Celtics play their home games?" (TD Garden)
- "What arena do the Los Angeles Lakers call home?" (Crypto.com Arena)
- "Where do the New York Knicks play?" (Madison Square Garden)
- "What is the Dallas Mavericks' home arena?" (American Airlines Center)

CHAMPIONS (2015–present):
- "Which team won the 2023 NBA championship?" (Denver Nuggets)
- "Which team won the 2021 NBA championship?" (Milwaukee Bucks)
- "Who won the 2019 NBA Finals?" (Toronto Raptors)
- "How many championships did the Warriors win between 2015 and 2022?" (4)
- "Which team did LeBron lead to a championship in 2020?" (Los Angeles Lakers)

RECENT AWARDS:
- "Who won the NBA MVP in the 2022–23 season?" (Joel Embiid)
- "Who won back-to-back MVP awards in 2021 and 2022?" (Nikola Jokic)
- "Who won the 2023 NBA Finals MVP?" (Nikola Jokic)
- "Who won the 2021 NBA Finals MVP?" (Giannis Antetokounmpo)
- "Which player won Rookie of the Year in 2019–20?" (Ja Morant)

PLAYER POSITIONS:
- "What position does Nikola Jokic play?" (Center)
- "What position is Stephen Curry?" (Point Guard)
- "What position does LeBron James typically play?" (Small Forward / Power Forward)
- "What position is Rudy Gobert known for?" (Center)
- "What position does Damian Lillard play?" (Point Guard)

TEAM IDS:
- "Which of these is NOT an NBA team? Lakers, Celtics, Cardinals, Knicks" (Cardinals — NFL)
- "Which city do the Bucks represent?" (Milwaukee)
- "The Raptors represent which country?" (Canada)
- "Which city are the Jazz from?" (Salt Lake City / Utah)

COLLEGES:
- "Did LeBron James attend college before the NBA?" (No — went straight from high school)
- "Where did Steph Curry play college basketball?" (Davidson College)
- "Which college did Anthony Davis attend?" (University of Kentucky)
- "Where did Zion Williamson play before the NBA?" (Duke University)
- "Which school did Jayson Tatum attend?" (Duke University)`,

  2: `MEDIUM — dedicated fans who follow the sport closely.
ERA: 2000–2022. Avoid the very obvious and pre-2000 deep history.

Cover ALL of these topic areas — pick a different one each question:

STATS & RECORDS (well-known but requires following the sport):
- "How many points did Kobe Bryant score in his final NBA game?" (60)
- "Who was the first player to average a triple-double for a full season in the modern era?" (Russell Westbrook, 2016-17)
- "What is the record for most three-pointers made in a single season?" (Stephen Curry)
- "Who holds the record for most steals in a single game?" (requires knowledge)
- "Which player scored 81 points in a single game in 2006?" (Kobe Bryant)

CHAMPIONSHIPS (2000–2022):
- "How many championships did Kobe Bryant win with the Lakers?" (5)
- "Which team did LeBron lead to a comeback from 3-1 down to win?" (Cleveland Cavaliers, 2016)
- "How many times did LeBron James reach the NBA Finals?" (10)
- "Which team did Dirk Nowitzki lead to a championship in 2011?" (Dallas Mavericks)
- "Who won the 2004 NBA championship?" (Detroit Pistons)
- "Which team won three consecutive championships from 2000–2002?" (Los Angeles Lakers)

COACHES:
- "Which coach led the Spurs to 5 championships?" (Gregg Popovich)
- "Who was the head coach during LeBron's two Miami championships?" (Erik Spoelstra)
- "Which coach holds the NBA record for most career wins?" (Don Nelson)
- "Who coached the Warriors during their dynasty in the 2010s?" (Steve Kerr)
- "Which coach led the Detroit Pistons to the 2004 title?" (Larry Brown)

TEAMMATES (famous rosters):
- "Which player was Kobe Bryant's co-star on the Lakers three-peat teams?" (Shaquille O'Neal)
- "Who was Dwyane Wade's superstar teammate when Miami won back-to-back titles?" (LeBron James)
- "Which two stars formed the 'Big Three' with Paul Pierce in Boston?" (Ray Allen and Kevin Garnett)
- "Who did Kevin Durant team up with in Golden State?" (Stephen Curry)

OLYMPICS (USA Basketball):
- "How many gold medals did Kobe Bryant win at the Olympics?" (2 — 2008 and 2012)
- "Which country upset Team USA at the 2004 Athens Olympics group stage?" (Puerto Rico)
- "Who led Team USA in scoring at the 2008 Beijing Olympics?" (Carmelo Anthony)
- "Which year did Team USA's Olympic team get called the 'Redeem Team'?" (2008)

COLLEGES:
- "Where did Kevin Durant play college basketball?" (University of Texas)
- "Which school did Carmelo Anthony attend before the NBA?" (Syracuse University)
- "Where did Kyrie Irving play college basketball?" (Duke University)
- "Which college did Dwyane Wade attend?" (Marquette University)
- "Did Kobe Bryant attend college before the NBA?" (No — went straight from high school)

NICKNAMES (requires following the sport):
- "Which player is known as 'The Beard'?" (James Harden)
- "What is Dwyane Wade's nickname?" (Flash)
- "Who is called 'King James'?" (LeBron James)
- "Which player goes by 'Mamba'?" (Kobe Bryant)
- "What is Chris Paul's nickname?" (CP3 / The Point God)
- "Which player is called 'The Claw'?" (Kawhi Leonard)
- "What nickname is Dirk Nowitzki known by?" (The German Wunderkind / Nowitzki)

AWARDS (requires knowledge of specific years):
- "Who won the MVP in the 2011–12 season?" (LeBron James)
- "Which player won Rookie of the Year in 2003–04?" (LeBron James)
- "Who was the Finals MVP when Dallas beat Miami in 2011?" (Dirk Nowitzki)
- "Which player won the Defensive Player of the Year award 4 times?" (Dikembe Mutombo)
- "Who won the NBA Sixth Man of the Year award in 2019–20?" (Montrezl Harrell)

TEAM HISTORY (2000–2022):
- "The Oklahoma City Thunder were formerly known as what team?" (Seattle SuperSonics)
- "When did the Brooklyn Nets move from New Jersey?" (2012)
- "Which franchise has won the most championships in NBA history?" (Boston Celtics — 17)
- "When did the New Orleans Pelicans change their name from the Hornets?" (2013)

RULES:
- "When was the NBA three-point line first introduced?" (1979-80 season)
- "What rule change in 2004-05 opened up the game by limiting hand-checking?" (New defensive rules)
- "How many fouls does it take to foul out of an NBA game?" (6)
- "How long is the shot clock in the NBA?" (24 seconds)
- "What is the penalty for a flagrant-2 foul?" (Ejection)`,

  3: `HARD — only die-hard NBA historians with deep knowledge.
ERA: anything pre-2000, or highly specific stats from any era.

Cover ALL of these topic areas — pick a different one each question:

RECORDS & STATS (pre-2000, obscure, or very specific):
- "How many points per game did Wilt Chamberlain average in the 1961–62 season?" (50.4)
- "Who holds the NBA record for career assists?" (John Stockton)
- "What is the record for most points scored in a single NBA game?" (100 — Wilt Chamberlain)
- "Who holds the record for most rebounds in NBA history?" (Wilt Chamberlain)
- "Who was the first player to win 4 consecutive MVP awards?" (Bill Russell — actually Kareem; be careful — answer: Kareem Abdul-Jabbar won 6 MVPs total)
- "How many seasons did Kareem Abdul-Jabbar win the NBA MVP award?" (6)
- "Who has the most career points in NBA history (as of 2023)?" (LeBron James — surpassed Kareem in 2023)
- "What is the record for most assists in a single game?" (Scott Skiles — 30 assists in 1990)

COACHES (historical, specific):
- "Who was the head coach of the 1986 Boston Celtics championship team?" (K.C. Jones)
- "Who coached the 'Showtime' Lakers to their championships in the 1980s?" (Pat Riley)
- "Which coach led the Chicago Bulls to all 6 of their championships?" (Phil Jackson)
- "Who was the Bulls' coach before Phil Jackson took over?" (Doug Collins)
- "Which coach won the most championship rings as a coach in NBA history?" (Phil Jackson — 11)
- "Who was the head coach when the Pistons won back-to-back titles in 1989 and 1990?" (Chuck Daly)

HISTORY & DRAFT:
- "What pick was Michael Jordan selected in the 1984 NBA Draft?" (3rd overall)
- "Who was selected #1 overall in the 1984 draft ahead of Jordan?" (Hakeem Olajuwon)
- "Which team drafted Kobe Bryant before trading him to the Lakers?" (Charlotte Hornets)
- "What pick was Kobe Bryant in the 1996 draft?" (13th overall)
- "Who was the #1 pick in the 1996 NBA Draft?" (Allen Iverson)
- "Which franchise drafted Bill Russell in 1956?" (Boston Celtics — traded to them by St. Louis)
- "What year was the ABA merger with the NBA?" (1976)
- "How many ABA teams joined the NBA in the 1976 merger?" (4)

RULES (historical):
- "In what year was the 24-second shot clock introduced to the NBA?" (1954)
- "When was the NBA's three-point line temporarily moved closer for three seasons?" (1994-95 to 1996-97)
- "In what year was the NBA founded?" (1946 — as the BAA, merged to form NBA in 1949)
- "What was the original name of the NBA before it became the NBA?" (BAA — Basketball Association of America)
- "What rule was introduced in 1979 that changed the game?" (Three-point line)

NICKNAMES (obscure/historical):
- "Which player was known as 'Pistol Pete'?" (Pete Maravich)
- "Who was called 'The Big O'?" (Oscar Robertson)
- "What was Kareem Abdul-Jabbar's original name?" (Lew Alcindor)
- "Which player was nicknamed 'Dr. J'?" (Julius Erving)
- "Who was known as 'The Mailman'?" (Karl Malone)
- "Which player's nickname was 'The Admiral'?" (David Robinson)
- "Who was 'Clyde the Glide'?" (Clyde Drexler)
- "Which player was called 'Iceman'?" (George Gervin)
- "Who was 'Magic'?" (Magic Johnson)
- "Which player was called 'The Big Fundamental'?" (Tim Duncan)
- "Who was nicknamed 'Penny'?" (Anfernee Hardaway)

COLLEGES (obscure/historical):
- "Where did Magic Johnson play college basketball?" (Michigan State)
- "Which college did Larry Bird attend?" (Indiana State)
- "Where did Bill Russell play before the NBA?" (University of San Francisco)
- "Which college did Oscar Robertson attend?" (University of Cincinnati)
- "Where did Kareem Abdul-Jabbar play college basketball?" (UCLA)
- "Which school did Isiah Thomas attend?" (Indiana University)
- "Where did Charles Barkley play college basketball?" (Auburn University)

TEAMS & FRANCHISES (historical):
- "Which city were the Jazz from before moving to Utah?" (New Orleans)
- "Where were the Oklahoma City Thunder before 2008?" (Seattle — SuperSonics)
- "Which team did Wilt Chamberlain play for first in the NBA?" (Philadelphia Warriors)
- "What year did the San Antonio Spurs join the NBA from the ABA?" (1976)
- "The Sacramento Kings were formerly known by what name?" (Kansas City Kings / Cincinnati Royals)

OLYMPICS (historical):
- "Who was the leading scorer for USA at the 1992 Dream Team Olympics?" (Charles Barkley)
- "In what year did NBA players first compete in the Olympics?" (1992 — Barcelona)
- "Which country beat the USA men's basketball team at the 2004 Athens Olympics?" (Argentina — in semifinals)
- "Who captained the famous 1992 Olympic Dream Team?" (No official captain — but Magic Johnson was the elder statesman)
- "Which country won the bronze medal at the 2004 Athens Olympics in basketball?" (USA)
- "How many gold medals did the USA win in Olympic basketball from 1936–1984?" (10 consecutive)

TEAMMATES (historical rosters):
- "Who were the two superstars on the 1985–86 Boston Celtics championship team besides Larry Bird?" (Kevin McHale and Robert Parish)
- "Who was Kareem Abdul-Jabbar's point guard on the Showtime Lakers?" (Magic Johnson)
- "Which two Hall of Famers flanked Michael Jordan on the Bulls during the second three-peat?" (Scottie Pippen and Dennis Rodman)
- "Who was Tim Duncan's longtime backcourt partner in San Antonio?" (Tony Parker and Manu Ginobili)

SPECIFIC SEASONS & SERIES:
- "Which team ended the Chicago Bulls' first three-peat bid in 1994?" (New York Knicks)
- "How many points did Michael Jordan score in Game 5 of the 1997 Finals while sick?" (55 — the 'Flu Game')
- "Which team had the best regular-season record in NBA history (73-9)?" (2015-16 Golden State Warriors)
- "What season did the Detroit Pistons set the record for most wins without a losing record?" — prefer: "What was the record set by the 2015-16 Warriors?" (73-9)`,
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// POST /api/trivia/generate
// Body: { difficulty: 1|2|3, count?: number }
export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY not set' }, { status: 500 })

  const { difficulty = 1, count = 20 } = await req.json().catch(() => ({}))

  const diffPrompt = DIFFICULTY_PROMPTS[difficulty] ?? DIFFICULTY_PROMPTS[1]

  // Fetch a sample of existing correct answers so the model avoids them
  const sb = serviceClient()
  const { data: existing } = await sb
    .from('trivia_questions')
    .select('question, correct_answer, option_a, option_b, option_c, option_d, category')
    .eq('difficulty', difficulty)

  type ExistingRow = { question: string; correct_answer: string; option_a: string; option_b: string; option_c: string; option_d: string; category: string }
  const existingRows = (existing ?? []) as ExistingRow[]

  // Build a compact list of existing questions for the model to avoid
  const avoidList = existingRows.slice(-120).map(q => {
    const ans = q[`option_${q.correct_answer}` as keyof ExistingRow] ?? ''
    return `"${q.question}" → ${ans}`
  }).join('\n')

  const prompt = `You are an NBA trivia expert generating questions for a card game.

DIFFICULTY LEVEL ${difficulty}/3:
${diffPrompt}

FACT-FIRST METHOD — for every question, start with a verified fact, then build around it:
1. State the NBA fact you know with certainty
2. Turn that fact into a question
3. Set the correct answer
4. Add 3 plausible but wrong distractors

BANNED question types:
- "Which team did [player] play for?" — too many players had multiple teams
- "Which player was traded for...?" — trade details are easily confused
- Any single-game stats unless universally known records (Wilt's 100-point game, Kobe's 81)
- Jersey numbers — players wear different numbers across teams
- Anything about contract values or ownership

ALREADY IN THE BANK — do NOT repeat any of these questions or test the same fact:
${avoidList || '(none yet)'}

ANTI-DUPLICATION rules:
- Do not write a question whose answer is already an answer in the "already in the bank" list above for the same category
- Every question must test a DISTINCT fact from a unique angle
- Spread across as many different players, teams, and eras as possible
- Generate exactly ${count} questions

Return ONLY a JSON array (no markdown, no extra text):
[{
  "question": "string",
  "option_a": "string",
  "option_b": "string",
  "option_c": "string",
  "option_d": "string",
  "correct_answer": "a" | "b" | "c" | "d",
  "category": "general" | "stats" | "history" | "championships" | "awards" | "draft" | "records" | "nicknames" | "colleges" | "coaches" | "olympics" | "rules" | "teammates",
  "audience_a": number,
  "audience_b": number,
  "audience_c": number,
  "audience_d": number
}]

Audience rules (sum must equal exactly 100):
- Easy (difficulty 1): correct gets 65-80%
- Medium (difficulty 2): correct gets 48-65%
- Hard (difficulty 3): correct gets 32-52%`

  const groqRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 8000,
    }),
  })

  if (!groqRes.ok) {
    const err = await groqRes.text()
    return NextResponse.json({ error: `Groq error: ${err}` }, { status: 502 })
  }

  const groqData = await groqRes.json()
  const raw = groqData.choices?.[0]?.message?.content ?? ''

  let questions: unknown[]
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    questions = JSON.parse(cleaned)
    if (!Array.isArray(questions)) throw new Error('Not an array')
  } catch {
    return NextResponse.json({ error: 'Failed to parse Groq response', raw }, { status: 502 })
  }

  // ── Verification pass ──
  const verifyPrompt = `You are an NBA fact-checker. For each question below, verify whether the stated correct answer is accurate.

Return ONLY a JSON array of booleans (one per question, in order): [true, false, true, ...]
true = the answer is correct or very likely correct
false = the answer is DEFINITELY wrong (you are confident it is factually incorrect)

Only return false when you are certain the answer is wrong. If unsure, return true.

Questions to verify:
${questions.map((q: unknown, i: number) => {
  const item = q as Record<string, unknown>
  const answerKey = item.correct_answer as string
  const answerText = item[`option_${answerKey}`]
  return `${i + 1}. ${item.question} → stated correct answer: "${answerText}"`
}).join('\n')}`

  const verifyRes = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: verifyPrompt }],
      temperature: 0.1,
      max_tokens: 500,
    }),
  })

  let verified: boolean[] = questions.map(() => true)
  if (verifyRes.ok) {
    try {
      const vData = await verifyRes.json()
      const vRaw = vData.choices?.[0]?.message?.content ?? '[]'
      const vCleaned = vRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(vCleaned)
      if (Array.isArray(parsed)) verified = parsed
    } catch { /* use defaults */ }
  }

  // ── Deduplication — exact text only ──
  const existingNorm = new Set(
    existingRows.map(q =>
      q.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
    )
  )

  const verified_questions = questions.filter((_: unknown, i: number) => verified[i] !== false)
  const rows = verified_questions
    .map((q: unknown) => {
      const item = q as Record<string, unknown>
      return {
        question:       item.question as string,
        option_a:       item.option_a as string,
        option_b:       item.option_b as string,
        option_c:       item.option_c as string,
        option_d:       item.option_d as string,
        correct_answer: item.correct_answer as string,
        difficulty,
        category:       (item.category ?? 'general') as string,
        audience_a:     item.audience_a ?? 25,
        audience_b:     item.audience_b ?? 25,
        audience_c:     item.audience_c ?? 25,
        audience_d:     item.audience_d ?? 25,
      }
    })
    .filter(row => {
      const norm = row.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
      return !existingNorm.has(norm)
    })

  const rejected = questions.length - verified_questions.length
  const duplicates = verified_questions.length - rows.length
  const { data, error } = await sb.from('trivia_questions').insert(rows).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0, rejected, duplicates, difficulty })
}
