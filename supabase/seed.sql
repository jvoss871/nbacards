-- Seed data — run after schema.sql

-- Default user
insert into user_state (user_id, credits) values ('default', 200)
on conflict (user_id) do nothing;

-- Pack types
insert into pack_types (name, description, card_count, credit_cost, guaranteed_tier, odds) values
  ('Starter',  '3 cards · mostly Bronze · rare Platinum possible',  3,  200,  'bronze', '{"bronze":0.90,"silver":0.10,"gold":0.03,"platinum":0.002}'),
  ('Hardwood', '5 cards · Bronze guaranteed · slim Platinum chance', 5,  500,  'bronze', '{"bronze":0.71,"silver":0.22,"gold":0.06,"platinum":0.006}'),
  ('Elite',    '5 cards · guaranteed Gold · real Platinum odds',     5, 2000,  'gold',   '{"bronze":0.23,"silver":0.60,"gold":0.15,"platinum":0.02}');

-- ─────────────────────────────────────────────────────────────────
-- Players — tier is a permanent talent attribute, not random.
-- Platinum: generational/MVP-tier  (2.0x)
-- Gold:     perennial All-Stars    (1.5x)
-- Silver:   quality starters       (1.25x)
-- Bronze:   role players / young   (1.1x)
-- ─────────────────────────────────────────────────────────────────
insert into players (name, team, team_abbr, position, tier, multiplier, image_url) values

  -- ── Platinum ──────────────────────────────────────────────────
  ('LeBron James',           'Los Angeles Lakers',    'LAL','SF','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/2544.png'),
  ('Steph Curry',            'Golden State Warriors', 'GSW','PG','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/201939.png'),
  ('Kevin Durant',           'Phoenix Suns',          'PHX','SF','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/201142.png'),
  ('Giannis Antetokounmpo',  'Milwaukee Bucks',       'MIL','PF','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/203507.png'),
  ('Nikola Jokic',           'Denver Nuggets',        'DEN','C', 'platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/203999.png'),
  ('Luka Doncic',            'Dallas Mavericks',      'DAL','PG','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/1629029.png'),
  ('Shai Gilgeous-Alexander','Oklahoma City Thunder', 'OKC','PG','platinum',2.0,'https://cdn.nba.com/headshots/nba/latest/260x190/1628983.png'),

  -- ── Gold ──────────────────────────────────────────────────────
  ('Jayson Tatum',       'Boston Celtics',       'BOS','SF','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1628369.png'),
  ('Joel Embiid',        'Philadelphia 76ers',   'PHI','C', 'gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/203954.png'),
  ('Damian Lillard',     'Milwaukee Bucks',      'MIL','PG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/203081.png'),
  ('Jaylen Brown',       'Boston Celtics',       'BOS','SG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1627759.png'),
  ('Trae Young',         'Atlanta Hawks',        'ATL','PG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1629027.png'),
  ('Devin Booker',       'Phoenix Suns',         'PHX','SG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1626164.png'),
  ('Ja Morant',          'Memphis Grizzlies',    'MEM','PG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1629630.png'),
  ('Donovan Mitchell',   'Cleveland Cavaliers',  'CLE','SG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1628378.png'),
  ('Jalen Brunson',      'New York Knicks',      'NYK','PG','gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1628973.png'),
  ('Bam Adebayo',        'Miami Heat',           'MIA','C', 'gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1628389.png'),
  ('Anthony Davis',      'Los Angeles Lakers',   'LAL','C', 'gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/203076.png'),
  ('Karl-Anthony Towns', 'New York Knicks',      'NYK','C', 'gold',1.5,'https://cdn.nba.com/headshots/nba/latest/260x190/1626157.png'),

  -- ── Silver ────────────────────────────────────────────────────
  ('Darius Garland',    'Cleveland Cavaliers',  'CLE','PG','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1629636.png'),
  ('Cade Cunningham',   'Detroit Pistons',      'DET','PG','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1630595.png'),
  ('Paolo Banchero',    'Orlando Magic',        'ORL','PF','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1631094.png'),
  ('Jaren Jackson Jr.', 'Memphis Grizzlies',    'MEM','C', 'silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1628991.png'),
  ('Brandon Ingram',    'New Orleans Pelicans', 'NOP','SF','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1627742.png'),
  ('Zion Williamson',   'New Orleans Pelicans', 'NOP','PF','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1629627.png'),
  ('Alperen Sengun',    'Houston Rockets',      'HOU','C', 'silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1630578.png'),
  ('Tyrese Haliburton', 'Indiana Pacers',       'IND','PG','silver',1.25,'https://cdn.nba.com/headshots/nba/latest/260x190/1630169.png'),

  -- ── Bronze ────────────────────────────────────────────────────
  ('Jordan Poole',    'Washington Wizards',  'WAS','SG','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1629673.png'),
  ('Desmond Bane',    'Memphis Grizzlies',   'MEM','SG','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1630217.png'),
  ('Scottie Barnes',  'Toronto Raptors',     'TOR','SF','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1630567.png'),
  ('Josh Giddey',     'Chicago Bulls',       'CHI','PG','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1630581.png'),
  ('Cam Thomas',      'Brooklyn Nets',       'BKN','SG','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1631132.png'),
  ('Jaden Hardy',     'Dallas Mavericks',    'DAL','SG','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1631218.png'),
  ('Keegan Murray',   'Sacramento Kings',    'SAC','SF','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1631099.png'),
  ('Amen Thompson',   'Houston Rockets',     'HOU','SF','bronze',1.1,'https://cdn.nba.com/headshots/nba/latest/260x190/1631114.png');

-- Mock NBA games (mix of scheduled and already-final for testing)
insert into games (home_team, away_team, home_team_abbr, away_team_abbr, game_date, game_time, status, home_score, away_score, winner) values
  ('Boston Celtics',        'Miami Heat',             'BOS','MIA', current_date, '7:30 PM ET', 'scheduled', null, null, null),
  ('Golden State Warriors', 'Los Angeles Lakers',     'GSW','LAL', current_date, '8:00 PM ET', 'scheduled', null, null, null),
  ('Milwaukee Bucks',       'Cleveland Cavaliers',    'MIL','CLE', current_date, '8:30 PM ET', 'scheduled', null, null, null),
  ('Oklahoma City Thunder', 'Dallas Mavericks',       'OKC','DAL', current_date, '9:00 PM ET', 'scheduled', null, null, null),
  ('Denver Nuggets',        'Phoenix Suns',           'DEN','PHX', current_date, '9:30 PM ET', 'scheduled', null, null, null),
  ('New York Knicks',       'Atlanta Hawks',          'NYK','ATL', current_date - 1, '7:00 PM ET', 'final', 112, 108, 'home'),
  ('Philadelphia 76ers',    'Orlando Magic',          'PHI','ORL', current_date - 1, '7:30 PM ET', 'final', 98,  105, 'away'),
  ('Memphis Grizzlies',     'Houston Rockets',        'MEM','HOU', current_date - 1, '8:00 PM ET', 'final', 119, 103, 'home');
