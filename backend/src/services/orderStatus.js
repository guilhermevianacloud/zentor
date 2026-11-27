/**
 * PADRÃO STATE — ciclo de vida do pedido.
 *
 * Por quê: o que se pode fazer com um pedido depende do status dele.
 * Um pedido "aguardando pagamento" pode ser pago ou cancelado; um "pago"
 * pode ser enviado ou cancelado; um "enviado" só pode ser entregue; um
 * "entregue" ou "cancelado" não muda mais. Em vez de espalhar if/else por
 * rotas e serviços, cada status é uma classe que sabe quais ações aceita
 * e para qual status leva. Ação não permitida = erro 409 com mensagem clara.
 */
class EstadoPedido {
  constructor(nome, rotulo) {
    this.nome = nome;
    this.rotulo = rotulo;
  }

  /** Ações aceitas neste estado → próximo status. */
  transicoes() {
    return {};
  }

  acoesPermitidas() {
    return Object.keys(this.transicoes());
  }

  proximo(acao) {
    const destino = this.transicoes()[acao];
    if (!destino) {
      const e = new Error(`Não é possível "${ROTULO_ACAO[acao] || acao}" um pedido com status "${this.rotulo}".`);
      e.status = 409;
      throw e;
    }
    return destino;
  }
}

class AguardandoPagamento extends EstadoPedido {
  constructor() { super('aguardando_pagamento', 'Aguardando pagamento'); }
  transicoes() { return { pagar: 'pago', cancelar: 'cancelado' }; }
}

class Pago extends EstadoPedido {
  constructor() { super('pago', 'Pago'); }
  transicoes() { return { enviar: 'enviado', cancelar: 'cancelado' }; }
}

class Enviado extends EstadoPedido {
  constructor() { super('enviado', 'Enviado'); }
  transicoes() { return { entregar: 'entregue' }; }
}

class Entregue extends EstadoPedido {
  constructor() { super('entregue', 'Entregue'); }
}

class Cancelado extends EstadoPedido {
  constructor() { super('cancelado', 'Cancelado'); }
}

const ROTULO_ACAO = { pagar: 'pagar', enviar: 'enviar', entregar: 'entregar', cancelar: 'cancelar' };

const ESTADOS = {
  aguardando_pagamento: new AguardandoPagamento(),
  pago: new Pago(),
  enviado: new Enviado(),
  entregue: new Entregue(),
  cancelado: new Cancelado(),
};

function estadoDe(status) {
  const estado = ESTADOS[status];
  if (!estado) throw new Error(`Status desconhecido: ${status}`);
  return estado;
}

module.exports = { EstadoPedido, AguardandoPagamento, Pago, Enviado, Entregue, Cancelado, estadoDe, ESTADOS };
