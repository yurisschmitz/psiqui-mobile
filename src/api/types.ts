/** Tipos espelhando a API Laravel (api-psiqui). Datas sempre em UTC (ISO 8601). */

export interface Role {
  id: number;
  name: 'paciente' | 'psicologo' | 'admin';
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  roles: Role[];
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
  foto_perfil_url?: string | null;
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

export type StatusAgendamento = 'pendente' | 'confirmado' | 'realizado' | 'cancelado' | 'falta_paciente';

export interface Agendamento {
  id: number;
  agenda_id: number;
  paciente_id: number;
  status: StatusAgendamento;
  created_at: string;
  agenda?: Agenda;
  psicologo?: Psicologo;
  pagamento?: Pagamento;
}

export interface Pagamento {
  id: number;
  agendamento_id: number;
  valor: number | string;
  tipo: string;
  status: 'pendente' | 'pago' | 'cancelado';
  data_pagamento?: string | null;
  iugu_invoice_id?: string | null;
  created_at: string;
  agendamento?: Agendamento;
}

export interface Fatura {
  id: string;
  status: string; // pending | paid | canceled
  total_cents?: number;
  secure_url?: string | null;
  pix?: { qrcode?: string | null; qrcode_text?: string | null } | null;
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

export type TipoDocumentoClinico = 'laudo' | 'declaracao' | 'atestado';

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
