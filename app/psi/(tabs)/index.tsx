import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { isSameDay } from 'date-fns';
import { useAuth } from '../../../src/context/auth';
import { useNotifications } from '../../../src/api/hooks';
import { centavos, useHorariosPsi, usePerfilPsi, useSaldo, useSessoesPsi } from '../../../src/api/psi';
import { SessaoPsiCard, faseSessao } from '../../../src/SessaoPsiCard';
import { Avatar, Card, SectionTitle, Skeleton, useTopPad } from '../../../src/ui';
import { storageUrl } from '../../../src/format';
import { brandGradient, colors, font, radius, spacing } from '../../../src/theme';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

export default function PsiHome() {
  const topPad = useTopPad();
  const [focada, setFocada] = React.useState(false);
  useFocusEffect(
    React.useCallback(() => {
      setFocada(true);
      return () => setFocada(false);
    }, [])
  );
  const router = useRouter();
  const { user } = useAuth();
  const { data: perfil } = usePerfilPsi();
  const { data: sessoes, isLoading, refetch, isRefetching } = useSessoesPsi();
  const { data: horarios, refetch: refetchHorarios } = useHorariosPsi();
  const { data: saldo, refetch: refetchSaldo } = useSaldo();
  const { data: notif } = useNotifications();
  const unread = notif?.nao_lidas ?? 0;

  const { proxima, hoje, registrar, livres7d, semana } = useMemo(() => {
    const agora = Date.now();
    const ativas = (sessoes ?? [])
      .filter((a) => a.agenda && a.status !== 'cancelado')
      .sort((a, b) => Date.parse(a.agenda!.data_hora_inicio) - Date.parse(b.agenda!.data_hora_inicio));
    const futuras = ativas.filter(
      (a) => ['pendente', 'confirmado'].includes(a.status) && Date.parse(a.agenda!.data_hora_fim) > agora
    );
    return {
      proxima: futuras[0],
      hoje: ativas.filter((a) => isSameDay(new Date(a.agenda!.data_hora_inicio), new Date()) && a.id !== futuras[0]?.id),
      registrar: ativas.filter((a) => {
        const f = faseSessao(a, agora);
        return f.precisaRegistro && !f.podeEntrar;
      }).length,
      semana: futuras.filter((a) => Date.parse(a.agenda!.data_hora_inicio) - agora < SETE_DIAS).length,
      livres7d: (horarios ?? []).filter((h) => {
        const ini = Date.parse(h.data_hora_inicio);
        return h.disponivel && ini > agora && ini - agora < SETE_DIAS;
      }).length,
    };
  }, [sessoes, horarios]);

  const onRefresh = () => {
    refetch();
    refetchHorarios();
    refetchSaldo();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {focada && <StatusBar style="light" />}
      <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.header, { paddingTop: topPad }]}>
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <Avatar name={user?.name ?? '?'} size={44} uri={storageUrl(perfil?.perfil?.foto_perfil)} />
            <View style={{ flex: 1 }}>
              <Text style={s.greeting}>{greeting()},</Text>
              <Text style={s.name} numberOfLines={1}>{user?.name?.split(' ')[0]}!</Text>
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

        <View style={s.stats}>
          <Pressable style={s.stat} onPress={() => router.push('/psi/agenda')}>
            <Text style={s.statValue}>{semana}</Text>
            <Text style={s.statLabel}>{semana === 1 ? 'sessão' : 'sessões'} nos próximos 7 dias</Text>
          </Pressable>
          <Pressable style={s.stat} onPress={() => router.push('/psi/financeiro')}>
            <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {centavos(saldo?.saldo_disponivel_centavos)}
            </Text>
            <Text style={s.statLabel}>disponível para saque</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.xl, gap: spacing.xl }}>
        {registrar > 0 && (
          <Pressable onPress={() => router.push('/psi/agenda')}>
            <Card style={{ ...s.alert, backgroundColor: colors.warningBg }}>
              <Ionicons name="alert-circle" size={22} color={colors.warning} />
              <Text style={s.alertText}>
                {registrar === 1 ? '1 sessão passada aguarda' : `${registrar} sessões passadas aguardam`} registro de realizada ou falta.
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>
        )}

        <View>
          <SectionTitle title="Próxima sessão" />
          {isLoading ? (
            <Skeleton height={110} />
          ) : proxima ? (
            <SessaoPsiCard sessao={proxima} />
          ) : (
            <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm }}>
              <Text style={{ color: colors.muted }}>Nenhuma sessão marcada.</Text>
              <Text style={{ color: colors.muted, fontSize: font.small, textAlign: 'center' }}>
                Pacientes agendam nos horários que você libera.
              </Text>
            </Card>
          )}
        </View>

        {hoje.length > 0 && (
          <View style={{ gap: spacing.md }}>
            <SectionTitle title="Também hoje" />
            {hoje.map((a) => (
              <SessaoPsiCard key={a.id} sessao={a} mostrarData={false} />
            ))}
          </View>
        )}

        <Pressable onPress={() => router.push('/psi/liberar')}>
          <Card style={s.alert}>
            <View style={s.cta}>
              <Ionicons name="add" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.ctaTitle}>Liberar horários</Text>
              <Text style={s.ctaSub}>
                {livres7d === 0
                  ? 'Você não tem horários livres nos próximos 7 dias.'
                  : `${livres7d} ${livres7d === 1 ? 'horário livre' : 'horários livres'} nos próximos 7 dias.`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: spacing.lg,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
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
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: font.tiny, fontWeight: '600' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertText: { flex: 1, color: colors.text, fontWeight: '600', fontSize: font.small },
  cta: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: { fontWeight: '700', color: colors.text },
  ctaSub: { color: colors.muted, fontSize: font.small, marginTop: 2 },
});
