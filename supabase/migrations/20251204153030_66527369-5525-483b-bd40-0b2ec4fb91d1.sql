-- Update function to support 7-digit registration numbers
CREATE OR REPLACE FUNCTION public.get_student_by_reg_number(reg_number text)
RETURNS TABLE(user_id uuid, email text, full_name text, is_in_today boolean, total_days integer, total_amount integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COALESCE((
      SELECT da.is_in 
      FROM daily_attendance da 
      WHERE da.user_id = p.id AND da.date = CURRENT_DATE
    ), false) as is_in_today,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM daily_attendance da 
      WHERE da.user_id = p.id AND da.is_in = true
    ), 0) as total_days,
    COALESCE((
      SELECT COUNT(*)::INTEGER * 600 
      FROM daily_attendance da 
      WHERE da.user_id = p.id AND da.is_in = true
    ), 0) as total_amount
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'student' AND p.email LIKE 'u' || reg_number || '@%';
$$;