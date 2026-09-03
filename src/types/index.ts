export type Notebook = {
  id: string;
  patrimonio: string;
  modelo: string;
  secao: string;
  militar: string;
  status: string;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
  data_entrada_manutencao: string | null;
  data_saida_manutencao: string | null;
  motivo_manutencao: string | null;
  observacoes_manutencao: string | null;
};

export type Material = {
  id: string;
  patrimonio: string;
  codigo_material: string;
  numero_ficha: string;
  nome: string;
  section_id: string | null;
  section_name: string | null;
  responsavel: string | null;
  situacao: string | null;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number | string | null;
  data_aquisicao: string | null;
  nota_fiscal: string | null;
  estado_conservacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type Movement = {
  id: string;
  item_tipo: string;
  item_id: string;
  data_hora: string;
  tipo_evento: string;
  secao_origem: string | null;
  secao_destino: string | null;
  responsavel_anterior: string | null;
  responsavel_novo: string | null;
  observacao: string | null;
  usuario_sistema: string | null;
  created_at: string;
};

export type Alert = {
  id: string;
  tipo: string;
  nivel: string;
  mensagem: string;
  item_id: string | null;
  item_tipo: string | null;
  item_patrimonio: string | null;
  secao: string | null;
  status: string;
  created_at: string;
  resolvido_em: string | null;
  resolvido_por: string | null;
};

export type Priority = {
  id: string;
  secao: string;
  responsavel: string;
  motivo: string;
  observacoes: string | null;
  data_solicitacao: string | null;
  ordem: number;
  status: string;
  data_encerramento: string | null;
  created_at: string;
};

export type Section = {
  id: string;
  name: string;
  created_at: string;
};

export const statusColor = (s: string) => {
  if (s === 'Em uso') return 'default';
  if (s === 'Em manutenção') return 'destructive';
  if (s === 'Baixado') return 'secondary';
  if (s === 'Em estoque') return 'outline';
  if (s === 'Fora de Carga') return 'destructive';
  return 'default';
};
