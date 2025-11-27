-- Add contact info and birth_date to players table
ALTER TABLE players 
ADD COLUMN birth_date DATE,
ADD COLUMN phone TEXT,
ADD COLUMN email_1 TEXT,
ADD COLUMN email_2 TEXT;

-- Comment on columns
COMMENT ON COLUMN players.birth_date IS 'Full birth date of the player';
COMMENT ON COLUMN players.phone IS 'Primary contact phone number';
COMMENT ON COLUMN players.email_1 IS 'Primary contact email';
COMMENT ON COLUMN players.email_2 IS 'Secondary contact email';
