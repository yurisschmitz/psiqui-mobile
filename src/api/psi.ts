import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Agenda, Agendamento, DiarioBordo, Humor, Pagamento, StatusAgendamento } from './types';

/** Hooks da área do psicólogo (rotas /psicologo/* do back). */

export interface PerfilPsicologo {
  user: { id: number; name: string; email: string };
  psicologo: { id: number; status: 'pendente' | 'aprovado' | 'reprovado' | string; crp?: string | null; nota_media?: number | null; especialidades?: { id: number; nome: string }[] };
  perfil: { titulo?: string | null; sobre?: string | null; valor_sessao?: number | string | null; foto_perfil?: string | null } | null;
}

export interface Saldo {
  saldo_disponivel_centavos: number;
  a_liberar_centavos?: number;
  pode_sacar_essa_semana: boolean;
}

export interface Saque {
  id: number;
  valor_centavos: number;
  status: 'pendente' | 'processando' | 'concluido' | 'falhou';
  motivo_falha: string | null;
  created_at: string;
}

export const usePerfilPsi = () =>
  useQuery({ queryKey: ['psi-perfil'], queryFn: () => api.get<PerfilPsicologo>('/psicologo/perfil') });

export const useSalvarPerfilPsi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { titulo?: string; sobre?: string; valor_sessao?: number | null }) => api.put('/psicologo/perfil', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['psi-perfil'] }),
  });
};

// ---------- Sessões e horários ----------
export const useSessoesPsi = () =>
  useQuery({ queryKey: ['psi-agendamentos'], queryFn: () => api.get<Agendamento[]>('/psicologo/agendamentos') });

export const useHorariosPsi = () =>
  useQuery({ queryKey: ['psi-agendas'], queryFn: () => api.get<Agenda[]>('/psicologo/agendas') });

const invalidar = (qc: ReturnType<typeof useQueryClient>) =>
  ['psi-agendamentos', 'psi-agendas', 'psi-pagamentos', 'psi-saldo'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

/** realizado/faltou só depois do início; cancelado pelo psicólogo sempre estorna (regra no back). */
export const useMudarStatusSessao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusAgendamento }) =>
      api.put<{ message: string }>(`/psicologo/agendamentos/${id}`, { status }),
    onSuccess: () => invalidar(qc),
  });
};

/** Sessões de 50 min, num lote só; o back ignora passados e sobrepostos. */
export const useLiberarHorarios = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: { data_hora_inicio: string; data_hora_fim: string }[]) =>
      api.post<{ criados: number; ignorados: number }>('/psicologo/agendas/lote', {
        slots,
        tipo_sessao: 'online',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
      }),
    onSuccess: () => invalidar(qc),
  });
};

export const useRemoverHorario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/psicologo/agendas/${id}`),
    onSuccess: () => invalidar(qc),
  });
};

// ---------- Pacientes ----------
export const useHumoresPaciente = (pacienteId: number) =>
  useQuery({
    queryKey: ['psi-humores', pacienteId],
    queryFn: () => api.get<Humor[]>(`/psicologo/pacientes/${pacienteId}/humores?dias=30`),
    enabled: !!pacienteId,
  });

export const useAnotacoes = (pacienteId: number) =>
  useQuery({
    queryKey: ['psi-diarios', pacienteId],
    queryFn: () => api.get<DiarioBordo[]>(`/psicologo/diarios?paciente_id=${pacienteId}`),
    enabled: !!pacienteId,
  });

export const useNovaAnotacao = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { paciente_id: number; relato: string; data: string; visivel_paciente: boolean }) =>
      api.post('/psicologo/diarios', data),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['psi-diarios', v.paciente_id] }),
  });
};

// ---------- Financeiro ----------
export const useSaldo = () => useQuery({ queryKey: ['psi-saldo'], queryFn: () => api.get<Saldo>('/psicologo/saldo') });

export const useSaques = () =>
  useQuery({ queryKey: ['psi-saques'], queryFn: () => api.get<{ data: Saque[] }>('/psicologo/saques') });

export const useRecebimentos = () =>
  useQuery({ queryKey: ['psi-pagamentos'], queryFn: () => api.get<Pagamento[]>('/psicologo/pagamentos') });

export const useDadosPagamento = () =>
  useQuery({
    queryKey: ['psi-dados-pagamento'],
    queryFn: () => api.get<{ dados: { chave_pix?: string; ativo?: boolean } | null }>('/psicologo/dados-pagamento'),
  });

export const useSolicitarSaque = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/psicologo/saques'),
    onSuccess: () => ['psi-saldo', 'psi-saques'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
};

export const centavos = (c?: number | null) =>
  ((c ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
