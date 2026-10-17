import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAnotacoes, useHumoresPaciente, useNovaAnotacao, useSessoesPsi } from '../../../src/api/psi';
import { SessaoPsiCard } from '../../../src/SessaoPsiCard';
import { Avatar, Card, GradientButton, Input, SectionTitle, Skeleton } from '../../../src/ui';
import { getMood, localDateKey } from '../../../src/mood';
import { storageUrl } from '../../../src/format';
import { colors, font, radius, spacing } from '../../../src/theme';

/** "2026-10-16" (ou datetime) como dia local — new Date("YYYY-MM-DD") cai no dia anterior no Brasil. */
const diaLocal = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`);

export default function PsiPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pacienteId = Number(id);
  const { data: sessoes } = useSessoesPsi();
  const humores = useHumoresPaciente(pacienteId);
  const anotacoes = useAnotacoes(pacienteId);
  const nova = useNovaAnotacao();
  const [texto, setTexto] = useState('');
  const [compartilhar, setCompartilhar] = useState(false);
  const [verTodas, setVerTodas] = useState(false);

  const minhas = useMemo(
    () =>
      (sessoes ?? [])
        .filter((a) => a.paciente?.id === pacienteId && a.agenda)
        .sort((a, b) => Date.parse(b.agenda!.data_hora_inicio) - Date.parse(a.agenda!.data_hora_inicio)),
    [sessoes, pacienteId]
  );
  const paciente = minhas[0]?.paciente;
  const nome = paciente?.user?.name ?? 'Paciente';
  const realizadas = minhas.filter((a) => a.status === 'realizado' || (a.status === 'confirmado' && Date.parse(a.agenda!.data_hora_inicio) <= Date.now())).length;
  const faltas = minhas.filter((a) => a.status === 'faltou').length;

  const salvar = () =>
    nova.mutate(
      { paciente_id: pacienteId, relato: texto.trim(), data: localDateKey(new Date()), visivel_paciente: compartilhar },
      {
        onSuccess: () => {
          setTexto('');
          setCompartilhar(false);
        },
        onError: (e: any) => Alert.alert('Não foi possível salvar', e?.message ?? 'Tente novamente.'),
      }
    );

  const listaAnotacoes = anotacoes.data ?? [];
  const sessoesVisiveis = verTodas ? minhas : minhas.slice(0, 3);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={nome} size={80} uri={storageUrl(paciente?.foto_perfil)} />
        <Text style={s.nome}>{nome}</Text>
        <View style={s.stats}>
          <Stat valor={realizadas} label="realizadas" />
          <Stat valor={faltas} label={faltas === 1 ? 'falta' : 'faltas'} />
          <Stat valor={listaAnotacoes.length} label={listaAnotacoes.length === 1 ? 'anotação' : 'anotações'} />
        </View>
      </View>

      {/* Humor: o paciente registra no app/web; só quem atende vê (vínculo checado no back). */}
      <View>
        <SectionTitle title="Humor nos últimos 30 dias" />
        {humores.isLoading ? (
          <Skeleton height={90} />
        ) : (humores.data ?? []).length === 0 ? (
          <Card>
            <Text style={s.muted}>Nenhum registro de humor no período.</Text>
          </Card>
        ) : (
          <Card style={{ gap: spacing.md }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {[...humores.data!].reverse().map((h) => (
                <View key={h.id} style={s.humor}>
                  <Text style={{ fontSize: 22 }}>{getMood(h.humor)?.emoji ?? '·'}</Text>
                  <Text style={s.humorDia}>{format(diaLocal(h.data), 'dd/MM')}</Text>
                </View>
              ))}
            </ScrollView>
            {humores.data!.filter((h) => h.nota).slice(0, 3).map((h) => (
              <View key={h.id} style={s.nota}>
                <Text style={s.notaDia}>
                  {getMood(h.humor)?.emoji} {format(diaLocal(h.data), "dd 'de' MMM", { locale: ptBR })}
                </Text>
                <Text style={s.notaTexto} numberOfLines={4}>{h.nota}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle title="Anotações" />
        <Card style={{ gap: spacing.md }}>
          <Input
            placeholder="Escreva a anotação da sessão de hoje"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 110, paddingTop: spacing.md }}
            value={texto}
            onChangeText={setTexto}
          />
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Compartilhar com o paciente</Text>
              <Text style={s.muted}>{compartilhar ? 'Aparece em “Anotações do psicólogo” no app dele.' : 'Fica só para você.'}</Text>
            </View>
            <Switch value={compartilhar} onValueChange={setCompartilhar} trackColor={{ true: colors.primary }} />
          </View>
          <GradientButton title="Salvar anotação" onPress={salvar} loading={nova.isPending} disabled={!texto.trim()} />
        </Card>
        {listaAnotacoes.map((d) => (
          <Card key={d.id} style={{ gap: spacing.sm }}>
            <View style={s.anotHeader}>
              <Text style={s.notaDia}>{format(diaLocal(d.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</Text>
              {d.visivel_paciente && (
                <View style={s.tag}>
                  <Ionicons name="eye-outline" size={12} color={colors.primary} />
                  <Text style={s.tagText}>Compartilhada</Text>
                </View>
              )}
            </View>
            {d.relato ? <Text style={s.notaTexto}>{d.relato}</Text> : null}
            {d.tarefas ? <Text style={s.muted}>Tarefas: {d.tarefas}</Text> : null}
          </Card>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle
          title="Sessões"
          action={
            minhas.length > 3 ? (
              <Pressable onPress={() => setVerTodas(!verTodas)} hitSlop={8}>
                <Text style={s.link}>{verTodas ? 'Ver menos' : `Ver todas (${minhas.length})`}</Text>
              </Pressable>
            ) : undefined
          }
        />
        {sessoesVisiveis.map((a) => (
          <SessaoPsiCard key={a.id} sessao={a} />
        ))}
      </View>
    </ScrollView>
  );
}

const Stat = ({ valor, label }: { valor: number; label: string }) => (
  <View style={s.stat}>
    <Text style={s.statValor}>{valor}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 48 },
  nome: { fontSize: font.subtitle, fontWeight: '800', color: colors.text, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  stat: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minWidth: 92 },
  statValor: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.muted, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: font.small },
  humor: { alignItems: 'center', gap: 2, width: 44 },
  humorDia: { fontSize: font.tiny, color: colors.muted },
  nota: { gap: 2, borderLeftWidth: 3, borderLeftColor: colors.primarySoft, paddingLeft: spacing.md },
  notaDia: { fontSize: font.small, fontWeight: '700', color: colors.text },
  notaTexto: { color: colors.text, lineHeight: 21 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchLabel: { fontWeight: '700', color: colors.text },
  anotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small },
});
