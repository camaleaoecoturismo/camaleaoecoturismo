-- Enable real-time for tickets table
ALTER TABLE tickets REPLICA IDENTITY FULL;

-- Add tickets to the realtime publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;