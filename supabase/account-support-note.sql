-- Free-text field for admins to leave a note on an account (e.g. "refunded
-- manually on 7/24") — shown in the Account Lookup detail panel.
alter table user_state add column if not exists support_note text;
