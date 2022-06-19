const data = `A:514418818*B:516969250*C:PT*D:FS*E:N*F:20220615*G:FS 104/63929*H:0*I1:PT*I5:32.91*I6:4.29*I7:2.44*I8:0.56*N:4.85*O:40.20*Q:LLEM*R:71`

// http://micromix.pt/micromix_v3/Documentos/SAFT-PT/SAFT-PT_Evolu%C3%A7%C3%A3o_codigos_Doc_Fatura%C3%A7%C3%A3o.pdf
// https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Documents/Comunicacao_Dados_Documentos_Transporte.pdf
const documentTypes = {
  FT: 'Fatura',
  FR: 'Fatura-Recibo',
  FS: 'Fatura Simplificada',
  NC: 'Nota de Crédito',
  ND: 'Nota de Débito',
  AA: 'Alienação de Activos',
  DA: 'Devolução de Activos',
  TV: 'Talão de Venda',
  TD: 'Talão de Devolução',
  VD: 'Venda a Dinheiro ou Factura/Recibo',
  GR: 'Guia de Remessa',
  GT: 'Guia de Transporte',
  GA: 'Guia de movimentação de ativos próprios',
  GC: 'Guia de Consignação',
  GD: 'Guia ou nota de devolução efetuada pelo cliente',
  CM: 'Consulta de Mesa',
  DC: 'Documento de Conferência',
  FC: 'Factura de Consignação',
  CC: 'Credito de consignação',
  FO: 'Folha de Obra',
  OR: 'Orçamento',
  PF: 'Pró-forma',
  NE: 'Nota de Encomenda',
  OU: 'Outros',
  RC: 'Recibo - Regime de IVA de Caixa',
  RG: 'Recibo - Geral',
}

const documentStates = {
  N: 'Normal',
  T: 'Por conta de terceiros',
  A: 'Anulada',
  M: 'Alterado',
}

// https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Novas_regras_faturacao/Documents/Especificacoes_Tecnicas_Codigo_QR.pdf
const keys = {
  A: 'NIF do emitente',
  B: 'NIF do adquirente',
  C: 'Pais do adquirente',
  D: 'Tipo do document',
  E: 'Estado do documento',
  F: 'Data do documento',
  G: 'Identificacao unica do documento',
  H: 'ATCUD',
  L: 'Nao sujeito em IVA / outras situacoes',
  M: 'Imposto de Selo',
  N: 'Total de impostos',
  O: 'Total do documento com impostos',
  P: 'Retencoes na fonte',
  Q: '4 carateres do Hash',
  R: 'Numero do cetrificado',
  S: 'Outras informacoes',
  1: 'Espaco fiscal',
  2: 'Base tributavel isenta de IVA',
  3: 'Base tributavel de IVA a taxa reduzida',
  4: 'Total de IVA a taxa reduzida',
  5: 'Base tributavel de IVA a taxa intermedia',
  6: 'Total de IVA a taxa intermedia',
  7: 'Base tributavel de IVA a taxa normal',
  8: 'Total de IVA a taxa normal',
}

const taxSpecifications = {
  I: 'PT',
  J: 'PT-MA', // Madeira
  K: 'PT-AC', // Azores
}

const parsed = {}
for (const [k, v] of data.split('*').map(s => s.split(':'))) {
  const value = Number.isNaN(Number(v)) ? v : Number(v)
  if (k === 'E') {
    parsed[keys[k]] = documentStates[value]
  } else if (k === 'D') {
    parsed[keys[k]] = documentTypes[value]
  } else if (k[0] in taxSpecifications) {
    parsed[keys[k[1]]] = value
  } else {
    parsed[keys[k] || k] = value
  }
}

console.log(parsed)
