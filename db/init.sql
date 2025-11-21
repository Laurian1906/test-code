CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    description TEXT,
    severity TEXT,
    location_county TEXT,
    location_city TEXT,
    institution TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT,
    created_by TEXT,
    summary TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[]
);

CREATE INDEX IF NOT EXISTS conversations_created_date_idx
    ON conversations (created_date DESC);

CREATE INDEX IF NOT EXISTS conversations_ticket_id_idx
    ON conversations (ticket_id);

