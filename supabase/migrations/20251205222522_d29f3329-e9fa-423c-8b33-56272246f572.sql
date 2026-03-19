-- Add is_exclusive column to tours table
ALTER TABLE public.tours 
ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false;

-- Migrate existing calendar_only_tours to tours table
INSERT INTO public.tours (name, city, state, start_date, end_date, month, is_active, is_exclusive, created_at, updated_at)
SELECT 
  cot.name,
  'Exclusivo' as city,
  'PE' as state,
  cot.start_date,
  cot.end_date,
  TO_CHAR(cot.start_date, 'FMMONTH') as month,
  true as is_active,
  true as is_exclusive,
  cot.created_at,
  cot.updated_at
FROM public.calendar_only_tours cot
WHERE NOT EXISTS (
  SELECT 1 FROM public.tours t 
  WHERE t.name = cot.name 
  AND t.start_date = cot.start_date
);

-- Add comment to explain the column
COMMENT ON COLUMN public.tours.is_exclusive IS 'Exclusive tours that do not appear on public tour cards but have full management capabilities';