-- Update all existing message templates to use 'before_class' type only
UPDATE "line_message_templates" 
SET "template_type" = 'before_class' 
WHERE "template_type" IN ('after_class', 'custom');