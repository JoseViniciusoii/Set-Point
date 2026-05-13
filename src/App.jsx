import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'

function App() {
  const [nomeTreino, setNomeTreino] = useState('')
  const [meusTreinos, setMeusTreinos] = useState([])
  const [treinoSelecionado, setTreinoSelecionado] = useState(null)
  const [exercicios, setExercicios] = useState([]) // Exercícios do treino atual
  const [todosExercicios, setTodosExercicios] = useState([]) // Para o gráfico de pizza global

  const [nomeExercicio, setNomeExercicio] = useState('')
  const [carga, setCarga] = useState('')
  const [reps, setReps] = useState('')
  const [grupoMuscular, setGrupoMuscular] = useState('Peito')

  const [tempoDescanso, setTempoDescanso] = useState(60)
  const [timerAtivo, setTimerAtivo] = useState(false)

  // Estados para edição de carga
  const [editandoId, setEditandoId] = useState(null)
  const [novaCarga, setNovaCarga] = useState('')

  useEffect(() => {
    buscarTreinos()
    buscarTodosExercicios()
  }, [])

  useEffect(() => {
    if (treinoSelecionado) buscarExercicios(treinoSelecionado.id)
  }, [treinoSelecionado])

  useEffect(() => {
    let intervalo
    if (timerAtivo && tempoDescanso > 0) {
      intervalo = setInterval(() => setTempoDescanso(t => t - 1), 1000)
    } else if (tempoDescanso === 0) {
      setTimerAtivo(false)
      setTempoDescanso(60)
      alert("Descanso finalizado!")
    }
    return () => clearInterval(intervalo)
  }, [timerAtivo, tempoDescanso])

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
    if (window.confirm("Excluir esta divisão?")) {
      const { error } = await supabase.from('treinos').delete().eq('id', id)
      if (!error) buscarTreinos()
    }
  }

  async function adicionarExercicio(e) {
    e.preventDefault()
    const { error } = await supabase.from('exercicios').insert([{
      nome_exercicio: nomeExercicio,
      carga: parseFloat(carga),
      repeticoes: parseInt(reps),
      treino_id: treinoSelecionado.id,
      grupo_muscular: grupoMuscular
    }])
    if (!error) {
      setNomeExercicio(''); setCarga(''); setReps('');
      buscarExercicios(treinoSelecionado.id)
      buscarTodosExercicios()
    }
  }

  async function excluirExercicio(id) {
    if (window.confirm("Remover exercício?")) {
      const { error } = await supabase.from('exercicios').delete().eq('id', id)
      if (!error) {
        buscarExercicios(treinoSelecionado.id)
        buscarTodosExercicios()
      }
    }
  }

  async function salvarNovaCarga(id, cargaAtual) {
    const { error } = await supabase
      .from('exercicios')
      .update({ 
        carga_anterior: cargaAtual, // Atualizado para salvar o histórico
        carga: parseFloat(novaCarga) 
      })
      .eq('id', id)

    if (!error) {
      setEditandoId(null)
      setNovaCarga('')
      buscarExercicios(treinoSelecionado.id)
    }
  }

  const gerarDadosPizza = () => {
    const contagem = {}
    todosExercicios.forEach(ex => {
      const grupo = ex.grupo_muscular || 'Outros'
      contagem[grupo] = (contagem[grupo] || 0) + 1
    })
    return Object.keys(contagem).map(nome => ({
      name: nome,
      value: contagem[nome]
    }))
  }

  const dadosPizzaFuncionais = gerarDadosPizza()
  const CORES = ['#aa3bff', '#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#FF4444']

  const Navbar = () => (
    <nav className="navbar navbar-dark bg-dark sticky-top shadow-sm mb-4">
      <div className="container">
        <span className="navbar-brand fw-bold d-flex align-items-center">
          <i className="bi bi-lightning-charge-fill text-primary me-2"></i>
          SetPoint
        </span>
        {treinoSelecionado && (
          <button className="btn btn-outline-light btn-sm d-flex align-items-center" onClick={() => setTreinoSelecionado(null)}>
            <i className="bi bi-arrow-left me-2"></i> Voltar
          </button>
        )}
      </div>
    </nav>
  )

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
                      <Pie 
                        data={dadosPizzaFuncionais} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                        cx="50%"
                        cy="45%"
                      >
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
              <h6 className="text-muted small text-uppercase fw-bold">Timer de Descanso</h6>
              <div className="display-5 fw-bold text-primary my-2">{tempoDescanso}s</div>
              <div className="px-3">
                <button className={`btn btn-${timerAtivo ? 'outline-danger' : 'primary'} w-100 fw-bold`} onClick={() => setTimerAtivo(!timerAtivo)}>
                  {timerAtivo ? 'Pausar Descanso' : 'Iniciar Descanso'}
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
                      <option value="Peito">Peito</option>
                      <option value="Costas">Costas</option>
                      <option value="Perna">Perna</option>
                      <option value="Braços">Braços</option>
                      <option value="Ombros">Ombros</option>
                      <option value="Abdominal">Abdominal</option>
                      <option value="Cardio">Cardio</option>
                      <option value="Antebraço">Antebraço</option>
                      <option value="Glúteos">Glúteos</option>
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="input-group">
                        <span className="input-group-text bg-white"><i className="bi bi-hammer small"></i></span>
                        <input type="number" className="form-control" placeholder="Carga" value={carga} onChange={e => setCarga(e.target.value)} required />
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="input-group">
                        <span className="input-group-text bg-white"><i className="bi bi-arrow-repeat small"></i></span>
                        <input type="number" className="form-control" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} required />
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-success w-100 fw-bold shadow-sm">
                    <i className="bi bi-save me-2"></i> Salvar
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card border-0 shadow-sm overflow-hidden mb-4">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-white border-bottom">
                    <tr className="text-muted small text-uppercase">
                      <th className="px-4 py-3">Exercício</th>
                      <th className="py-3 text-center">Carga</th>
                      <th className="py-3 text-center">Volume</th>
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
                              <div className="input-group input-group-sm m-auto" style={{ width: '110px' }}>
                                <input type="number" className="form-control" value={novaCarga} onChange={e => setNovaCarga(e.target.value)} autoFocus />
                                <button className="btn btn-success" onClick={() => salvarNovaCarga(ex.id, ex.carga)}>
                                  <i className="bi bi-check-lg"></i>
                                </button>
                              </div>
                            ) : (
                              <div>
                                <span className="badge bg-light text-dark border px-3 py-2">{ex.carga} kg</span>
                                {ex.carga_anterior > 0 && (
                                  <div className="small mt-1 text-muted" style={{ fontSize: '0.7rem' }}>
                                    Ant: {ex.carga_anterior} kg
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="text-center"><span className="text-muted fw-semibold">{ex.repeticoes} reps</span></td>
                          <td className="text-end px-4">
                            <button 
                              className="btn btn-sm btn-outline-primary border-0 me-2" 
                              onClick={() => { setEditandoId(ex.id); setNovaCarga(ex.carga); }}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger border-0" onClick={() => excluirExercicio(ex.id)}>
                              <i className="bi bi-trash3-fill"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
                      <Tooltip />
                      {/* Linha de Carga Anterior */}
                      <Line type="monotone" dataKey="carga_anterior" stroke="#d1d1d1" strokeDasharray="5 5" dot={false} />
                      {/* Linha de Carga Atual */}
                      <Line type="monotone" dataKey="carga" stroke="#aa3bff" strokeWidth={3} dot={{ r: 6, fill: '#aa3bff' }} />
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