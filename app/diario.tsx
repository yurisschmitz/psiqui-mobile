import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDiaries } from '../src/api/hooks';
import { EmptyState, Skeleton } from '../src/ui';
import { colors, font, radius, shadow, spacing } from '../src/theme';

export default function DiaryScreen() {
  const { data: diaries, isLoading, refetch, isRefetching } = useDiaries();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={110} />
          ))}
        </View>
      ) : (
        <FlatList
          data={diaries ?? []}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListHeaderComponent={
            (diaries?.length ?? 0) > 0 ? (
              <Text style={s.intro}>
                Anotações que seu psicólogo compartilhou com você sobre a evolução das suas sessões.
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title="Nenhuma anotação compartilhada"
              subtitle="Quando seu psicólogo compartilhar anotações de sessão, elas aparecem aqui."
            />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.dateChip}>
                  <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                  <Text style={s.dateText}>
                    {format(new Date(item.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Text>
                </View>
              </View>
              {item.relato ? <Text style={s.body}>{item.relato}</Text> : null}
              {item.tarefas ? (
                <View style={s.tasks}>
                  <Text style={s.tasksLabel}>✅ Tarefas sugeridas</Text>
                  <Text style={s.tasksText}>{item.tarefas}</Text>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  intro: { color: colors.muted, fontSize: font.small, marginBottom: spacing.sm, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardHeader: { flexDirection: 'row' },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  body: { color: colors.text, lineHeight: 22, fontSize: font.body },
  tasks: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md },
  tasksLabel: { fontWeight: '700', fontSize: font.small, color: colors.text, marginBottom: 4 },
  tasksText: { color: colors.muted, fontSize: font.small, lineHeight: 20 },
});
