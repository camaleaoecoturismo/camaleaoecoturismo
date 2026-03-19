
-- Update all email templates to use the new logo URL
UPDATE email_templates
SET body_html = REPLACE(
  body_html,
  'https://xyzcompositesltd.b-cdn.net/wp-content/uploads/camaleao-ecoturismo-logo.png',
  'https://preview--camaleon-ecoturismo.lovable.app/logo-email.png'
)
WHERE body_html LIKE '%xyzcompositesltd.b-cdn.net%';
