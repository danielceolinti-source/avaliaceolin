INSERT INTO public.user_roles (user_id, role)
VALUES ('f8a9191a-e83f-46c6-b4fe-aa118a3a117a', 'super_admin')
ON CONFLICT DO NOTHING;