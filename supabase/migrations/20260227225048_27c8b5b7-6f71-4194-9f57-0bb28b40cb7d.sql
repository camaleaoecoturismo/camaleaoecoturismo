ALTER TABLE roca_settings ALTER COLUMN auto_execute_time SET DEFAULT '20:00';
UPDATE roca_settings SET auto_execute_time = '20:00' WHERE auto_execute_time = '19:30';