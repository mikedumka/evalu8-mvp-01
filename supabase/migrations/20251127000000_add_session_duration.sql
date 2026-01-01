DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'duration_minutes') THEN
        ALTER TABLE "public"."sessions" ADD COLUMN "duration_minutes" integer NOT NULL DEFAULT 60;
    END IF;
END $$;
