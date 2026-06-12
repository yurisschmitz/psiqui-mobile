import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Agenda,
  Agendamento,
  AppNotification,
  DiarioBordo,
  DocumentoClinico,
  Fatura,
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
    queryFn: () => api.get<Psicologo>(`/paciente/psicologos/${id}`),
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

// ---------- Pagamento (agendamento + fatura Iugu) ----------
export interface CreateBookingPayload {
  agenda_id: number;
  nome: string;
  email: string;
  return_url: string;
  tipo_pagamento: 'pix' | 'credit_card';
}

export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingPayload) =>
      api.post<{ agendamento: Agendamento; fatura: Fatura }>('/paciente/agendamentos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agendamentos'] });
      qc.invalidateQueries({ queryKey: ['agendas'] });
    },
  });
};

export const useInvoiceStatus = (faturaId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ['fatura', faturaId],
    queryFn: () => api.get<Fatura>(`/paciente/fatura/${faturaId}/consulta`),
    enabled: enabled && !!faturaId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'paid' || s === 'canceled' ? false : 4000;
    },
  });

export const useConfirmDevPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => api.post('/paciente/pagamentos/confirmar-dev', { invoice_id: invoiceId }),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['fatura', id] }),
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
