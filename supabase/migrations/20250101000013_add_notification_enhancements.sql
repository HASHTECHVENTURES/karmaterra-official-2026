-- Add image_url and priority fields to notifications table
-- Phase 1: Rich Notification Features

-- Add image_url column for notification banners/images
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add priority column (high, normal, low)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low'));

-- Add template_name column for notification templates
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);

-- Create index for priority
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Add comment for documentation
COMMENT ON COLUMN notifications.image_url IS 'URL of the image/banner to display in the push notification';
COMMENT ON COLUMN notifications.priority IS 'Notification priority: high (urgent), normal (default), low (marketing)';
COMMENT ON COLUMN notifications.template_name IS 'Name of the template used to create this notification (e.g., order_confirmed, promo_code, reminder)';





