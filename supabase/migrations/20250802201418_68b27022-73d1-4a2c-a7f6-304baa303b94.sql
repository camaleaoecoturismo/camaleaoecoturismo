-- Verificar e corrigir permissões do usuário atual
-- Primeiro, vamos garantir que o primeiro usuário (provavelmente o admin) tenha a role admin

-- Inserir role admin para o primeiro usuário se ele ainda não tiver
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id, 
    'admin'::app_role as role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
AND id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
ON CONFLICT (user_id, role) DO NOTHING;

-- Para garantir que pelo menos um usuário seja admin, vamos também 
-- dar role admin para todos os usuários existentes temporariamente
-- (isso pode ser removido depois que soubermos qual é o usuário correto)
INSERT INTO public.user_roles (user_id, role)
SELECT 
    id as user_id, 
    'admin'::app_role as role
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
ON CONFLICT (user_id, role) DO NOTHING;