CREATE TABLE IF NOT EXISTS notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),
 recipient_id varchar(128) NOT NULL REFERENCES users(id),kind varchar(80) NOT NULL,
 source_event varchar(180) NOT NULL,payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,recipient_id,source_event)
);
CREATE INDEX IF NOT EXISTS notifications_inbox_idx ON notifications(organization_id,recipient_id,created_at DESC);
