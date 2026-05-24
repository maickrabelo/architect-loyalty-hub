-- Fix 1: Remove privilege escalation vulnerability in user_roles
-- Drop the dangerous policy that allows users to assign themselves any role
DROP POLICY IF EXISTS "Usuários podem criar sua própria role" ON public.user_roles;

-- Add secure policy: only gestores can manage roles
CREATE POLICY "Gestores podem criar roles" 
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- Update the handle_new_user trigger to automatically assign 'arquiteto' role
-- This ensures roles are assigned server-side during registration, not client-side
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  
  -- Automatically assign 'arquiteto' role for new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'arquiteto');
  
  RETURN NEW;
END;
$$;

-- Fix 2: Restrict PII exposure in profiles table
-- Add explicit policy to deny access to other users' profiles
CREATE POLICY "Deny access to other users profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'gestor')
);

-- Drop the old overlapping policy
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Gestores podem ver todos os perfis" ON public.profiles;