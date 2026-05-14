/**
 * PONTO DE ENTRADA DO APLICATIVO (ENTRY POINT)
 * Este componente é o responsável por inicializar o React e montar a interface no navegador.
 */

// Importação do Bootstrap para garantir que o sistema de grid e botões funcione em todo o projeto
import 'bootstrap/dist/css/bootstrap.min.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Importação dos estilos globais personalizados 
import './index.css'

// O componente principal que contém toda a lógica de treinos, gráficos e integração com Supabase
import App from './App.jsx'

/**
 * RENDERIZAÇÃO
 * Seleciona a 'div' com id 'root' no index.html e injeta o código React nela.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* O StrictMode ajuda a identificar práticas inseguras durante o desenvolvimento */}
    <App />
  </StrictMode>,
)