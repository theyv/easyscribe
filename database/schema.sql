-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_identifier VARCHAR(255) UNIQUE NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  os_version VARCHAR(100),
  app_version VARCHAR(50),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (per-device key-value settings stored as JSONB)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  key VARCHAR(255) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, key)
);

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#10b981',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, name)
);

-- Transcriptions table
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  source_filename VARCHAR(500),
  audio_path VARCHAR(1000),
  duration INTEGER,
  type VARCHAR(50) DEFAULT 'recording',
  language VARCHAR(10),
  metadata JSONB DEFAULT '{}'::jsonb,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for transcriptions-tags many-to-many relationship
CREATE TABLE IF NOT EXISTS transcription_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transcription_id, tag_id)
);

-- Create indexes for performance

-- Full-text search index on transcriptions.content
CREATE INDEX IF NOT EXISTS idx_transcriptions_content_gin ON transcriptions USING gin(content gin_trgm_ops);

-- Full-text search index on transcriptions.source_filename
CREATE INDEX IF NOT EXISTS idx_transcriptions_source_filename_gin ON transcriptions USING gin(source_filename gin_trgm_ops);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transcriptions_device_id ON transcriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_folder_id ON transcriptions(folder_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_type ON transcriptions(type);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcriptions_synced ON transcriptions(synced);

CREATE INDEX IF NOT EXISTS idx_folders_device_id ON folders(device_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

CREATE INDEX IF NOT EXISTS idx_tags_device_id ON tags(device_id);

CREATE INDEX IF NOT EXISTS idx_settings_device_id ON settings(device_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

CREATE INDEX IF NOT EXISTS idx_transcription_tags_transcription_id ON transcription_tags(transcription_id);
CREATE INDEX IF NOT EXISTS idx_transcription_tags_tag_id ON transcription_tags(tag_id);

-- Full-text search function using pg_trgm for fuzzy matching
CREATE OR REPLACE FUNCTION search_transcriptions(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  content TEXT,
  source_filename VARCHAR(500),
  folder_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity_score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.content,
    t.source_filename,
    t.folder_id,
    t.created_at,
    GREATEST(
      COALESCE(similarity(t.title, search_query), 0),
      COALESCE(similarity(t.content, search_query), 0),
      COALESCE(similarity(t.source_filename, search_query), 0)
    ) as similarity_score
  FROM transcriptions t
  WHERE
    search_query IS NOT NULL
    AND (
      t.title % search_query
      OR t.content % search_query
      OR t.source_filename % search_query
    )
  ORDER BY similarity_score DESC, t.created_at DESC;
END;
$$;

-- Enable Row Level Security on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcription_tags ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for single-user mode
-- These policies allow all operations (for now, should be restricted in production)

-- Devices policies
CREATE POLICY "Enable all access for devices" ON devices
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Settings policies
CREATE POLICY "Enable all access for settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Folders policies
CREATE POLICY "Enable all access for folders" ON folders
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Tags policies
CREATE POLICY "Enable all access for tags" ON tags
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Transcriptions policies
CREATE POLICY "Enable all access for transcriptions" ON transcriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Transcription tags policies
CREATE POLICY "Enable all access for transcription_tags" ON transcription_tags
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
