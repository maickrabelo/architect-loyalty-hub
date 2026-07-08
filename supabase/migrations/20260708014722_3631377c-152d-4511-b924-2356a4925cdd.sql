
-- Reinstala trigger de criação de profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles para users existentes sem profile
INSERT INTO public.profiles (id, email, nome)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'nome', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Backfill role arquiteto para users sem nenhum papel
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'arquiteto'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;
