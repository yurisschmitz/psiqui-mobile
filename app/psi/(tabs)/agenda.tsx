import React, { useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useHorariosPsi, useRemoverHorario, useSessoesPsi } from '../../../src/api/psi';
import { SessaoPsiCard, faseSessao, tituloDia } from '../../../src/SessaoPsiCard';
import { EmptyState, GradientButton, Skeleton, useTopPad } from '../../../src/ui';
import { localDateKey } from '../../../src/mood';
import { colors, font, radius, spacing } from '../../../src/theme';

type Aba = 'proximas' | 'registrar' | 'historico' | 'horarios';
const ABAS: { key: Aba; label: string }[] = [
  { key: 'proximas', label: 'Próximas' },
  { key: 'registrar', label: 'A registrar' },
  { key: 'historico', label: 'Histórico' },
  { key: 'horarios', label: 'Horários livres' },
];


/** Agrupa por dia local mantendo a ordem recebida. */
function porDia<T>(itens: T[], data: (t: T) => string) {
  const grupos: { key: string; dia: Date; itens: T[] }[] = [];
  for (const it of itens) {
    const d = new Date(data(it));
    const key = localDateKey(d);
    const g = grupos[grupos.length - 1];
    if (g?.key === key) g.itens.push(it);
    else grupos.push({ key, dia: d, itens: [it] });
  }
  return grupos;
}

export default function PsiAgenda() {
  const topPad = useTopPad();
  const router = useRouter();
  const [aba, setAba] = useState<Aba>('proximas');
  const sessoes = useSessoesPsi();
  const horarios = useHorariosPsi();
  const remover = useRemoverHorario();

  const listas = useMemo(() => {
    const agora = Date.now();
    const todas = (sessoes.data ?? [])
      .filter((a) => a.agenda)
      .sort((a, b) => Date.parse(a.agenda!.data_hora_inicio) - Date.parse(b.agenda!.data_hora_inicio));
    const registrar = todas.filter((a) => {
      const f = faseSessao(a, agora);
      return f.precisaRegistro && !f.podeEntrar;
    });
    return {
      proximas: todas.filter((a) => ['pendente', 'confirmado'].includes(a.status) && Date.parse(a.agenda!.data_hora_fim) > agora),
      registrar,
      historico: todas
        .filter((a) => Date.parse(a.agenda!.data_hora_fim) <= agora || a.status === 'cancelado')
        .filter((a) => !registrar.includes(a))
        .reverse(),
      horarios: (horarios.data ?? [])
        .filter((h) => h.disponivel && Date.parse(h.data_hora_inicio) > agora)
        .sort((a, b) => Date.parse(a.data_hora_inicio) - Date.parse(b.data_hora_inicio)),
    };
  }, [sessoes.data, horarios.data]);

  const confirmarRemocao = (id: number, quando: Date) =>
    Alert.alert('Remover horário?', `${tituloDia(quando)} às ${format(quando, 'HH:mm')} deixa de aparecer para os pacientes.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => remover.mutate(id, { onError: (e: any) => Alert.alert('Não foi possível remover', e?.message ?? 'Tente novamente.') }),
      },
    ]);

  const carregando = aba === 'horarios' ? horarios.isLoading : sessoes.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.top, { paddingTop: topPad }]}>
        <View style={s.titleRow}>
          <Text style={s.title}>Agenda</Text>
          <Pressable onPress={() => router.push('/psi/liberar')} style={s.addBtn} hitSlop={8}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addText}>Liberar</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -spacing.xl }}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
        >
          {ABAS.map(({ key, label }) => {
            const n = key === 'registrar' ? listas.registrar.length : 0;
            const ativo = aba === key;
            return (
              <Pressable key={key} onPress={() => setAba(key)} style={[s.chip, ativo && s.chipAtivo]}>
                <Text style={[s.chipText, ativo && { color: '#fff' }]}>{label}</Text>
                {n > 0 && (
                  <View style={[s.count, ativo && { backgroundColor: '#fff' }]}>
                    <Text style={[s.countText, ativo && { color: colors.primary }]}>{n}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={sessoes.isRefetching || horarios.isRefetching}
            onRefresh={() => {
              sessoes.refetch();
              horarios.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {carregando ? (
          [0, 1, 2].map((i) => <Skeleton key={i} height={110} />)
        ) : aba === 'horarios' ? (
          listas.horarios.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="Nenhum horário livre"
              subtitle="Libere horários para que os pacientes possam agendar com você."
              action={{ title: 'Liberar horários', onPress: () => router.push('/psi/liberar') }}
            />
          ) : (
            porDia(listas.horarios, (h) => h.data_hora_inicio).map((g) => (
              <View key={g.key} style={{ gap: spacing.sm }}>
                <Text style={s.dia}>{tituloDia(g.dia)}</Text>
                <View style={s.slots}>
                  {g.itens.map((h) => {
                    const ini = new Date(h.data_hora_inicio);
                    return (
                      <Pressable key={h.id} onPress={() => confirmarRemocao(h.id, ini)} style={s.slot}>
                        <Text style={s.slotText}>{format(ini, 'HH:mm')}</Text>
                        <Ionicons name="close" size={14} color={colors.muted} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )
        ) : listas[aba].length === 0 ? (
          <EmptyState
            icon={aba === 'registrar' ? 'checkmark-done-outline' : 'calendar-outline'}
            title={aba === 'proximas' ? 'Nenhuma sessão marcada' : aba === 'registrar' ? 'Tudo registrado' : 'Sem histórico ainda'}
            subtitle={
              aba === 'proximas'
                ? 'As sessões aparecem aqui quando um paciente agenda num horário seu.'
                : aba === 'registrar'
                  ? 'Sessões passadas que precisam ser marcadas como realizada ou falta aparecem aqui.'
                  : undefined
            }
          />
        ) : (
          porDia(listas[aba], (a) => a.agenda!.data_hora_inicio).map((g) => (
            <View key={g.key} style={{ gap: spacing.md }}>
              <Text style={s.dia}>{tituloDia(g.dia)}</Text>
              {g.itens.map((a) => (
                <SessaoPsiCard key={a.id} sessao={a} mostrarData={false} />
              ))}
            </View>
          ))
        )}
        {aba === 'horarios' && listas.horarios.length > 0 && (
          <Text style={s.hint}>Toque num horário para removê-lo. Horários já agendados ficam em “Próximas”.</Text>
        )}
        {aba === 'proximas' && listas.proximas.length > 0 && (
          <GradientButton title="Liberar mais horários" icon="add" onPress={() => router.push('/psi/liberar')} />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  addText: { color: '#fff', fontWeight: '700', fontSize: font.small },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '700', color: colors.text, fontSize: font.small },
  count: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dia: { fontWeight: '800', color: colors.text, fontSize: font.body },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotText: { fontWeight: '700', color: colors.text },
  hint: { color: colors.muted, fontSize: font.small, textAlign: 'center' },
});
