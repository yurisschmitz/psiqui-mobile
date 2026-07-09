import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../src/context/auth';
import { useMoods, useNotifications, useSaveMood, useSessions } from '../../src/api/hooks';
import type { HumorTipo } from '../../src/api/types';
import { Avatar, Card, SectionTitle } from '../../src/ui';
import { MOODS, localDateKey } from '../../src/mood';
import { brandGradient, colors, font, radius, shadow, spacing } from '../../src/theme';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: moods, refetch: refetchMoods, isRefetching } = useMoods();
  const saveMood = useSaveMood();
  const { data: sessions, refetch: refetchSessions } = useSessions();
  const { data: notif } = useNotifications();

  const firstName = user?.name?.split(' ')[0] ?? '';
  const unread = notif?.nao_lidas ?? 0;

  const todayKey = localDateKey(new Date());
  const todayMood = moods?.find((m) => m.data?.slice(0, 10) === todayKey);

  // Próxima sessão futura (pendente/confirmada)
  const nextSession = useMemo(() => {
    const now = Date.now();
    return (sessions ?? [])
      .filter(
        (s) =>
          s.agenda?.data_hora_inicio &&
          new Date(s.agenda.data_hora_inicio).getTime() > now &&
          ['pendente', 'confirmado'].includes(s.status)
      )
      .sort(
        (a, b) => new Date(a.agenda!.data_hora_inicio).getTime() - new Date(b.agenda!.data_hora_inicio).getTime()
      )[0];
  }, [sessions]);

  // Últimos 7 dias para a faixa da semana
  const week = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = localDateKey(d);
      const mood = moods?.find((m) => m.data?.slice(0, 10) === key);
      return { d, key, emoji: mood ? MOODS.find((x) => x.tipo === mood.humor)?.emoji : null, isToday: i === 6 };
    });
  }, [moods]);

  const handleMood = (tipo: HumorTipo) => {
    saveMood.mutate({ humor: tipo });
  };

  const onRefresh = () => {
    refetchMoods();
    refetchSessions();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header com gradiente da marca */}
      <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={user?.name ?? '?'} size={44} />
            <View>
              <Text style={s.greeting}>{greeting()},</Text>
              <Text style={s.name}>{firstName}!</Text>
            </View>
          </View>
          <Pressable onPress={() => router.push('/notificacoes')} style={s.bell} hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unread > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Check-in de humor */}
        <Text style={s.moodQuestion}>
          {todayMood ? 'Como você está se sentindo agora?' : 'Como você está se sentindo hoje?'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {MOODS.map(({ tipo, emoji }) => {
            const active = todayMood?.humor === tipo;
            return (
              <Pressable
                key={tipo}
                onPress={() => handleMood(tipo)}
                style={[s.mood, active && s.moodActive]}
                disabled={saveMood.isPending}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
                <Text style={[s.moodLabel, active && { color: colors.primary }]}>{tipo}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Semana */}
        <View style={s.week}>
          {week.map(({ d, key, emoji, isToday }) => (
            <View key={key} style={{ alignItems: 'center', gap: 4 }}>
              <View style={[s.weekDay, isToday && s.weekDayToday]}>
                <Text style={{ fontSize: 16 }}>{emoji ?? '·'}</Text>
              </View>
              <Text style={s.weekLabel}>{format(d, 'EEEEEE', { locale: ptBR })}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.xl, gap: spacing.xl }}>
        {/* Próxima sessão */}
        <View>
          <SectionTitle title="Próxima sessão" />
          {nextSession ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar name={nextSession.psicologo?.user?.name ?? 'P'} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{nextSession.psicologo?.user?.name ?? 'Psicólogo'}</Text>
                  <Text style={s.cardSub}>
                    {format(new Date(nextSession.agenda!.data_hora_inicio), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </Text>
                  <Text style={[s.cardSub, { color: colors.primary, fontWeight: '700' }]}>
                    {format(new Date(nextSession.agenda!.data_hora_inicio), 'HH:mm')} (seu horário)
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/sessao/[id]',
                      params: { id: String(nextSession.id), nome: nextSession.psicologo?.user?.name ?? 'Sessão' },
                    })
                  }
                  style={s.joinBtn}
                >
                  <Ionicons name="videocam" size={18} color="#fff" />
                </Pressable>
              </View>
            </Card>
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Text style={{ color: colors.muted, marginBottom: spacing.md }}>Nenhuma sessão agendada.</Text>
              <Pressable onPress={() => router.push('/(tabs)/psicologos')}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Encontrar um psicólogo →</Text>
              </Pressable>
            </Card>
          )}
        </View>

        {/* Diário de Bem-Estar */}
        <View>
          <SectionTitle
            title="Diário de Bem-Estar"
            action={
              <Pressable onPress={() => router.push('/diario-bem-estar')} hitSlop={8}>
                <Text style={s.link}>Ver diário →</Text>
              </Pressable>
            }
          />
          <Pressable onPress={() => router.push('/diario-bem-estar')}>
            <Card>
              {todayMood?.nota ? (
                <View style={{ gap: 6 }}>
                  <Text style={s.diaryLabel}>Sua entrada de hoje</Text>
                  <Text style={s.diarySnippet} numberOfLines={2}>
                    {todayMood.nota}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <View style={s.diaryIcon}>
                    <Ionicons name="heart-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>Como foi o seu dia?</Text>
                    <Text style={s.diarySub}>Registre uma reflexão e acompanhe sua evolução.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
              )}
            </Card>
          </Pressable>
        </View>

        {/* Atalhos */}
        <View>
          <SectionTitle title="Acesso rápido" />
          <View style={s.shortcuts}>
            {(
              [
                { icon: 'document-text-outline', label: 'Documentos', href: '/documentos' },
                { icon: 'card-outline', label: 'Pagamentos', href: '/pagamentos' },
                { icon: 'book-outline', label: 'Anotações', href: '/diario' },
                { icon: 'person-outline', label: 'Perfil', href: '/perfil' },
              ] as const
            ).map(({ icon, label, href }) => (
              <Pressable key={href} onPress={() => router.push(href)} style={s.shortcut}>
                <View style={s.shortcutIcon}>
                  <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
                <Text style={s.shortcutLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: font.small },
  name: { color: '#fff', fontSize: font.subtitle, fontWeight: '800' },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  moodQuestion: { color: '#fff', fontWeight: '700', fontSize: font.body, marginBottom: spacing.md },
  mood: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
    minWidth: 76,
  },
  moodActive: { backgroundColor: '#fff' },
  moodLabel: { fontSize: font.tiny, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xl },
  weekDay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayToday: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' },
  weekLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, textTransform: 'capitalize' },
  cardTitle: { fontWeight: '700', color: colors.text, fontSize: font.body },
  cardSub: { color: colors.muted, fontSize: font.small, marginTop: 2, textTransform: 'capitalize' },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  diaryLabel: { color: colors.muted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  diarySnippet: { color: colors.text, fontSize: font.body, lineHeight: 22 },
  diarySub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  diaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.brand,
  },
  shortcuts: { flexDirection: 'row', gap: spacing.md },
  shortcut: { flex: 1, alignItems: 'center', gap: 6 },
  shortcutIcon: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  shortcutLabel: { fontSize: font.tiny, fontWeight: '600', color: colors.text },
});
