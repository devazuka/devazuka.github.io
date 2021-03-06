import { createCanvas, loadImage } from "https://deno.land/x/canvas/mod.ts";
import { scanImageData } from "https://deno.land/x/zbar_wasm/mod.ts"

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

const parse = data => Object.fromEntries(
  data.split('*').map(s => s.split(':')).map(([k, v]) => {
    const value = Number.isNaN(Number(v)) ? v : Number(v)
    if (k === 'E') return [k, documentStates[value]]
    if (k === 'D') return [k, documentTypes[value]]
    return [k[0] in taxSpecifications ? k[1] : k, value]
  })
)

const readQRCode = async src => {
  const img = await loadImage(src)
  const w = img.width()
  const h = img.height()
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h)
  for (const qr of await scanImageData(data)) {
    return parse(qr.decode())
  }
}

await readQRCode('./20220615_183805.jpg') // works with url too !
