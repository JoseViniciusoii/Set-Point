/**
 * CONFIGURAÇÃO DO CLIENTE SUPABASE
 * Este arquivo estabelece a conexão entre o seu Frontend (Vite/React) 
 * e o Banco de Dados (PostgreSQL no Supabase).
 */
import { createClient } from '@supabase/supabase-all'

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);