// Validações de dados do cadastro de aluno

function limparCpf(cpf) {
  return String(cpf || '').replace(/[^\d]/g, '');
}

function formatarCpf(cpfNumeros) {
  const c = limparCpf(cpfNumeros);
  if (c.length !== 11) return cpfNumeros;
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function cpfValido(cpfOriginal) {
  const cpf = limparCpf(cpfOriginal);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os digitos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[10], 10)) return false;

  return true;
}

const PLANOS_VALIDOS = ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const PAGAMENTOS_VALIDOS = ['PIX', 'CARTAO', 'DINHEIRO'];
const STATUS_VALIDOS = ['ATIVO', 'INATIVO'];

function validarAluno(dados, { parcial = false } = {}) {
  const erros = {};
  const out = {};

  // Nome completo
  if (!parcial || dados.nomeCompleto !== undefined) {
    const nome = String(dados.nomeCompleto || '').trim();
    if (!nome) {
      erros.nomeCompleto = 'Informe o nome completo.';
    } else if (nome.split(/\s+/).filter(Boolean).length < 2) {
      erros.nomeCompleto = 'Informe nome e sobrenome.';
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/.test(nome)) {
      erros.nomeCompleto = 'Nome contém caracteres inválidos.';
    } else {
      out.nomeCompleto = nome.replace(/\s+/g, ' ');
    }
  }

  // CPF
  if (!parcial || dados.cpf !== undefined) {
    const cpfLimpo = limparCpf(dados.cpf);
    if (!cpfLimpo) {
      erros.cpf = 'Informe o CPF.';
    } else if (!cpfValido(cpfLimpo)) {
      erros.cpf = 'CPF inválido.';
    } else {
      out.cpf = formatarCpf(cpfLimpo);
    }
  }

  // Idade
  if (!parcial || dados.idade !== undefined) {
    const idade = Number(dados.idade);
    if (dados.idade === undefined || dados.idade === null || dados.idade === '') {
      erros.idade = 'Informe a idade.';
    } else if (!Number.isInteger(idade) || idade < 0 || idade > 120) {
      erros.idade = 'Idade deve ser um número entre 0 e 120.';
    } else {
      out.idade = idade;
    }
  }

  // Status
  if (!parcial || dados.status !== undefined) {
    const status = String(dados.status || '').toUpperCase().trim();
    if (!STATUS_VALIDOS.includes(status)) {
      erros.status = `Status deve ser um dos: ${STATUS_VALIDOS.join(', ')}.`;
    } else {
      out.status = status;
    }
  }

  // Plano
  if (!parcial || dados.plano !== undefined) {
    const plano = String(dados.plano || '').toUpperCase().trim();
    if (!PLANOS_VALIDOS.includes(plano)) {
      erros.plano = `Plano deve ser um dos: ${PLANOS_VALIDOS.join(', ')}.`;
    } else {
      out.plano = plano;
    }
  }

  // Forma de pagamento
  if (!parcial || dados.formaPagamento !== undefined) {
    const fp = String(dados.formaPagamento || '').toUpperCase().trim();
    if (!PAGAMENTOS_VALIDOS.includes(fp)) {
      erros.formaPagamento = `Forma de pagamento deve ser uma das: ${PAGAMENTOS_VALIDOS.join(', ')}.`;
    } else {
      out.formaPagamento = fp;
    }
  }

  // Emite NFe (flag)
  if (!parcial || dados.emiteNFe !== undefined) {
    if (typeof dados.emiteNFe !== 'boolean') {
      erros.emiteNFe = 'Informe se emite NFe (sim/não).';
    } else {
      out.emiteNFe = dados.emiteNFe;
    }
  }

  // Valor mensalidade (opcional)
  if (dados.valor !== undefined && dados.valor !== null && dados.valor !== '') {
    const valor = Number(dados.valor);
    if (Number.isNaN(valor) || valor < 0) {
      erros.valor = 'Valor deve ser um número positivo.';
    } else {
      out.valor = valor;
    }
  } else if (!parcial) {
    out.valor = 0;
  }

  return { ok: Object.keys(erros).length === 0, erros, dados: out };
}

module.exports = {
  cpfValido,
  limparCpf,
  formatarCpf,
  validarAluno,
  PLANOS_VALIDOS,
  PAGAMENTOS_VALIDOS,
  STATUS_VALIDOS
};
