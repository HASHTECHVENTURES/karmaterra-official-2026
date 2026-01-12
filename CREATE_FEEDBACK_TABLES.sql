-- Create tables for user feedback, help requests, and service reports
-- Run this SQL in your Supabase SQL Editor

-- Feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) DEFAULT 'general', -- 'general', 'bug', 'feature', 'improvement'
    subject VARCHAR(255),
    message TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'closed'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Help requests table
CREATE TABLE IF NOT EXISTS help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category VARCHAR(100), -- 'technical', 'account', 'payment', 'general', 'other'
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    admin_response TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service reports table
CREATE TABLE IF NOT EXISTS service_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL, -- 'know_your_skin', 'know_your_hair', 'ask_karma', etc.
    report_type VARCHAR(50) DEFAULT 'issue', -- 'issue', 'bug', 'error', 'suggestion', 'other'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    screenshot_url TEXT,
    device_info JSONB, -- Store device/platform info if needed
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'closed'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_help_requests_user_id ON help_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_help_requests_category ON help_requests(category);
CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_service_reports_user_id ON service_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_service_name ON service_reports(service_name);
CREATE INDEX IF NOT EXISTS idx_service_reports_status ON service_reports(status);
CREATE INDEX IF NOT EXISTS idx_service_reports_created_at ON service_reports(created_at);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated requests (using custom auth)
CREATE POLICY "Allow authenticated feedback management" ON user_feedback
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated help request management" ON help_requests
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated service report management" ON service_reports
    FOR ALL USING (true) WITH CHECK (true);

-- Functions to update updated_at
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_help_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_service_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_user_feedback_updated_at ON user_feedback;
CREATE TRIGGER update_user_feedback_updated_at
    BEFORE UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_updated_at();

DROP TRIGGER IF EXISTS update_help_requests_updated_at ON help_requests;
CREATE TRIGGER update_help_requests_updated_at
    BEFORE UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_help_requests_updated_at();

DROP TRIGGER IF EXISTS update_service_reports_updated_at ON service_reports;
CREATE TRIGGER update_service_reports_updated_at
    BEFORE UPDATE ON service_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_service_reports_updated_at();







