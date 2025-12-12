-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view all reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get stats for a date range
CREATE OR REPLACE FUNCTION public.get_attendance_stats(start_date DATE, end_date DATE)
RETURNS TABLE(
  total_students BIGINT,
  students_in BIGINT,
  students_out BIGINT,
  total_revenue BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(DISTINCT p.id) FROM profiles p JOIN user_roles ur ON ur.user_id = p.id WHERE ur.role = 'student') as total_students,
    COUNT(DISTINCT da.user_id) FILTER (WHERE da.is_in = true AND da.date BETWEEN start_date AND end_date) as students_in,
    (SELECT COUNT(DISTINCT p.id) FROM profiles p JOIN user_roles ur ON ur.user_id = p.id WHERE ur.role = 'student') - 
    COUNT(DISTINCT da.user_id) FILTER (WHERE da.is_in = true AND da.date BETWEEN start_date AND end_date) as students_out,
    COALESCE(SUM(CASE WHEN da.is_in = true AND da.date BETWEEN start_date AND end_date THEN 600 ELSE 0 END), 0) as total_revenue
  FROM daily_attendance da;
$$;

-- Create function to search student by registration number
CREATE OR REPLACE FUNCTION public.get_student_by_reg_number(reg_number TEXT)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  is_in_today BOOLEAN,
  total_days INTEGER,
  total_amount INTEGER
)
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