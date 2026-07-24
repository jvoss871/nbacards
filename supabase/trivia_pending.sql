-- Pending misc trivia questions awaiting admin approval.
-- A row's presence here IS the "pending" state — approve moves it into
-- trivia_questions, reject just deletes it. No status/history column.
CREATE TABLE IF NOT EXISTS trivia_pending_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer char(1) NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  difficulty int NOT NULL CHECK (difficulty BETWEEN 1 AND 3), -- AI-suggested, admin-editable
  category text NOT NULL, -- 'pop_culture' | 'all_star_weekend' | 'front_office'
  created_at timestamptz DEFAULT now()
);
