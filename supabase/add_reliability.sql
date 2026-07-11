-- Each element is one copy's reliability. Array length always equals quantity.
-- Migrate existing single-value column to array, nulls stay null.
alter table user_cards
  alter column reliability type integer[]
  using case when reliability is null then null else array[reliability] end;
