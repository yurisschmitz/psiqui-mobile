import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Agenda,
  Agendamento,
  AppNotification,
  DiarioBordo,
  Cartao,
  Cobranca,
  DocumentoClinico,
  Humor,
  HumorTipo,
  Pagamento,
  Paginated,
  Psicologo,
} from './types';

// ---------- Psicólogos ----------
export const usePsychologists = (search: string) =>
  useQuery({
    queryKey: ['psicologos', search],
    queryFn: () =>
      api.get<Paginated<Psicologo>>(
        `/paciente/psicologos?status=aprovado${search ? `&nome=${encodeURIComponent(search)}` : ''}`
      ),
  });

export const usePsychologist = (id: number) =>
  useQuery({
    queryKey: ['psicologo', id],
    // O back devolve via PsicologoResource, embrulhado em { data }.
    queryFn: async () => {
      const r = await api.get<{ data: Psicologo } | Psicologo>(`/paciente/psicologos/${id}`);
      return 'data' in r ? r.data : r;
    },
    enabled: !!id,
  });

export const useAvailableSlots = (psicologoId: number) =>
  useQuery({
    queryKey: ['agendas', psicologoId],
    queryFn: () => api.get<Agenda[]>(`/paciente/agendas/${psicologoId}`),
    enabled: !!psicologoId,
  });

// ---------- Sessões ----------
export const useSessions = () =>
  useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => api.get<Agendamento[]>('/paciente/agendamentos'),
  });

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { psicologo_id: number; agendamento_id: number; nota: number; comentario?: string }) =>
      api.post('/paciente/avaliacoes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agendamentos'] }),
  });
};

// ---------- Agendamento + cobrança (Asaas) ----------
export interface CreateBookingPayload {
  agenda_id: number;
  tipo_pagamento: 'pix' | 'credit_card';
  cpf?: string;
  cartao?: Cartao;
}

const invalidarSessoes = (qc: ReturnType<typeof useQueryClient>) =>
  ['agendamentos', 'agendas', 'pagamentos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingPayload) =>
      api.post<{ agendamento: Agendamento; cobranca: Cobranca | null }>('/paciente/agendamentos', data),
    onSuccess: () => invalidarSessoes(qc),
  });
};

// Status LOCAL do pagamento (atualizado pelo webhook do Asaas) — polling do PIX.
export const usePaymentStatus = (paymentId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['pagamento-status', paymentId],
    queryFn: () => api.get<{ status: string }>(`/paciente/pagamento/${paymentId}/status`),
    enabled: enabled && !!paymentId,
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      return st === 'pago' || st === 'cancelado' ? false : 4000;
    },
  });

// Cancelar: >48h antes estorna; dentro de 48h não há reembolso (regra no back).
export const useCancelSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.put<{ message: string; estornado: boolean }>(`/paciente/agendamentos/${id}`, { status: 'cancelado' }),
    onSuccess: () => invalidarSessoes(qc),
  });
};

// Reagendar (até 24h antes): troca o horário mantendo o pagamento.
export const useRescheduleSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agendaId }: { id: number; agendaId: number }) =>
      api.put(`/paciente/agendamentos/${id}/reagendar`, { agenda_id: agendaId }),
    onSuccess: () => invalidarSessoes(qc),
  });
};

export const usePayments = () =>
  useQuery({ queryKey: ['pagamentos'], queryFn: () => api.get<Pagamento[]>('/paciente/pagamentos') });

// ---------- Bem-estar ----------
export const useMoods = (dias = 30) =>
  useQuery({ queryKey: ['humores', dias], queryFn: () => api.get<Humor[]>(`/paciente/humores?dias=${dias}`) });

export const useSaveMood = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { humor: HumorTipo; nota?: string }) => api.post('/paciente/humores', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['humores'] }),
  });
};

export const useDiaries = () =>
  useQuery({ queryKey: ['diarios'], queryFn: () => api.get<DiarioBordo[]>('/paciente/diarios') });

// ---------- Documentos clínicos ----------
export const useClinicalDocuments = () =>
  useQuery({
    queryKey: ['documentos-clinicos'],
    queryFn: () => api.get<DocumentoClinico[]>('/paciente/documentos-clinicos'),
  });

// ---------- Notificações ----------
export const useNotifications = () =>
  useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => api.get<{ data: AppNotification[]; nao_lidas: number }>('/notificacoes'),
    refetchInterval: 30_000,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/notificacoes/${id}/lida`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
};

export const useMarkAllNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.put('/notificacoes/marcar-todas-lidas'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
};

// ---------- Conta ----------
export const useChangePassword = () =>
  useMutation({
    mutationFn: (data: { senha_atual: string; password: string; password_confirmation: string }) =>
      api.put<{ message: string }>('/senha', data),
  });

export const useSendSupport = () =>
  useMutation({
    mutationFn: (data: { assunto: string; mensagem: string }) => api.post<{ message: string }>('/suporte', data),
  });
