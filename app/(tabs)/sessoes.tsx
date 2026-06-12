import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCreateReview, useSessions } from '../../src/api/hooks';
import type { Agendamento, StatusAgendamento } from '../../src/api/types';
import { Avatar, Badge, EmptyState, GradientButton, Skeleton } from '../../src/ui';
import { colors, font, radius, shadow, spacing } from '../../src/theme';

const statusInfo: Record<StatusAgendamento, { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  pendente: { label: 'Aguardando pagamento', tone: 'warning' },
  confirmado: { label: 'Confirmada', tone: 'success' },
  realizado: { label: 'Realizada', tone: 'muted' },
  cancelado: { label: 'Cancelada', tone: 'danger' },
  falta_paciente: { label: 'Falta', tone: 'danger' },
};

function SessionCard({
  session,
  onJoin,
  onReview,
}: {
  session: Agendamento;
  onJoin: () => void;
  onReview: () => void;
}) {
  const start = session.agenda?.data_hora_inicio ? new Date(session.agenda.data_hora_inicio) : null;
  const isFuture = start ? start.getTime() > Date.now() - 60 * 60 * 1000 : false;
  const canJoin = session.status === 'confirmado' && isFuture;
  const canReview = session.status === 'realizado';
  const info = statusInfo[session.status] ?? statusInfo.pendente;

  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={session.psicologo?.user?.name ?? 'P'} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{session.psicologo?.user?.name ?? 'Psicólogo'}</Text>
          {start && (
            <Text style={s.when}>
              {format(start, "dd 'de' MMM", { locale: ptBR })} · {format(start, 'HH:mm')} (seu horário)
            </Text>
          )}
        </View>
        <Badge label={info.label} tone={info.tone} />
      </View>

      {(canJoin || canReview) && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {canJoin && (
            <Pressable onPress={onJoin} style={s.joinBtn}>
              <Ionicons name="videocam" size={16} color="#fff" />
              <Text style={s.joinText}>Entrar na sessão</Text>
            </Pressable>
          )}
          {canReview && (
            <Pressable onPress={onReview} style={s.reviewBtn}>
              <Ionicons name="star-outline" size={16} color={colors.primary} />
              <Text style={s.reviewText}>Avaliar</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function SessionsScreen() {
  const router = useRouter();
  const { data: sessions, isLoading, refetch, isRefetching } = useSessions();
  const createReview = useCreateReview();

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
          new Date(x.agenda.data_hora_inicio).getTime() > now &&
          ['pendente', 'confirmado'].includes(x.status)
      )
      .reverse();
    const history = all.filter((x) => !upcoming.includes(x));
    return { upcoming, history };
  }, [sessions]);

  const list = tab === 'proximas' ? upcoming : history;

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
            />
          )}
        />
      )}

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
