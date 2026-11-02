-- Run ONCE in Supabase > SQL Editor, only if your database was created before this update.
-- Adds the project type / project stage columns to inspections. Safe to run twice.
alter table inspections add column if not exists project_type text;
alter table inspections add column if not exists project_stage text;
