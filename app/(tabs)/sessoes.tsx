import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useAvailableSlots,
  useCancelSession,
  useCreateReview,
  useRescheduleSession,
  useSessions,
} from '../../src/api/hooks';
import type { Agendamento, StatusAgendamento } from '../../src/api/types';
import { Avatar, Badge, EmptyState, GradientButton, Skeleton } from '../../src/ui';
import { colors, font, radius, shadow, spacing } from '../../src/theme';
import { capitalizar } from '../../src/format';

const statusInfo: Record<StatusAgendamento, { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  pendente: { label: 'Aguardando pagamento', tone: 'warning' },
  confirmado: { label: 'Confirmada', tone: 'success' },
  realizado: { label: 'Realizada', tone: 'muted' },
  cancelado: { label: 'Cancelada', tone: 'danger' },
  faltou: { label: 'Falta', tone: 'danger' },
};

const HORA = 60 * 60 * 1000;
// Mesma política da web: reagendar até 24h antes; cancelar com +48h devolve o valor.
const REAGENDAR_ATE = 24 * HORA;
const ESTORNO_ATE = 48 * HORA;
const SALA_ABRE_ANTES = 10 * 60 * 1000;

const faltaTexto = (ms: number) => {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
};

function SessionCard({
  session,
  onJoin,
  onReview,
  onCancel,
  onReschedule,
}: {
  session: Agendamento;
  onJoin: () => void;
  onReview: () => void;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const start = session.agenda?.data_hora_inicio ? new Date(session.agenda.data_hora_inicio) : null;
  const end = session.agenda?.data_hora_fim ? new Date(session.agenda.data_hora_fim) : null;
  const now = Date.now();
  const ateInicio = start ? start.getTime() - now : 0;
  const terminou = !!end && end.getTime() < now;
  const ativa = ['pendente', 'confirmado'].includes(session.status);
  const salaAberta = session.status === 'confirmado' && ateInicio <= SALA_ABRE_ANTES && !terminou;
  const futura = ativa && ateInicio > 0;
  const canReview =
    !session.avaliacao && (session.status === 'realizado' || (session.status === 'confirmado' && terminou));
  const info =
    session.status === 'confirmado' && terminou
      ? { label: 'Realizada', tone: 'muted' as const }
      : statusInfo[session.status] ?? statusInfo.pendente;

  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={session.psicologo?.user?.name ?? 'P'} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{session.psicologo?.user?.name ?? 'Psicólogo'}</Text>
          {start && (
            <Text style={s.when}>
              {capitalizar(format(start, "EEE, dd 'de' MMM", { locale: ptBR }))} · {format(start, 'HH:mm')}
            </Text>
          )}
        </View>
        <Badge label={session.avaliacao ? 'Avaliada' : info.label} tone={info.tone} />
      </View>

      {salaAberta && (
        <Pressable onPress={onJoin} style={[s.joinBtn, { marginTop: spacing.md }]}>
          <Ionicons name="videocam" size={16} color="#fff" />
          <Text style={s.joinText}>Entrar na sessão</Text>
        </Pressable>
      )}

      {futura && !salaAberta && (
        <View style={s.actions}>
          <View style={s.opensIn}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={s.opensInText}>Sala abre em {faltaTexto(ateInicio - SALA_ABRE_ANTES)}</Text>
          </View>
          {ateInicio > REAGENDAR_ATE && (
            <Pressable onPress={onReschedule} hitSlop={6}>
              <Text style={s.linkText}>Reagendar</Text>
            </Pressable>
          )}
          <Pressable onPress={onCancel} hitSlop={6}>
            <Text style={[s.linkText, { color: colors.danger }]}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      {canReview && (
        <Pressable onPress={onReview} style={[s.reviewBtn, { marginTop: spacing.md }]}>
          <Ionicons name="star-outline" size={16} color={colors.primary} />
          <Text style={s.reviewText}>Avaliar sessão</Text>
        </Pressable>
      )}
    </View>
  );
}

// Horários livres do mesmo psicólogo para trocar a sessão (mantém o pagamento).
function RescheduleModal({ session, onClose }: { session: Agendamento | null; onClose: () => void }) {
  const psicologoId = session?.psicologo?.id ?? session?.agenda?.psicologo_id ?? 0;
  const { data: slots, isLoading } = useAvailableSlots(psicologoId);
  const reschedule = useRescheduleSession();
  const futuros = (slots ?? [])
    .filter((a) => new Date(a.data_hora_inicio).getTime() > Date.now())
    .sort((a, b) => a.data_hora_inicio.localeCompare(b.data_hora_inicio))
    .slice(0, 30);

  const escolher = (agendaId: number, quando: string) =>
    Alert.alert('Trocar o horário?', `A sessão passa para ${quando}. O pagamento continua valendo.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () =>
          reschedule.mutate(
            { id: session!.id, agendaId },
            {
              onSuccess: () => {
                onClose();
                Alert.alert('Sessão reagendada', `Novo horário: ${quando}.`);
              },
              onError: (e: any) => Alert.alert('Não foi possível reagendar', e?.message ?? 'Tente novamente.'),
            }
          ),
      },
    ]);

  return (
    <Modal visible={!!session} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <View style={[s.modal, { maxHeight: '80%' }]}>
          <Text style={s.modalTitle}>Reagendar sessão</Text>
          <Text style={s.modalSub}>Escolha um novo horário com {session?.psicologo?.user?.name}</Text>
          {isLoading ? (
            <Skeleton height={120} />
          ) : futuros.length === 0 ? (
            <Text style={s.modalSub}>Nenhum outro horário livre no momento.</Text>
          ) : (
            <FlatList
              data={futuros}
              keyExtractor={(a) => String(a.id)}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item }) => {
                const quando = format(new Date(item.data_hora_inicio), "EEEE, dd 'de' MMM 'às' HH:mm", { locale: ptBR });
                return (
                  <Pressable
                    disabled={reschedule.isPending}
                    onPress={() => escolher(item.id, quando)}
                    style={({ pressed }) => [s.slot, pressed && { borderColor: colors.primary }]}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={s.slotText}>{capitalizar(quando)}</Text>
                  </Pressable>
                );
              }}
            />
          )}
          <Pressable onPress={onClose} style={{ alignItems: 'center', padding: spacing.md }}>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function SessionsScreen() {
  const router = useRouter();
  const { data: sessions, isLoading, refetch, isRefetching } = useSessions();
  const createReview = useCreateReview();
  const cancelSession = useCancelSession();
  const [rescheduling, setRescheduling] = useState<Agendamento | null>(null);

  const [tab, setTab] = useState<'proximas' | 'historico'>('proximas');
  const [reviewing, setReviewing] = useState<Agendamento | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');

  const { upcoming, history } = useMemo(() => {
    const now = Date.now();
    const all = [...(sessions ?? [])].sort(
      (a, b) =>
        new Date(b.agenda?.data_hora_inicio ?? b.created_at).getTime() -
        new Date(a.agenda?.data_hora_inicio ?? a.created_at).getTime()
    );
    const upcoming = all
      .filter(
        (x) =>
          x.agenda?.data_hora_inicio &&
          new Date(x.agenda.data_hora_fim ?? x.agenda.data_hora_inicio).getTime() > now &&
          ['pendente', 'confirmado'].includes(x.status)
      )
      .reverse();
    const history = all.filter((x) => !upcoming.includes(x));
    return { upcoming, history };
  }, [sessions]);

  const list = tab === 'proximas' ? upcoming : history;

  // Reagendar é a 1ª opção; o aviso diz se o valor volta ou não antes de confirmar.
  const confirmarCancelamento = (item: Agendamento) => {
    const ate = new Date(item.agenda?.data_hora_inicio ?? 0).getTime() - Date.now();
    const pago = item.pagamento?.status === 'pago';
    const msg = !pago
      ? 'O horário volta a ficar livre para outras pessoas.'
      : ate > ESTORNO_ATE
        ? 'Faltam mais de 48 horas: o valor volta integralmente pela mesma forma de pagamento.'
        : 'Faltam menos de 48 horas: pela política de cancelamento, o valor não é devolvido.';
    const cancelar = () =>
      cancelSession.mutate(item.id, {
        onSuccess: (r) => Alert.alert('Sessão cancelada', r.message),
        onError: (e: any) => Alert.alert('Não foi possível cancelar', e?.message ?? 'Tente novamente.'),
      });
    Alert.alert('Cancelar sessão?', msg, [
      { text: 'Voltar', style: 'cancel' },
      ...(ate > REAGENDAR_ATE ? [{ text: 'Reagendar', onPress: () => setRescheduling(item) }] : []),
      { text: 'Cancelar sessão', style: 'destructive' as const, onPress: cancelar },
    ]);
  };

  const submitReview = () => {
    if (!reviewing) return;
    createReview.mutate(
      {
        psicologo_id: reviewing.psicologo?.id ?? reviewing.agenda?.psicologo_id ?? 0,
        agendamento_id: reviewing.id,
        nota: stars,
        comentario: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReviewing(null);
          setComment('');
          setStars(5);
          Alert.alert('Obrigado!', 'Sua avaliação foi registrada.');
        },
        onError: (e: any) => Alert.alert('Não foi possível avaliar', e?.message ?? 'Tente novamente.'),
      }
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.header}>
        <Text style={s.title}>Suas sessões</Text>
        <View style={s.tabs}>
          {(
            [
              { k: 'proximas', label: `Próximas (${upcoming.length})` },
              { k: 'historico', label: 'Histórico' },
            ] as const
          ).map(({ k, label }) => (
            <Pressable key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabActive]}>
              <Text style={[s.tabText, tab === k && s.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={92} />
          ))}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: 0, gap: spacing.md, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={tab === 'proximas' ? 'Nenhuma sessão agendada' : 'Nenhuma sessão no histórico'}
              subtitle={tab === 'proximas' ? 'Encontre um psicólogo e agende sua primeira sessão.' : undefined}
            />
          }
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onJoin={() =>
                router.push({
                  pathname: '/sessao/[id]',
                  params: { id: String(item.id), nome: item.psicologo?.user?.name ?? 'Sessão' },
                })
              }
              onReview={() => setReviewing(item)}
              onCancel={() => confirmarCancelamento(item)}
              onReschedule={() => setRescheduling(item)}
            />
          )}
        />
      )}

      <RescheduleModal session={rescheduling} onClose={() => setRescheduling(null)} />

      {/* Modal de avaliação */}
      <Modal visible={!!reviewing} transparent animationType="fade" onRequestClose={() => setReviewing(null)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Avaliar sessão</Text>
            <Text style={s.modalSub}>{reviewing?.psicologo?.user?.name}</Text>

            <View style={s.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)} hitSlop={6}>
                  <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={34} color="#F59E0B" />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={s.commentInput}
              placeholder="Deixe um comentário (opcional)..."
              placeholderTextColor={colors.muted}
              multiline
              value={comment}
              onChangeText={setComment}
            />

            <GradientButton title="Enviar avaliação" onPress={submitReview} loading={createReview.isPending} />
            <Pressable onPress={() => setReviewing(null)} style={{ alignItems: 'center', padding: spacing.md }}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 64, padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  tabs: { flexDirection: 'row', backgroundColor: '#E9EEF6', borderRadius: radius.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.card, ...shadow.card },
  tabText: { fontSize: font.small, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, ...shadow.card },
  name: { fontWeight: '700', color: colors.text, fontSize: font.body },
  when: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  joinBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: { color: '#fff', fontWeight: '700', fontSize: font.small },
  reviewBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  opensIn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  opensInText: { color: colors.muted, fontSize: font.small },
  linkText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  slotText: { color: colors.text, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', padding: spacing.xl },
  modal: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  modalTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.text, textAlign: 'center' },
  modalSub: { color: colors.muted, textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  commentInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
  },
});
