-- Store AI investigation analysis on the hazard record so it persists across sessions
ALTER TABLE hazard_register ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL;
