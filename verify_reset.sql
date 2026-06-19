-- ============================================================================
-- VERIFICATION QUERIES - Run these FIRST to confirm safety
-- ============================================================================

-- 1. Check ALL foreign keys TO the tables being truncated
SELECT 
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name IN ('analytics_events', 'report_logs', 'active_sessions', 'activity_logs')
ORDER BY tc.table_name;

-- 2. Check row counts that will be deleted
SELECT 'analytics_events' as table_name, count(*) as rows_to_delete FROM public.analytics_events
UNION ALL
SELECT 'report_logs', count(*) FROM public.report_logs
UNION ALL
SELECT 'active_sessions', count(*) FROM public.active_sessions
UNION ALL
SELECT 'activity_logs', count(*) FROM public.activity_logs
UNION ALL
SELECT 'enrollments (PRESERVED)', count(*) FROM public.enrollments
UNION ALL
SELECT 'user_course_progress (PRESERVED)', count(*) FROM public.user_course_progress
UNION ALL
SELECT 'course_progress (PRESERVED)', count(*) FROM public.course_progress
UNION ALL
SELECT 'certificates (PRESERVED)', count(*) FROM public.certificates
UNION ALL
SELECT 'lesson_notes (PRESERVED)', count(*) FROM public.lesson_notes
UNION ALL
SELECT 'user_status (PRESERVED)', count(*) FROM public.user_status
UNION ALL
SELECT 'orders (PRESERVED)', count(*) FROM public.orders
UNION ALL
SELECT 'payments (PRESERVED)', count(*) FROM public.payments;

-- 3. Verify student access integrity - no orphaned enrollments
SELECT 
  'enrollments_without_user' as check_name,
  count(*) as count
FROM public.enrollments e
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 
  'enrollments_without_course',
  count(*)
FROM public.enrollments e
LEFT JOIN public.courses c ON e.course_id = c.id
WHERE c.id IS NULL
UNION ALL
SELECT 
  'progress_without_user',
  count(*)
FROM public.user_course_progress p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 
  'certificates_without_user',
  count(*)
FROM public.certificates c
LEFT JOIN auth.users u ON c.user_id = u.id
WHERE u.id IS NULL;