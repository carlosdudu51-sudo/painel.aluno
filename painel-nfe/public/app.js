const estado = {
  token: localStorage.getItem('painel_token') || null,
  role: localStorage.getItem('painel_role') || null,
  roleSelecionadaLogin: 'cliente'
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ---------- Helpers de API ----------

async function api(caminho, opcoes = {}) {
  const resp = await fetch(`/api${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(estado.token ? { Authorization: `Bearer ${estado.token}` } : {}),
      ...(opcoes.headers || {})
    }
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const erro = new Error(dados.erro || 'Erro inesperado.');
    erro.campos = dados.campos;
    erro.status = resp.status;
    throw erro;
  }
  return dados;
}

function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarToast(mensagem, tipo = 'ok') {
  const toast = $('#toast');
  toast.textContent = mensagem;
  toast.classList.toggle('erro', tipo === 'erro');
  toast.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.hidden = true; }, 3200);
}

// ---------- LOGIN ----------

$$('.login-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.login-tab').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');
    estado.roleSelecionadaLogin = btn.dataset.role;
    $('#login-erro').hidden = true;
  });
});

$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const senha = $('#input-senha').value;
  const erroEl = $('#login-erro');
  erroEl.hidden = true;
  try {
    const { token, role } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role: estado.roleSelecionadaLogin, senha })
    });
    estado.token = token;
    estado.role = role;
    localStorage.setItem('painel_token', token);
    localStorage.setItem('painel_role', role);
    $('#input-senha').value = '';
    iniciarApp();
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.hidden = false;
  }
});

$('#btn-sair').addEventListener('click', () => {
  localStorage.removeItem('painel_token');
  localStorage.removeItem('painel_role');
  estado.token = null;
  estado.role = null;
  $('#app').hidden = true;
  $('#tela-login').hidden = false;
});

// ---------- TROCAR SENHA ----------

$('#btn-trocar-senha').addEventListener('click', () => {
  $('#senha-atual').value = '';
  $('#senha-nova').value = '';
  $('#senha-erro').hidden = true;
  $('#modal-senha').hidden = false;
});
$('#modal-senha-fechar').addEventListener('click', () => $('#modal-senha').hidden = true);
$('#btn-cancelar-senha').addEventListener('click', () => $('#modal-senha').hidden = true);

$('#form-trocar-senha').addEventListener('submit', async (e) => {
  e.preventDefault();
  const senhaAtual = $('#senha-atual').value;
  const novaSenha = $('#senha-nova').value;
  const erroEl = $('#senha-erro');
  try {
    await api('/auth/trocar-senha', { method: 'POST', body: JSON.stringify({ senhaAtual, novaSenha }) });
    $('#modal-senha').hidden = true;
    mostrarToast('Senha alterada com sucesso.');
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.hidden = false;
  }
});

// ---------- DASHBOARD ----------

async function carregarDashboard() {
  const d = await api('/dashboard');
  $('#kpi-ativos').textContent = d.totalAtivos;
  $('#kpi-nfe').textContent = d.totalQueEmitemNFe;
  $('#kpi-ticket').textContent = formatarMoeda(d.ticketMedio);
  $('#kpi-total').textContent = formatarMoeda(d.valorTotalArrecadado);
  $('#kpi-pix').textContent = `${formatarMoeda(d.somaPorForma.PIX)} · ${d.qtdPorForma.PIX}`;
  $('#kpi-cartao').textContent = `${formatarMoeda(d.somaPorForma.CARTAO)} · ${d.qtdPorForma.CARTAO}`;
  $('#kpi-dinheiro').textContent = `${formatarMoeda(d.somaPorForma.DINHEIRO)} · ${d.qtdPorForma.DINHEIRO}`;
}

// ---------- TABELA / FILTROS ----------

function montarQueryFiltros() {
  const params = new URLSearchParams();
  const busca = $('#filtro-busca').value.trim();
  const status = $('#filtro-status').value;
  const plano = $('#filtro-plano').value;
  const pagamento = $('#filtro-pagamento').value;
  const nfe = $('#filtro-nfe').value;
  if (busca) params.set('busca', busca);
  if (status) params.set('status', status);
  if (plano) params.set('plano', plano);
  if (pagamento) params.set('formaPagamento', pagamento);
  if (nfe) params.set('emiteNFe', nfe);
  return params.toString();
}

let cacheAlunos = [];

async function carregarAlunos() {
  const query = montarQueryFiltros();
  const lista = await api(`/alunos${query ? `?${query}` : ''}`);
  cacheAlunos = lista;
  renderizarTabela(lista);
}

function renderizarTabela(lista) {
  const corpo = $('#tabela-corpo');
  const vazio = $('#tabela-vazia');
  corpo.innerHTML = '';
  vazio.hidden = lista.length > 0;

  lista.forEach(aluno => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(aluno.nomeCompleto)}</td>
      <td>${escapeHtml(aluno.cpf)}</td>
      <td>${aluno.idade}</td>
      <td><span class="pilula ${aluno.status === 'ATIVO' ? 'pilula-ativo' : 'pilula-inativo'}">${aluno.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span></td>
      <td>${capitalizar(aluno.plano)}</td>
      <td>${capitalizar(aluno.formaPagamento === 'CARTAO' ? 'Cartão' : aluno.formaPagamento)}</td>
      <td>${formatarMoeda(aluno.valor)}</td>
      <td><span class="pilula ${aluno.emiteNFe ? 'pilula-nfe-sim' : 'pilula-nfe-nao'}">${aluno.emiteNFe ? 'Emite' : 'Não emite'}</span></td>
      <td><button class="acao-editar" data-id="${aluno.id}">Editar</button></td>
    `;
    corpo.appendChild(tr);
  });

  $$('.acao-editar').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEdicao(Number(btn.dataset.id)));
  });
}

function capitalizar(txt) {
  if (!txt) return '';
  return txt.charAt(0) + txt.slice(1).toLowerCase();
}

function escapeHtml(txt) {
  const div = document.createElement('div');
  div.textContent = txt;
  return div.innerHTML;
}

['#filtro-busca', '#filtro-status', '#filtro-plano', '#filtro-pagamento', '#filtro-nfe'].forEach(sel => {
  $(sel).addEventListener('input', debounce(carregarAlunos, 250));
});

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- MODAL CADASTRO / EDIÇÃO ----------

const camposForm = {
  nomeCompleto: '#campo-nome',
  cpf: '#campo-cpf',
  idade: '#campo-idade',
  status: '#campo-status',
  plano: '#campo-plano',
  formaPagamento: '#campo-pagamento',
  valor: '#campo-valor'
};

function limparErrosForm() {
  $$('.campo-erro').forEach(el => el.textContent = '');
  $('#form-erro-geral').hidden = true;
}

function abrirModalNovo() {
  limparErrosForm();
  $('#modal-titulo').textContent = 'Novo aluno';
  $('#aluno-id').value = '';
  $('#form-aluno').reset();
  $('#campo-nfe').checked = false;
  $('#btn-excluir-aluno').hidden = true;
  $('#modal-aluno').hidden = false;
}

function abrirModalEdicao(id) {
  const aluno = cacheAlunos.find(a => a.id === id);
  if (!aluno) return;
  limparErrosForm();
  $('#modal-titulo').textContent = 'Editar aluno';
  $('#aluno-id').value = aluno.id;
  $('#campo-nome').value = aluno.nomeCompleto;
  $('#campo-cpf').value = aluno.cpf;
  $('#campo-idade').value = aluno.idade;
  $('#campo-status').value = aluno.status;
  $('#campo-plano').value = aluno.plano;
  $('#campo-pagamento').value = aluno.formaPagamento;
  $('#campo-valor').value = aluno.valor;
  $('#campo-nfe').checked = !!aluno.emiteNFe;
  $('#btn-excluir-aluno').hidden = estado.role !== 'matriz';
  $('#modal-aluno').hidden = false;
}

function fecharModalAluno() { $('#modal-aluno').hidden = true; }

$('#btn-novo-aluno').addEventListener('click', abrirModalNovo);
$('#modal-fechar').addEventListener('click', fecharModalAluno);
$('#btn-cancelar').addEventListener('click', fecharModalAluno);

$('#campo-cpf').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
  e.target.value = v;
});

$('#form-aluno').addEventListener('submit', async (e) => {
  e.preventDefault();
  limparErrosForm();

  const payload = {
    nomeCompleto: $('#campo-nome').value,
    cpf: $('#campo-cpf').value,
    idade: Number($('#campo-idade').value),
    status: $('#campo-status').value,
    plano: $('#campo-plano').value,
    formaPagamento: $('#campo-pagamento').value,
    valor: $('#campo-valor').value === '' ? 0 : Number($('#campo-valor').value),
    emiteNFe: $('#campo-nfe').checked
  };

  const id = $('#aluno-id').value;

  try {
    if (id) {
      await api(`/alunos/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarToast('Aluno atualizado.');
    } else {
      await api('/alunos', { method: 'POST', body: JSON.stringify(payload) });
      mostrarToast('Aluno cadastrado.');
    }
    fecharModalAluno();
    await Promise.all([carregarAlunos(), carregarDashboard()]);
  } catch (err) {
    if (err.campos) {
      Object.entries(err.campos).forEach(([campo, msg]) => {
        const el = document.querySelector(`[data-erro-de="${campo}"]`);
        if (el) el.textContent = msg;
      });
    } else {
      $('#form-erro-geral').textContent = err.message;
      $('#form-erro-geral').hidden = false;
    }
  }
});

$('#btn-excluir-aluno').addEventListener('click', async () => {
  const id = $('#aluno-id').value;
  if (!id) return;
  if (!confirm('Excluir este aluno definitivamente?')) return;
  try {
    await api(`/alunos/${id}`, { method: 'DELETE' });
    mostrarToast('Aluno excluído.');
    fecharModalAluno();
    await Promise.all([carregarAlunos(), carregarDashboard()]);
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
});

// ---------- BOOT ----------

function aplicarPermissoesPorPapel() {
  $('#badge-papel').textContent = estado.role === 'matriz' ? 'Acesso matriz' : 'Acesso cliente';
}

async function iniciarApp() {
  $('#tela-login').hidden = true;
  $('#app').hidden = false;
  aplicarPermissoesPorPapel();
  try {
    await Promise.all([carregarDashboard(), carregarAlunos()]);
  } catch (err) {
    if (err.status === 401) {
      $('#btn-sair').click();
      mostrarToast('Sessão expirada, faça login novamente.', 'erro');
    } else {
      mostrarToast(err.message, 'erro');
    }
  }
}

if (estado.token && estado.role) {
  iniciarApp();
}
