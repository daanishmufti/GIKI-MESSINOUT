-- Add unique constraint to ensure one review per user
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_unique UNIQUE (user_id);