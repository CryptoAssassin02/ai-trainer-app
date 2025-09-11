-- Notification Preferences Table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  email_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT false,
  in_app_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TEXT CHECK (quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_hours_end TEXT CHECK (quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment on table
COMMENT ON TABLE notification_preferences IS 'User notification preferences for the trAIner app';

-- Add comments to columns
COMMENT ON COLUMN notification_preferences.id IS 'Unique identifier for the notification preferences record';
COMMENT ON COLUMN notification_preferences.user_id IS 'Reference to the auth.users table';
COMMENT ON COLUMN notification_preferences.email_enabled IS 'Whether email notifications are enabled';
COMMENT ON COLUMN notification_preferences.sms_enabled IS 'Whether SMS notifications are enabled';
COMMENT ON COLUMN notification_preferences.push_enabled IS 'Whether push notifications are enabled';
COMMENT ON COLUMN notification_preferences.in_app_enabled IS 'Whether in-app notifications are enabled';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Start time for quiet hours (HH:MM format, 24-hour)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'End time for quiet hours (HH:MM format, 24-hour)';
COMMENT ON COLUMN notification_preferences.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN notification_preferences.updated_at IS 'Timestamp when the record was last updated';

-- Create index on user_id (for faster lookups)
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage only their own preferences
CREATE POLICY "Users can only access their own notification preferences"
  ON notification_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for insert/update (optional, more explicit version)
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_updated_at(); 