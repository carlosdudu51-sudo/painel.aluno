const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { validarAluno, limparCpf } = require('./validacao');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Envolve rotas async em try/catch automaticamente
const r = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor. Tente novamente em instantes.' });
});

// ---------- Auth helpers ----------

function gerarToken(role) {
  return jwt.sign({ role }, JWT_SECRET, { expiresIn: '12h' });
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Não autenticado.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.role = payload.role;
    next();
  } catch (e) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

function somenteMatriz(req, res, next) {
  if (req.role !== 'matriz') {
    return res.status(403).json({ erro: 'Apenas o acesso matriz pode fazer isso.' });
  }
  next();
}

// ---------- Auth routes ----------

app.post('/api/auth/login', r(async (req, res) => {
  const { role, senha } = req.body || {};
  if (!['matriz', 'cliente'].includes(role)) {
    return res.status(400).json({ erro: 'Tipo de acesso inválido.' });
  }
  if (!senha) {
    return res.status(400).json({ erro: 'Informe a senha.' });
  }
  const data = await db.read();
  const hash = data.senhas[role];
  if (!hash || !bcrypt.compareSync(senha, hash)) {
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  res.json({ token: gerarToken(role), role });
}));

app.post('/api/auth/trocar-senha', autenticar, r(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  if (!novaSenha || String(novaSenha).length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter ao menos 6 caracteres.' });
  }
  const data = await db.read();
  const hashAtual = data.senhas[req.role];
  if (!senhaAtual || !bcrypt.compareSync(senhaAtual, hashAtual)) {
    return res.status(401).json({ erro: 'Senha atual incorreta.' });
  }
  data.senhas[req.role] = bcrypt.hashSync(String(novaSenha), 10);
  await db.write(data);
  res.json({ ok: true });
}));

// ---------- Alunos routes ----------

app.get('/api/alunos', autenticar, r(async (req, res) => {
  const data = await db.read();
  let lista = data.alunos;

  const { status, plano, formaPagamento, emiteNFe, busca } = req.query;
  if (status) lista = lista.filter(a => a.status === String(status).toUpperCase());
  if (plano) lista = lista.filter(a => a.plano === String(plano).toUpperCase());
  if (formaPagamento) lista = lista.filter(a => a.formaPagamento === String(formaPagamento).toUpperCase());
  if (emiteNFe !== undefined && emiteNFe !== '') {
    const flag = emiteNFe === 'true' || emiteNFe === '1';
    lista = lista.filter(a => a.emiteNFe === flag);
  }
  if (busca) {
    const termo = String(busca).toLowerCase();
    lista = lista.filter(a =>
      a.nomeCompleto.toLowerCase().includes(termo) || limparCpf(a.cpf).includes(limparCpf(termo))
    );
  }

  res.json(lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto)));
}));

app.post('/api/alunos', autenticar, r(async (req, res) => {
  const { ok, erros, dados } = validarAluno(req.body || {});
  if (!ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: erros });

  const data = await db.read();
  const cpfDuplicado = data.alunos.some(a => limparCpf(a.cpf) === limparCpf(dados.cpf));
  if (cpfDuplicado) {
    return res.status(409).json({ erro: 'Já existe um aluno cadastrado com esse CPF.', campos: { cpf: 'CPF já cadastrado.' } });
  }

  const novo = {
    id: data.proximoId,
    ...dados,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  data.alunos.push(novo);
  data.proximoId += 1;
  await db.write(data);
  res.status(201).json(novo);
}));

app.put('/api/alunos/:id', autenticar, r(async (req, res) => {
  const id = Number(req.params.id);
  const data = await db.read();
  const idx = data.alunos.findIndex(a => a.id === id);
  if (idx === -1) return res.status(404).json({ erro: 'Aluno não encontrado.' });

  const { ok, erros, dados } = validarAluno(req.body || {}, { parcial: true });
  if (!ok) return res.status(400).json({ erro: 'Dados inválidos.', campos: erros });

  if (dados.cpf) {
    const cpfDuplicado = data.alunos.some(a => a.id !== id && limparCpf(a.cpf) === limparCpf(dados.cpf));
    if (cpfDuplicado) {
      return res.status(409).json({ erro: 'Já existe outro aluno com esse CPF.', campos: { cpf: 'CPF já cadastrado.' } });
    }
  }

  data.alunos[idx] = { ...data.alunos[idx], ...dados, atualizadoEm: new Date().toISOString() };
  await db.write(data);
  res.json(data.alunos[idx]);
}));

app.delete('/api/alunos/:id', autenticar, somenteMatriz, r(async (req, res) => {
  const id = Number(req.params.id);
  const data = await db.read();
  const existia = data.alunos.some(a => a.id === id);
  if (!existia) return res.status(404).json({ erro: 'Aluno não encontrado.' });
  data.alunos = data.alunos.filter(a => a.id !== id);
  await db.write(data);
  res.json({ ok: true });
}));

// ---------- Dashboard ----------

app.get('/api/dashboard', autenticar, r(async (req, res) => {
  const data = await db.read();
  const alunos = data.alunos;
  const ativos = alunos.filter(a => a.status === 'ATIVO');
  const queEmitemNFe = ativos.filter(a => a.emiteNFe);

  const somaPorForma = { PIX: 0, CARTAO: 0, DINHEIRO: 0 };
  const qtdPorForma = { PIX: 0, CARTAO: 0, DINHEIRO: 0 };
  const qtdPorPlano = { MENSAL: 0, TRIMESTRAL: 0, SEMESTRAL: 0, ANUAL: 0 };
  let valorTotal = 0;

  ativos.forEach(a => {
    valorTotal += a.valor || 0;
    if (somaPorForma[a.formaPagamento] !== undefined) {
      somaPorForma[a.formaPagamento] += a.valor || 0;
      qtdPorForma[a.formaPagamento] += 1;
    }
    if (qtdPorPlano[a.plano] !== undefined) qtdPorPlano[a.plano] += 1;
  });

  res.json({
    totalAtivos: ativos.length,
    totalInativos: alunos.length - ativos.length,
    totalQueEmitemNFe: queEmitemNFe.length,
    ticketMedio: ativos.length ? valorTotal / ativos.length : 0,
    valorTotalArrecadado: valorTotal,
    somaPorForma,
    qtdPorForma,
    qtdPorPlano
  });
}));

app.listen(PORT, () => {
  console.log(`Painel NFe rodando em http://localhost:${PORT} (armazenamento: ${db.USANDO_POSTGRES ? 'Postgres' : 'arquivo local'})`);
});
