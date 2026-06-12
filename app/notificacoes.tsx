import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../src/api/hooks';
import type { AppNotification } from '../src/api/types';
import { EmptyState, Skeleton } from '../src/ui';
import { colors, font, radius, shadow, spacing } from '../src/theme';

const tipoIcon: Record<AppNotification['tipo'], keyof typeof Ionicons.glyphMap> = {
  agendamento: 'calendar-outline',
  pagamento: 'card-outline',
  lembrete: 'alarm-outline',
  documento: 'document-text-outline',
  sistema: 'information-circle-outline',
};

export default function NotificationsScreen() {
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const list = data?.data ?? [];
  const unread = data?.nao_lidas ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {unread > 0 && (
        <Pressable onPress={() => markAll.mutate()} style={s.markAll}>
          <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
          <Text style={s.markAllText}>Marcar todas como lidas ({unread})</Text>
        </Pressable>
      )}

      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} />
          ))}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md, gap: spacing.sm, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState icon="notifications-outline" title="Nenhuma notificação" subtitle="Você está em dia! 🎉" />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => !item.lida && markRead.mutate(item.id)}
              style={[s.card, !item.lida && s.cardUnread]}
            >
              <View style={[s.icon, !item.lida && { backgroundColor: colors.primary }]}>
                <Ionicons name={tipoIcon[item.tipo] ?? 'information-circle-outline'} size={18} color={!item.lida ? '#fff' : colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.title, !item.lida && { fontWeight: '800' }]}>{item.titulo}</Text>
                <Text style={s.message} numberOfLines={2}>
                  {item.mensagem}
                </Text>
                <Text style={s.time}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                </Text>
              </View>
              {!item.lida && <View style={s.dot} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  markAllText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'flex-start',
    ...shadow.card,
  },
  cardUnread: { borderWidth: 1.5, borderColor: colors.primarySoft, backgroundColor: '#FBFDFF' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', color: colors.text, fontSize: font.small },
  message: { color: colors.muted, fontSize: font.small, lineHeight: 18 },
  time: { color: colors.muted, fontSize: font.tiny, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
