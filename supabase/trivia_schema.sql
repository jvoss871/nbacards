-- Trivia question bank
CREATE TABLE IF NOT EXISTS trivia_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer char(1) NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 3), -- 1=easy 2=medium 3=hard
  category text NOT NULL DEFAULT 'general',
  -- Simulated audience percentages (should sum to ~100)
  audience_a int NOT NULL DEFAULT 25,
  audience_b int NOT NULL DEFAULT 25,
  audience_c int NOT NULL DEFAULT 25,
  audience_d int NOT NULL DEFAULT 25,
  created_at timestamptz DEFAULT now()
);

-- Daily game session per user
CREATE TABLE IF NOT EXISTS trivia_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  session_date date NOT NULL DEFAULT current_date,
  question_ids uuid[] NOT NULL,           -- ordered list of 15 question IDs
  current_step int NOT NULL DEFAULT 0,    -- 0=not started, 1-15=on that question
  credits_floor int NOT NULL DEFAULT 0,   -- floor from last safety net reached
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'won', 'lost', 'walked_away')),
  lifeline_fifty_used boolean NOT NULL DEFAULT false,
  lifeline_phone_used boolean NOT NULL DEFAULT false,
  lifeline_audience_used boolean NOT NULL DEFAULT false,
  phone_player_id text DEFAULT null,
  eliminated_options char(1)[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, session_date)
);
