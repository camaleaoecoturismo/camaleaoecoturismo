-- Add parent_id column to menu_items for hierarchy
ALTER TABLE menu_items ADD COLUMN parent_id uuid REFERENCES menu_items(id) ON DELETE CASCADE;

-- Add index for better performance on parent lookups
CREATE INDEX idx_menu_items_parent_id ON menu_items(parent_id);

-- Update the trigger to handle updated_at for parent items when child items change
CREATE OR REPLACE FUNCTION public.update_parent_menu_item_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update parent item's updated_at when child is modified
    IF NEW.parent_id IS NOT NULL THEN
        UPDATE menu_items 
        SET updated_at = now() 
        WHERE id = NEW.parent_id;
    END IF;
    
    -- Also update if parent_id changed
    IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
        -- Update old parent if it exists
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE menu_items 
            SET updated_at = now() 
            WHERE id = OLD.parent_id;
        END IF;
        -- Update new parent if it exists
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE menu_items 
            SET updated_at = now() 
            WHERE id = NEW.parent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for parent timestamp updates
CREATE TRIGGER update_parent_menu_item_timestamp_trigger
    AFTER INSERT OR UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_menu_item_timestamp();