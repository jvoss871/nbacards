-- Legends pool update: PG/SG/SF swaps
-- PG: Remove Allen Iverson → Add Oscar Robertson
-- SG: Remove Ray Allen + Reggie Miller → Add Jerry West + Clyde Drexler
-- SF: Remove Scottie Pippen → Add Elgin Baylor
-- PF/C: No changes

DELETE FROM legends
WHERE name IN ('Allen Iverson', 'Ray Allen', 'Reggie Miller', 'Scottie Pippen');

INSERT INTO legends (name, position, prestige_required) VALUES
  ('Oscar Robertson', 'PG', 1),
  ('Jerry West',      'SG', 2),
  ('Clyde Drexler',   'SG', 2),
  ('Elgin Baylor',    'SF', 3);
