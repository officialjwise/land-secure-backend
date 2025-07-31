-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    coordinates TEXT NOT NULL,
    property_size TEXT,
    requester_email TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    requester_phone TEXT,
    verification_purpose TEXT NOT NULL CHECK (verification_purpose IN ('purchase_consideration', 'due_diligence', 'general_inquiry')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    verification_score INTEGER DEFAULT 0 CHECK (verification_score >= 0 AND verification_score <= 100),
    risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    verification_type TEXT NOT NULL DEFAULT 'basic' CHECK (verification_type IN ('basic', 'standard', 'premium')),
    ownership_status TEXT DEFAULT 'not_found' CHECK (ownership_status IN ('verified', 'disputed', 'unclear', 'not_found')),
    legal_compliance TEXT DEFAULT 'requires_review' CHECK (legal_compliance IN ('compliant', 'non_compliant', 'requires_review')),
    purchase_recommendation TEXT DEFAULT 'investigate_further' CHECK (purchase_recommendation IN ('safe_to_purchase', 'proceed_with_caution', 'investigate_further', 'do_not_purchase')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verification_report JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_verifications_coordinates ON verifications(coordinates);
CREATE INDEX IF NOT EXISTS idx_verifications_requester_email ON verifications(requester_email);
CREATE INDEX IF NOT EXISTS idx_verifications_property_id ON verifications(property_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_risk_level ON verifications(risk_level);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON verifications(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_verifications_updated_at 
    BEFORE UPDATE ON verifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (Row Level Security)
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert verification requests
CREATE POLICY "Users can create verification requests" ON verifications
    FOR INSERT 
    WITH CHECK (true);

-- Allow users to view their own verification requests
CREATE POLICY "Users can view their own verifications" ON verifications
    FOR SELECT 
    USING (requester_email = auth.jwt() ->> 'email');

-- Allow admins to view all verifications
CREATE POLICY "Admins can view all verifications" ON verifications
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = (auth.jwt() ->> 'sub')::uuid 
            AND users.role = 'admin'
        )
    );

-- Allow service role to perform all operations (for backend processing)
CREATE POLICY "Service role can perform all operations" ON verifications
    FOR ALL 
    USING (auth.role() = 'service_role');
