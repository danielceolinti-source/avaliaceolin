-- Migração para adicionar o status 'Avaliado' à tabela de avaliações
-- Esta migração remove a restrição antiga e adiciona a nova com o status incluído.

DO $$ 
BEGIN
    -- 1. Se for um domínio/tipo customizado
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_avaliacao') THEN
        ALTER TYPE status_avaliacao ADD VALUE IF NOT EXISTS 'Avaliado';
    END IF;

    -- 2. Se for uma constraint na tabela (padrão do Supabase)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'avaliacoes_status_check') THEN
        ALTER TABLE public.avaliacoes DROP CONSTRAINT avaliacoes_status_check;
    END IF;

    -- 3. Aplica a nova restrição
    ALTER TABLE public.avaliacoes ADD CONSTRAINT avaliacoes_status_check 
    CHECK (status IN ('Em Avaliação', 'Avaliado', 'Finalizada', 'Comprado', 'Não Comprado', 'Cancelado'));

    -- 4. Adiciona colunas de perfil que podem estar faltando
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_corporativo TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    -- 5. Cria tabela de configurações se não existir
    CREATE TABLE IF NOT EXISTS public.app_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
END $$;
