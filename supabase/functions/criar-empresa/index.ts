import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verificar se o usuário atual é um gestor
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Verificar se tem role de gestor
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'gestor')
      .single();

    if (roleError || !roles) {
      throw new Error('Apenas gestores podem cadastrar empresas');
    }

    // Pegar dados da empresa do body
    const { nome, cnpj, email, telefone, endereco, cidade, estado, senha } = await req.json();

    // 1. Criar usuário usando admin API (não faz login automático)
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
      }
    });

    if (createUserError) throw createUserError;
    if (!newUser.user) throw new Error('Erro ao criar usuário');

    // 2. Inserir empresa
    const { error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        user_id: newUser.user.id,
        nome,
        cnpj,
        email,
        telefone,
        endereco,
        cidade,
        estado,
        ativa: true,
      });

    if (empresaError) throw empresaError;

    // 3. Remover role 'arquiteto' que foi criada automaticamente pelo trigger
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', newUser.user.id)
      .eq('role', 'arquiteto');

    // 4. Atribuir role 'empresa'
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'empresa'
      });

    if (roleInsertError) throw roleInsertError;

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
