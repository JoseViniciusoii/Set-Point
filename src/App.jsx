import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
// Importação dos componentes de gráfico para a mágica visual
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

function App() {
  /** 
   * ESTADOS (STATES): O "cérebro" do App
   * Aqui o React guarda tudo o que pode mudar na tela
   */
  const [nomeTreino, setNomeTreino] = useState('') // Guarda o nome da nova divisão 
  const [meusTreinos, setMeusTreinos] = useState([]) // Lista de todas as divisões buscadas do banco
  const [treinoSelecionado, setTreinoSelecionado] = useState(null) // Controla qual treino você está visualizando agora
  const [exercicios, setExercicios] = useState([]) // Exercícios do treino atual
  const [todosExercicios, setTodosExercicios] = useState([]) // Todos os exercícios (usado no gráfico de pizza)

  // Inputs do formulário de novos exercícios
  const [nomeExercicio, setNomeExercicio] = useState('')
  const [carga, setCarga] = useState('')
  const [reps, setReps] = useState('')
  const [series, setSeries] = useState('') 
  const [grupoMuscular, setGrupoMuscular] = useState('Peito')

  // Controle do Cronômetro (Timer)
  const [tempoDescanso, setTempoDescanso] = useState(60) // O tempo que está rodando
  const [tempoConfigurado, setTempoConfigurado] = useState(60) // O tempo padrão que você definiu
  const [timerAtivo, setTimerAtivo] = useState(false) // Se esta rodando ou pausado
  const [editandoTimer, setEditandoTimer] = useState(false) // Editar timer

  // Edição rápida de carga/séries na tabela
  const [editandoId, setEditandoId] = useState(null) // Qual exercício está sendo editado 
  const [novaCarga, setNovaCarga] = useState('')
  const [novasReps, setNovasReps] = useState('')
  const [novasSeries, setNovasSeries] = useState('')

  /**
   * EFEITOS (EFFECTS): As ações automáticas
   */
  useEffect(() => {
    // Quando o app abre, ele busca os dados no Supabase
    buscarTreinos()
    buscarTodosExercicios()
  }, [])

  useEffect(() => {
    // Sempre que você clica em um treino, ele busca os exercícios daquela ID
    if (treinoSelecionado) buscarExercicios(treinoSelecionado.id)
  }, [treinoSelecionado])

  useEffect(() => {
    // A lógica do cronômetro: diminui 1 segundo a cada 1000ms se estiver ativo
    let intervalo
    if (timerAtivo && tempoDescanso > 0) {
      intervalo = setInterval(() => setTempoDescanso(t => t - 1), 1000)
    } else if (tempoDescanso === 0) {
      setTimerAtivo(false)
      setTempoDescanso(tempoConfigurado)
      
      // Mensagem de fim de descanso usando SweetAlert2 global
      if (window.Swal) {
        window.Swal.fire({
          title: 'Descanso finalizado!',
          icon: 'success',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 3000,
          background: '#aa3bff',
          color: '#fff'
        })
      }
    }
    return () => clearInterval(intervalo) // Limpa o processo ao fechar
  }, [timerAtivo, tempoDescanso, tempoConfigurado])

  /**
   * FUNÇÕES DE INTERAÇÃO (LOGICA DE NEGÓCIO)
   */
  const toggleTimer = () => setTimerAtivo(!timerAtivo) // Play/Pause
  const resetarTimer = () => { setTimerAtivo(false); setTempoDescanso(tempoConfigurado); }

  // Atualiza o tempo padrão de descanso
  const salvarNovoTempo = (e) => {
    e.preventDefault()
    setTempoDescanso(tempoConfigurado)
    setEditandoTimer(false)
    setTimerAtivo(false)
  }

  // Comandos para falar com o Banco de Dados (Supabase)
  async function buscarTreinos() {
    const { data } = await supabase.from('treinos').select('*').order('created_at', { ascending: false })
    if (data) setMeusTreinos(data)
  }

  async function buscarExercicios(treinoId) {
    const { data } = await supabase.from('exercicios').select('*').eq('treino_id', treinoId)
    if (data) setExercicios(data)
  }

  async function buscarTodosExercicios() {
    const { data } = await supabase.from('exercicios').select('grupo_muscular')
    if (data) setTodosExercicios(data)
  }

  async function criarTreino(e) {
    e.preventDefault()
    const { error } = await supabase.from('treinos').insert([{ nome: nomeTreino }])
    if (!error) { setNomeTreino(''); buscarTreinos(); }
  }

  async function excluirTreino(id, e) {
    e.stopPropagation() 
    
    if (window.Swal) {
      const confirmacao = await window.Swal.fire({
        title: 'Excluir esta divisão?',
        text: "Você perderá o histórico deste treino.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#aa3bff',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
      });

      if (confirmacao.isConfirmed) {
        const { error } = await supabase.from('treinos').delete().eq('id', id);
        if (!error) buscarTreinos();
      }
    } else {
      if (window.confirm("Tem certeza que deseja excluir esta divisão?")) {
        const { error } = await supabase.from('treinos').delete().eq('id', id);
        if (!error) buscarTreinos();
      }
    }
  }

  async function adicionarExercicio(e) {
    e.preventDefault()
    const { error } = await supabase.from('exercicios').insert([{
      nome_exercicio: nomeExercicio,
      carga: parseFloat(carga),
      repeticoes: parseInt(reps),
      series: parseInt(series),
      treino_id: treinoSelecionado.id,
      grupo_muscular: grupoMuscular
    }])
    if (!error) {
      setNomeExercicio(''); setCarga(''); setReps(''); setSeries('');
      buscarExercicios(treinoSelecionado.id)
      buscarTodosExercicios()
    }
  }

  async function excluirExercicio(id) {
    if (window.Swal) {
      const confirmacao = await window.Swal.fire({
        title: 'Remover exercício?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Remover',
        cancelButtonText: 'Manter'
      });

      if (confirmacao.isConfirmed) {
        const { error } = await supabase.from('exercicios').delete().eq('id', id);
        if (!error) { buscarExercicios(treinoSelecionado.id); buscarTodosExercicios(); }
      }
    } else {
      if (window.confirm("Remover exercício?")) {
        const { error } = await supabase.from('exercicios').delete().eq('id', id);
        if (!error) { buscarExercicios(treinoSelecionado.id); buscarTodosExercicios(); }
      }
    }
  }

  // Função que salva a nova carga e move a antiga para o histórico "Carga Anterior"
  async function salvarEdicaoCompleta(id, cargaAtual) {
    const { error } = await supabase
      .from('exercicios')
      .update({ 
        carga_anterior: cargaAtual,
        carga: parseFloat(novaCarga),
        repeticoes: parseInt(novasReps),
        series: parseInt(novasSeries)
      })
      .eq('id', id)

    if (!error) { setEditandoId(null); buscarExercicios(treinoSelecionado.id); }
  }

  /**
   * PROCESSAMENTO DE DADOS PARA GRÁFICOS
   */
  const gerarDadosPizza = () => {
    const contagem = {}
    todosExercicios.forEach(ex => {
      const grupo = ex.grupo_muscular || 'Outros'
      contagem[grupo] = (contagem[grupo] || 0) + 1
    })
    return Object.keys(contagem).map(nome => ({ name: nome, value: contagem[nome] }))
  }

  const dadosPizzaFuncionais = gerarDadosPizza()
  const CORES = ['#aa3bff', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#FF4444']

  /**
   * COMPONENTES VISUAIS (INTERFACE)
   */
  const Navbar = () => (
    <nav className="navbar navbar-dark bg-dark sticky-top shadow-sm mb-4">
      <div className="container">
        <span className="navbar-brand fw-bold d-flex align-items-center">
          <i className="bi bi-lightning-charge-fill text-primary me-2"></i> SetPoint
        </span>
        {treinoSelecionado && (
          <button className="btn btn-outline-light btn-sm d-flex align-items-center" onClick={() => setTreinoSelecionado(null)}>
            <i className="bi bi-arrow-left me-2"></i> Voltar
          </button>
        )}
      </div>
    </nav>
  )

  /**
   * TELA 1: HOME
   */
  if (!treinoSelecionado) {
    return (
      <div className="bg-light min-vh-100 pb-5">
        <Navbar />
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-4">
                <div className="card-body chart-container-pizza">
                  <h6 className="fw-bold mb-3 text-muted small text-uppercase">Distribuição de Volume</h6>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ bottom: 20 }}>
                      <Pie data={dadosPizzaFuncionais} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" cx="50%" cy="45%">
                        {dadosPizzaFuncionais.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card border-0 shadow-sm">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
                    <i className="bi bi-plus-circle-fill text-primary me-2"></i> Novo Treino
                  </h5>
                  <form onSubmit={criarTreino}>
                    <div className="mb-3">
                      <label className="form-label small text-uppercase text-muted fw-bold">Nome da Divisão</label>
                      <input className="form-control form-control-lg border-2" placeholder="Ex: Treino de Costas" value={nomeTreino} onChange={(e) => setNomeTreino(e.target.value)} required />
                    </div>
                    <button className="btn btn-primary btn-lg w-100 shadow-sm fw-bold d-flex align-items-center justify-content-center">
                      <i className="bi bi-check2-all me-2"></i> Criar Divisão
                    </button>
                  </form>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <h5 className="fw-bold mb-3 text-dark">Minhas Divisões Ativas</h5>
              <div className="row g-3">
                {meusTreinos.length === 0 && <p className="text-muted">Comece criando sua primeira divisão ao lado!</p>}
                {meusTreinos.map(t => (
                  <div key={t.id} className="col-md-6">
                    <div className="card h-100 border-0 shadow-sm card-hover-effect transition border-start border-primary border-4" onClick={() => setTreinoSelecionado(t)}>
                      <div className="card-body d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0 fw-bold text-dark">{t.nome}</h6>
                          <small className="text-primary small">Ver detalhes <i className="bi bi-chevron-right ms-1"></i></small>
                        </div>
                        <button className="btn btn-sm btn-link text-danger p-0" onClick={(e) => excluirTreino(t.id, e)}>
                          <i className="bi bi-trash3 fs-5"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /**
   * TELA 2: DENTRO DO TREINO
   */
  return (
    <div className="bg-light min-vh-100 pb-5">
      <Navbar />
      <div className="container">
        <div className="mb-4">
          <h2 className="display-6 fw-bold text-dark mb-1">{treinoSelecionado.nome}</h2>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm mb-4 text-center py-3 border-top border-primary border-4">
              <div className="d-flex justify-content-center align-items-center mb-1">
                <h6 className="text-muted small text-uppercase fw-bold mb-0">Timer de Descanso</h6>
                <button className="btn btn-sm btn-link text-primary ms-2 p-0" onClick={() => setEditandoTimer(!editandoTimer)}>
                  <i className={`bi bi-${editandoTimer ? 'x-circle' : 'pencil-square'}`}></i>
                </button>
              </div>

              {editandoTimer ? (
                <form onSubmit={salvarNovoTempo} className="px-4 my-2">
                  <div className="input-group">
                    <input type="number" className="form-control form-control-sm" value={tempoConfigurado} onChange={(e) => setTempoConfigurado(parseInt(e.target.value))} />
                    <button className="btn btn-sm btn-primary" type="submit">Definir</button>
                  </div>
                </form>
              ) : (
                <div className="display-5 fw-bold text-primary my-2">{tempoDescanso}s</div>
              )}

              <div className="px-3 d-flex gap-2">
                <button className={`btn btn-${timerAtivo ? 'warning' : 'primary'} flex-grow-1 fw-bold`} onClick={toggleTimer}>
                  <i className={`bi bi-${timerAtivo ? 'pause-fill' : 'play-fill'} me-1`}></i>
                  {timerAtivo ? 'Pausar' : (tempoDescanso < tempoConfigurado ? 'Retomar' : 'Iniciar')}
                </button>
                <button className="btn btn-outline-secondary fw-bold" onClick={resetarTimer}>
                  <i className="bi bi-arrow-counterclockwise"></i>
                </button>
              </div>
            </div>

            <div className="card border-0 shadow-sm border-top border-success border-4">
              <div className="card-body">
                <h6 className="fw-bold mb-3 d-flex align-items-center">
                  <i className="bi bi-plus-lg text-success me-2"></i> Adicionar Exercício
                </h6>
                <form onSubmit={adicionarExercicio}>
                  <div className="mb-3">
                    <input className="form-control" placeholder="Ex: Supino Reto" value={nomeExercicio} onChange={e => setNomeExercicio(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <select className="form-select shadow-sm" value={grupoMuscular} onChange={e => setGrupoMuscular(e.target.value)}>
                      <option value="Superiores">Superiores</option>
                      <option value="Inferiores">Inferiores</option>
                      <option value="Peito">Peito</option>
                      <option value="Costas">Costas</option>
                      <option value="Perna">Perna</option>
                      <option value="Braços">Braços</option>
                      <option value="Ombros">Ombros</option>
                      <option value="Abdominal">Abdominal</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Glúteos">Glúteos</option>
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4"><input type="number" className="form-control" placeholder="Carga" value={carga} onChange={e => setCarga(e.target.value)} required /></div>
                    <div className="col-4"><input type="number" className="form-control" placeholder="Séries" value={series} onChange={e => setSeries(e.target.value)} required /></div>
                    <div className="col-4"><input type="number" className="form-control" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} required /></div>
                  </div>
                  <button className="btn btn-success w-100 fw-bold shadow-sm"><i className="bi bi-save me-2"></i> Salvar</button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card border-0 shadow-sm overflow-hidden mb-4">
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-white border-bottom">
                    <tr className="text-muted small text-uppercase">
                      <th className="px-4 py-3">Exercício</th>
                      <th className="py-3 text-center">Carga</th>
                      <th className="py-3 text-center">Volume (SÉRIES x REPS)</th>
                      <th className="py-3 text-end px-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercicios.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-5 text-muted">Nenhum exercício registrado.</td></tr>
                    ) : (
                      exercicios.map(ex => (
                        <tr key={ex.id}>
                          <td className="px-4 py-3">
                            <span className="fw-bold text-dark d-block">{ex.nome_exercicio}</span>
                            <small className="text-muted">{ex.grupo_muscular}</small>
                          </td>
                          <td className="text-center">
                            {editandoId === ex.id ? (
                              <input type="number" className="form-control form-control-sm m-auto" style={{ width: '80px' }} value={novaCarga} onChange={e => setNovaCarga(e.target.value)} />
                            ) : (
                              <div>
                                <span className="badge bg-light text-dark border px-3 py-2">{ex.carga} kg</span>
                                {ex.carga_anterior > 0 && <div className="small mt-1 fw-bold" style={{ fontSize: '0.75rem', color: '#aa3bff' }}>Ant: {ex.carga_anterior} kg</div>}
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            {editandoId === ex.id ? (
                              <div className="d-flex justify-content-center gap-1">
                                <input type="number" className="form-control form-control-sm" style={{ width: '50px' }} value={novasSeries} onChange={e => setNovasSeries(e.target.value)} />
                                <span>x</span>
                                <input type="number" className="form-control form-control-sm" style={{ width: '50px' }} value={novasReps} onChange={e => setNovasReps(e.target.value)} />
                              </div>
                            ) : (
                              <span className="text-muted fw-semibold">{ex.series || 0} x {ex.repeticoes}</span>
                            )}
                          </td>
                          <td className="text-end px-4">
                            {editandoId === ex.id ? (
                               <button className="btn btn-sm btn-success border-0 me-2" onClick={() => salvarEdicaoCompleta(ex.id, ex.carga)}><i className="bi bi-check-lg"></i></button>
                            ) : (
                              <button className="btn btn-sm btn-outline-primary border-0 me-2" onClick={() => { setEditandoId(ex.id); setNovaCarga(ex.carga); setNovasSeries(ex.series || 0); setNovasReps(ex.repeticoes); }}>
                                <i className="bi bi-pencil-square"></i>
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => excluirExercicio(ex.id)}><i className="bi bi-trash3-fill"></i></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-block d-md-none">
                {exercicios.length === 0 ? (
                  <div className="text-center py-5 text-muted">Nenhum exercício registrado.</div>
                ) : (
                  exercicios.map(ex => (
                    <div key={ex.id} className="card border-0 border-bottom rounded-0 p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <span className="fw-bold text-dark d-block">{ex.nome_exercicio}</span>
                          <small className="text-muted">{ex.grupo_muscular}</small>
                        </div>
                        <div className="d-flex gap-2">
                          {editandoId === ex.id ? (
                             <button className="btn btn-sm btn-success" onClick={() => salvarEdicaoCompleta(ex.id, ex.carga)}><i className="bi bi-check-lg"></i></button>
                          ) : (
                             <button className="btn btn-sm btn-outline-primary border-0" onClick={() => { setEditandoId(ex.id); setNovaCarga(ex.carga); setNovasSeries(ex.series || 0); setNovasReps(ex.repeticoes); }}>
                               <i className="bi bi-pencil-square"></i>
                             </button>
                          )}
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => excluirExercicio(ex.id)}><i className="bi bi-trash3-fill"></i></button>
                        </div>
                      </div>

                      {editandoId === ex.id ? (
                        <div className="bg-light p-2 rounded">
                          <div className="row g-2">
                            <div className="col-4">
                              <label className="small fw-bold text-muted" style={{fontSize: '0.65rem'}}>CARGA (KG)</label>
                              <input type="number" className="form-control form-control-sm" value={novaCarga} onChange={e => setNovaCarga(e.target.value)} />
                            </div>
                            <div className="col-4">
                              <label className="small fw-bold text-muted" style={{fontSize: '0.65rem'}}>SÉRIES</label>
                              <input type="number" className="form-control form-control-sm" value={novasSeries} onChange={e => setNovasSeries(e.target.value)} />
                            </div>
                            <div className="col-4">
                              <label className="small fw-bold text-muted" style={{fontSize: '0.65rem'}}>REPS</label>
                              <input type="number" className="form-control form-control-sm" value={novasReps} onChange={e => setNovasReps(e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="d-flex justify-content-around bg-light py-2 rounded shadow-sm">
                          <div className="text-center">
                            <div className="text-muted fw-bold" style={{fontSize: '0.65rem'}}>CARGA</div>
                            <span className="fw-bold text-primary">{ex.carga}kg</span>
                          </div>
                          <div className="text-center">
                            <div className="text-muted fw-bold" style={{fontSize: '0.65rem'}}>SÉRIES</div>
                            <span className="fw-bold">{ex.series || 0}</span>
                          </div>
                          <div className="text-center">
                            <div className="text-muted fw-bold" style={{fontSize: '0.65rem'}}>REPS</div>
                            <span className="fw-bold">{ex.repeticoes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {exercicios.length > 0 && (
              <div className="card border-0 shadow-sm p-4">
                <h6 className="fw-bold mb-4 text-muted small text-uppercase">Evolução de Carga (Últimos Exercícios)</h6>
                <div className="chart-container-line">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={exercicios}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome_exercicio" hide />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="carga_anterior" name="Carga Anterior" stroke="#d4a5ff" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="carga" name="Carga Atual" stroke="#aa3bff" strokeWidth={4} dot={{ r: 6, fill: '#aa3bff', strokeWidth: 2, stroke: '#fff' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App