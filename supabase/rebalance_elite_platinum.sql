-- Elite pack: bump platinum weight so it's more clearly the best pack for platinum odds.
--   Old: P(≥1 plat in 5) = 1 - (1 - 0.021)^5 ≈ 10.0%
--   New: P(≥1 plat in 5) = 1 - (1 - 0.04)^5  ≈ 18.5%
-- Other tiers are unchanged in absolute weight; the extra 0.019 of total weight dilutes
-- bronze/silver/gold's share by about 2% relatively, which is negligible.

UPDATE pack_types SET
  odds = '{"bronze":0.05,"silver":0.629,"gold":0.30,"platinum":0.04}'
WHERE name = 'Elite';
