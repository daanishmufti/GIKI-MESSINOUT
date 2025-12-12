-- Drop the overly permissive policy that exposes all profiles to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Create a secure function to get reviewer display names (only returns full_name, not email)
CREATE OR REPLACE FUNCTION public.get_reviews_with_names()
RETURNS TABLE (
  id uuid,
  rating integer,
  comment text,
  created_at timestamptz,
  reviewer_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.rating,
    r.comment,
    r.created_at,
    COALESCE(p.full_name, 'Anonymous') as reviewer_name
  FROM public.reviews r
  LEFT JOIN public.profiles p ON r.user_id = p.id
  ORDER BY r.created_at DESC
  LIMIT 50;
$$;