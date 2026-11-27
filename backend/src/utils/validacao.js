/** Valida CPF pelos dígitos verificadores (algoritmo oficial da Receita). */
function cpfValido(valor) {
  const cpf = String(valor || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9)) === Number(cpf[9]) && digito(cpf.slice(0, 10)) === Number(cpf[10]);
}

const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
const soDigitos = (v) => String(v || '').replace(/\D/g, '');

module.exports = { cpfValido, emailValido, soDigitos };
