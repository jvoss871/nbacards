-- Pack rebalance: 3/3/5 cards, 200/600/2000 prices, no gold guarantee on Elite
--
-- Starter  : 3 cards, 200 cr  — entry pack, mostly Bronze
-- Hardwood : 3 cards, 600 cr  — real Silver/Gold odds, plat ~1 in 28 packs
-- Elite    : 5 cards, 2000 cr — high Gold/Plat odds, no guarantee
--              P(≥1 gold in 5)   = 1 - (1 - 0.30)^5 = 83.2%
--              P(≥1 plat in 5)   = 1 - (1 - 0.021)^5 = 10.0%

UPDATE pack_types SET
  card_count   = 3,
  credit_cost  = 200,
  description  = '3 cards · mostly Bronze · slim Gold chance',
  guaranteed_tier = 'bronze',
  odds         = '{"bronze":0.90,"silver":0.10,"gold":0.03,"platinum":0.002}'
WHERE name = 'Starter';

UPDATE pack_types SET
  card_count   = 3,
  credit_cost  = 600,
  description  = '3 cards · real Silver & Gold odds',
  guaranteed_tier = 'bronze',
  odds         = '{"bronze":0.548,"silver":0.34,"gold":0.10,"platinum":0.012}'
WHERE name = 'Hardwood';

UPDATE pack_types SET
  card_count      = 5,
  credit_cost     = 2000,
  description     = '5 cards · high Gold & Platinum odds · no guarantees',
  guaranteed_tier = 'bronze',
  odds            = '{"bronze":0.05,"silver":0.629,"gold":0.30,"platinum":0.021}'
WHERE name = 'Elite';
