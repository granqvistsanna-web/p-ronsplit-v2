-- Add current user (sanna@welcom.se) to Banehagsgatan group
INSERT INTO public.group_members (id, group_id, user_id, joined_at)
VALUES (
  gen_random_uuid()::text,
  '50539666-381a-486d-8595-0a280a832234',
  '973c50ef-c37a-437c-93cd-599c05b2c18f',
  now()
);