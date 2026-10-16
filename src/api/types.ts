/** Tipos espelhando a API Laravel (api-psiqui). Datas sempre em UTC (ISO 8601). */

export interface Role {
  id: number;
  name: 'paciente' | 'psicologo' | 'admin';
}

/** Mesmos valores de Paciente::GENEROS no back. */
export type Genero = 'M' | 'F' | 'nao_binario' | 'outro' | 'prefiro_nao_informar';

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  roles: Role[];
  paciente?: { id: number; telefone?: string | null; data_nascimento?: string | null } | null;
}

export interface Especialidade {
  id: number;
  nome: string;
}

export interface PsicologoPerfil {
  id: number;
  titulo?: string | null;
  sobre?: string | null;
  formacao?: string | null;
  idiomas?: string | null;
  valor_sessao?: number | null;
  duracao_sessao?: number | null;
  foto_perfil?: string | null; // caminho relativo no storage público
  video_url?: string | null;
}

export interface Avaliacao {
  id: number;
  nota: number;
  comentario?: string | null;
  created_at: string;
  paciente?: { id: number; user?: { name: string } };
}

export interface Psicologo {
  id: number;
  crp?: string | null;
  bio?: string | null;
  nota_media?: number | null;
  user: { id: number; name: string; email?: string };
  perfil?: PsicologoPerfil | null;
  especialidades?: Especialidade[];
  avaliacoes?: Avaliacao[];
}

export interface Agenda {
  id: number;
  psicologo_id: number;
  data_hora_inicio: string; // UTC ISO
  data_hora_fim: string;
  tipo_sessao: 'online' | 'presencial';
  disponivel: boolean;
  valor?: number | string | null;
}

export type StatusAgendamento = 'pendente' | 'confirmado' | 'realizado' | 'cancelado' | 'faltou';

export interface Agendamento {
  id: number;
  agenda_id: number;
  paciente_id: number;
  status: StatusAgendamento;
  created_at: string;
  agenda?: Agenda;
  psicologo?: Psicologo;
  pagamento?: Pagamento;
  avaliacao?: Avaliacao | null;
}

export interface Pagamento {
  id: number;
  agendamento_id: number;
  valor: number | string;
  tipo: string;
  status: 'pendente' | 'pago' | 'cancelado' | 'estornado';
  data_pagamento?: string | null;
  created_at: string;
  agendamento?: Agendamento;
}

// Cobrança Asaas devolvida ao agendar. null = sem gateway (já confirmada).
export interface Cobranca {
  id: string;
  tipo: 'pix' | 'credit_card';
  status: string; // 'pendente' | 'pago'
  pix?: { qr_code_base64: string | null; copia_e_cola: string | null; expira_em: string | null };
}

export interface Cartao {
  nome: string;
  numero: string;
  mes: string;
  ano: string;
  cvv: string;
}

export type HumorTipo = 'Ótimo' | 'Bem' | 'Neutro' | 'Cansado' | 'Estressado' | 'Triste' | 'Ansioso';

export interface Humor {
  id: number;
  humor: HumorTipo;
  data: string; // YYYY-MM-DD
  nota?: string | null;
}

export interface DiarioBordo {
  id: number;
  data: string;
  relato?: string | null;
  observacoes?: string | null;
  tarefas?: string | null;
  visivel_paciente: boolean;
}

export type TipoDocumentoClinico = 'laudo' | 'declaracao' | 'atestado' | 'recibo';

export interface DocumentoClinico {
  id: number;
  tipo: TipoDocumentoClinico;
  titulo: string;
  conteudo: string;
  cid?: string | null;
  dias_afastamento?: number | null;
  codigo_verificacao?: string | null;
  assinado_por?: string | null;
  assinado_em?: string | null;
  created_at: string;
  psicologo?: { id: number; user: { name: string } };
}

export interface AppNotification {
  id: number;
  tipo: 'agendamento' | 'pagamento' | 'lembrete' | 'documento' | 'sistema';
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}
