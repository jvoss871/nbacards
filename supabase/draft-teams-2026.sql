-- Add team columns to draft_results (run once)
ALTER TABLE draft_results ADD COLUMN IF NOT EXISTS team_abbr text;
ALTER TABLE draft_results ADD COLUMN IF NOT EXISTS team_name text;

-- 2026 NBA Draft Round 1 — team assignments per slot
UPDATE draft_results SET team_abbr = 'WAS', team_name = 'Washington Wizards'        WHERE year = 2026 AND slot = 1;
UPDATE draft_results SET team_abbr = 'UTA', team_name = 'Utah Jazz'                 WHERE year = 2026 AND slot = 2;
UPDATE draft_results SET team_abbr = 'MEM', team_name = 'Memphis Grizzlies'         WHERE year = 2026 AND slot = 3;
UPDATE draft_results SET team_abbr = 'CHI', team_name = 'Chicago Bulls'             WHERE year = 2026 AND slot = 4;
UPDATE draft_results SET team_abbr = 'LAC', team_name = 'Los Angeles Clippers'      WHERE year = 2026 AND slot = 5;
UPDATE draft_results SET team_abbr = 'BKN', team_name = 'Brooklyn Nets'             WHERE year = 2026 AND slot = 6;
UPDATE draft_results SET team_abbr = 'SAC', team_name = 'Sacramento Kings'          WHERE year = 2026 AND slot = 7;
UPDATE draft_results SET team_abbr = 'ATL', team_name = 'Atlanta Hawks'             WHERE year = 2026 AND slot = 8;
UPDATE draft_results SET team_abbr = 'DAL', team_name = 'Dallas Mavericks'          WHERE year = 2026 AND slot = 9;
UPDATE draft_results SET team_abbr = 'MIL', team_name = 'Milwaukee Bucks'           WHERE year = 2026 AND slot = 10;
UPDATE draft_results SET team_abbr = 'GSW', team_name = 'Golden State Warriors'     WHERE year = 2026 AND slot = 11;
UPDATE draft_results SET team_abbr = 'OKC', team_name = 'Oklahoma City Thunder'     WHERE year = 2026 AND slot = 12;
UPDATE draft_results SET team_abbr = 'MIL', team_name = 'Milwaukee Bucks'           WHERE year = 2026 AND slot = 13;
UPDATE draft_results SET team_abbr = 'CHA', team_name = 'Charlotte Hornets'         WHERE year = 2026 AND slot = 14;
UPDATE draft_results SET team_abbr = 'CHI', team_name = 'Chicago Bulls'             WHERE year = 2026 AND slot = 15;
UPDATE draft_results SET team_abbr = 'OKC', team_name = 'Oklahoma City Thunder'     WHERE year = 2026 AND slot = 16;
UPDATE draft_results SET team_abbr = 'DET', team_name = 'Detroit Pistons'           WHERE year = 2026 AND slot = 17;
UPDATE draft_results SET team_abbr = 'CHA', team_name = 'Charlotte Hornets'         WHERE year = 2026 AND slot = 18;
UPDATE draft_results SET team_abbr = 'TOR', team_name = 'Toronto Raptors'           WHERE year = 2026 AND slot = 19;
UPDATE draft_results SET team_abbr = 'SAS', team_name = 'San Antonio Spurs'         WHERE year = 2026 AND slot = 20;
UPDATE draft_results SET team_abbr = 'MEM', team_name = 'Memphis Grizzlies'         WHERE year = 2026 AND slot = 21;
UPDATE draft_results SET team_abbr = 'PHI', team_name = 'Philadelphia 76ers'        WHERE year = 2026 AND slot = 22;
UPDATE draft_results SET team_abbr = 'ATL', team_name = 'Atlanta Hawks'             WHERE year = 2026 AND slot = 23;
UPDATE draft_results SET team_abbr = 'LAL', team_name = 'Los Angeles Lakers'        WHERE year = 2026 AND slot = 24;
UPDATE draft_results SET team_abbr = 'DAL', team_name = 'Dallas Mavericks'          WHERE year = 2026 AND slot = 25;
UPDATE draft_results SET team_abbr = 'SAS', team_name = 'San Antonio Spurs'         WHERE year = 2026 AND slot = 26;
UPDATE draft_results SET team_abbr = 'BOS', team_name = 'Boston Celtics'            WHERE year = 2026 AND slot = 27;
UPDATE draft_results SET team_abbr = 'BKN', team_name = 'Brooklyn Nets'             WHERE year = 2026 AND slot = 28;
UPDATE draft_results SET team_abbr = 'SAC', team_name = 'Sacramento Kings'          WHERE year = 2026 AND slot = 29;
UPDATE draft_results SET team_abbr = 'PHX', team_name = 'Phoenix Suns'              WHERE year = 2026 AND slot = 30;
