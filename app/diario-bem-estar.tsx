import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMoods, useSaveMood } from '../src/api/hooks';
import type { Humor, HumorTipo } from '../src/api/types';
import { EmptyState, GradientButton, Skeleton } from '../src/ui';
import { MOODS, getMood, localDateKey, moodToneColor } from '../src/mood';
import { colors, font, radius, shadow, spacing } from '../src/theme';

interface MonthGroup {
  key: string;
  label: string;
  entries: Humor[];
}

/** Agrupa as entradas por mês/ano, mais recentes primeiro. */
const groupByMonth = (entries: Humor[]): MonthGroup[] => {
  const sorted = [...entries].sort((a, b) => b.data.slice(0, 10).localeCompare(a.data.slice(0, 10)));
  const groups: MonthGroup[] = [];
  for (const entry of sorted) {
    const key = entry.data.slice(0, 7); // YYYY-MM
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        label: format(new Date(`${entry.data.slice(0, 10)}T00:00:00`), "MMMM 'de' yyyy", { locale: ptBR }),
        entries: [],
      };
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
};

export default function WellnessDiaryScreen() {
  const { data: moods, isLoading, refetch, isRefetching } = useMoods(90);
  const saveMood = useSaveMood();

  const todayKey = localDateKey(new Date());
  const todayEntry = moods?.find((m) => m.data?.slice(0, 10) === todayKey);

  const [mood, setMood] = useState<HumorTipo | null>(null); // nada marcado até o paciente escolher
  const [note, setNote] = useState('');

  // Pré-seleciona o humor já registrado hoje (se houver check-in).
  useEffect(() => {
    if (todayEntry?.humor) setMood(todayEntry.humor);
  }, [todayEntry?.humor]);

  const diaryEntries = useMemo(
    () => (moods ?? []).filter((m) => m.nota && m.nota.trim()),
    [moods]
  );
  const groups = useMemo(() => groupByMonth(diaryEntries), [diaryEntries]);

  const handleSave = () => {
    if (!note.trim() || !mood) return;
    saveMood.mutate(
      // O back guarda uma entrada por dia: soma ao texto de hoje em vez de apagá-lo.
      { humor: mood, nota: todayEntry?.nota ? `${todayEntry.nota.trim()}\n\n${note.trim()}` : note.trim() },
      { onSuccess: () => setNote('') }
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Composer */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Como foi o seu dia?</Text>
          <View style={s.privacy}>
            <Ionicons name="lock-closed" size={13} color={colors.primary} />
            <Text style={s.privacyText}>Seu psicólogo pode ver estes registros para acompanhar sua evolução.</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {MOODS.map(({ tipo, emoji }) => {
              const active = mood === tipo;
              return (
                <Pressable key={tipo} onPress={() => setMood(tipo)} style={[s.mood, active && s.moodActive]}>
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  <Text style={[s.moodLabel, active && { color: colors.primary, fontWeight: '700' }]}>{tipo}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={todayEntry?.nota ? 'Quer complementar a entrada de hoje?' : 'O que passou pela sua cabeça hoje?'}
            placeholderTextColor={colors.muted}
            style={s.input}
            multiline
            maxLength={todayEntry?.nota ? Math.max(0, 998 - todayEntry.nota.trim().length) : 1000}
            textAlignVertical="top"
          />

          {todayEntry?.nota ? (
            <Text style={s.hint}>O que você escrever agora será somado à entrada de hoje.</Text>
          ) : null}

          <GradientButton
            title={todayEntry?.nota ? 'Adicionar à entrada de hoje' : 'Registrar entrada'}
            icon="sparkles"
            onPress={handleSave}
            loading={saveMood.isPending}
            disabled={!note.trim() || !mood}
          />
        </View>

        {/* Histórico */}
        <View style={{ gap: spacing.md }}>
          <Text style={s.historyTitle}>
            Histórico{diaryEntries.length > 0 ? ` (${diaryEntries.length})` : ''}
          </Text>

          {isLoading ? (
            <View style={{ gap: spacing.md }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={90} />
              ))}
            </View>
          ) : diaryEntries.length > 0 ? (
            groups.map((group) => (
              <View key={group.key} style={{ gap: spacing.sm }}>
                <Text style={s.monthLabel}>{group.label}</Text>
                {group.entries.map((entry) => {
                  const m = getMood(entry.humor);
                  const accent = m ? moodToneColor(m.tone) : colors.border;
                  return (
                    <View key={entry.id} style={[s.entry, { borderLeftColor: accent }]}>
                      <View style={s.entryHead}>
                        <Text style={s.entryDate}>
                          {format(new Date(`${entry.data.slice(0, 10)}T00:00:00`), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </Text>
                        {m ? (
                          <Text style={s.entryMood}>
                            {m.emoji} {m.tipo}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={s.entryBody}>{entry.nota}</Text>
                    </View>
                  );
                })}
              </View>
            ))
          ) : (
            <EmptyState
              icon="book-outline"
              title="Seu diário está vazio"
              subtitle="Escreva sua primeira entrada acima. Registrar como você se sente ajuda no acompanhamento da sua evolução."
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  cardTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  privacyText: { flex: 1, color: colors.muted, fontSize: font.tiny, lineHeight: 16 },
  mood: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 2,
    minWidth: 72,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  moodActive: { backgroundColor: colors.card, borderColor: colors.primary },
  moodLabel: { fontSize: font.tiny, color: colors.muted, fontWeight: '600' },
  input: {
    minHeight: 96,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: font.body,
    color: colors.text,
    lineHeight: 22,
  },
  hint: { color: colors.muted, fontSize: font.tiny },
  historyTitle: { fontSize: font.subtitle, fontWeight: '700', color: colors.text },
  monthLabel: {
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  entry: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    padding: spacing.md,
    gap: 6,
    ...shadow.card,
  },
  entryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  entryDate: { color: colors.muted, fontSize: font.tiny, fontWeight: '700' },
  entryMood: { fontSize: font.small },
  entryBody: { color: colors.text, fontSize: font.body, lineHeight: 22 },
});
