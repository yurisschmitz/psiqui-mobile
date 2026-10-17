import React, { useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { centavos, useDadosPagamento, useRecebimentos, useSaldo, useSaques, useSolicitarSaque } from '../../../src/api/psi';
import type { Pagamento } from '../../../src/api/types';
import { Badge, Card, SectionTitle, Skeleton, useTopPad } from '../../../src/ui';
import { brandGradient, colors, font, radius, shadow, spacing } from '../../../src/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://psiqui.com.br';

const STATUS_SAQUE = {
  pendente: { label: 'Solicitado', tone: 'warning' },
  processando: { label: 'Enviando', tone: 'primary' },
  concluido: { label: 'Pago', tone: 'success' },
  falhou: { label: 'Falhou', tone: 'danger' },
} as const;

/** Mostra só o fim da chave: o celular pode estar na mão de outra pessoa. */
const mascarar = (chave: string) => (chave.length <= 4 ? chave : `•••• ${chave.slice(-4)}`);

export default function PsiFinanceiro() {
  const topPad = useTopPad();
  const saldo = useSaldo();
  const dados = useDadosPagamento();
  const recebimentos = useRecebimentos();
  const saques = useSaques();
  const sacar = useSolicitarSaque();
  const [verMais, setVerMais] = useState(false);

  const disponivel = saldo.data?.saldo_disponivel_centavos ?? 0;
  const chave = dados.data?.dados?.chave_pix;
  const motivoBloqueio = !chave
    ? 'Cadastre seus dados de recebimento pelo site para sacar.'
    : saldo.data && !saldo.data.pode_sacar_essa_semana
      ? 'Você já sacou esta semana. O próximo libera na semana que vem.'
      : disponivel <= 0
        ? 'O valor de cada sessão libera para saque quando ela termina.'
        : null;

  const confirmarSaque = () =>
    Alert.alert('Sacar via PIX?', `${centavos(disponivel)} vão para a chave ${mascarar(chave ?? '')}. É possível 1 saque por semana.`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Sacar',
        onPress: () =>
          sacar.mutate(undefined, {
            onSuccess: () => Alert.alert('Saque solicitado', 'O PIX cai na sua chave em instantes.'),
            onError: (e: any) => Alert.alert('Não foi possível sacar', e?.message ?? 'Tente novamente.'),
          }),
      },
    ]);

  const quando = (p: Pagamento) => p.agendamento?.agenda?.data_hora_inicio ?? p.data_pagamento ?? p.created_at;
  const pagos = (recebimentos.data ?? [])
    .filter((p) => p.status === 'pago' || p.status === 'estornado')
    .sort((a, b) => Date.parse(quando(b)) - Date.parse(quando(a)));
  const listaRecebimentos = verMais ? pagos : pagos.slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: topPad, gap: spacing.xl, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={saldo.isRefetching}
          onRefresh={() => [saldo, dados, recebimentos, saques].forEach((q) => q.refetch())}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={s.title}>Financeiro</Text>

      {saldo.isLoading ? (
        <Skeleton height={190} />
      ) : (
        <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, shadow.brand]}>
          <Text style={s.heroLabel}>Disponível para saque</Text>
          <Text style={s.heroValor}>{centavos(disponivel)}</Text>
          <Text style={s.heroSub}>A liberar: {centavos(saldo.data?.a_liberar_centavos)} em sessões pagas que ainda vão acontecer</Text>
          <Pressable
            onPress={confirmarSaque}
            disabled={!!motivoBloqueio || sacar.isPending}
            style={({ pressed }) => [s.sacar, (motivoBloqueio || pressed) && { opacity: 0.55 }]}
          >
            <Ionicons name="flash" size={16} color={colors.primary} />
            <Text style={s.sacarText}>{sacar.isPending ? 'Solicitando…' : 'Sacar via PIX'}</Text>
          </Pressable>
          {motivoBloqueio && <Text style={s.heroHint}>{motivoBloqueio}</Text>}
        </LinearGradient>
      )}

      <Pressable onPress={() => Linking.openURL(`${WEB_URL}/psychologist-dashboard`)}>
        <Card style={s.row}>
          <View style={s.icon}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>{chave ? `Chave PIX ${mascarar(chave)}` : 'Dados de recebimento'}</Text>
            <Text style={s.muted}>{chave ? 'Para alterar, use o site (Financeiro).' : 'Ainda não cadastrados. Toque para abrir o site.'}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.muted} />
        </Card>
      </Pressable>

      <View>
        <SectionTitle
          title="Recebimentos"
          action={
            pagos.length > 5 ? (
              <Pressable onPress={() => setVerMais(!verMais)} hitSlop={8}>
                <Text style={s.link}>{verMais ? 'Ver menos' : `Ver todos (${pagos.length})`}</Text>
              </Pressable>
            ) : undefined
          }
        />
        {recebimentos.isLoading ? (
          <Skeleton height={140} />
        ) : pagos.length === 0 ? (
          <Card>
            <Text style={s.muted}>Os pagamentos das suas sessões aparecem aqui.</Text>
          </Card>
        ) : (
          <View style={s.list}>
            {listaRecebimentos.map((p, i) => {
              const valor = p.valor_psicologo_centavos != null ? centavos(p.valor_psicologo_centavos) : centavos(Number(p.valor) * 100);
              return (
                <View key={p.id} style={[s.item, i > 0 && s.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{p.agendamento?.paciente?.user?.name ?? 'Paciente'}</Text>
                    <Text style={s.muted}>Sessão de {format(new Date(quando(p)), 'dd/MM/yyyy')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={[s.valor, p.status === 'estornado' && s.riscado]}>{valor}</Text>
                    {p.status === 'estornado' && <Badge label="Estornado" tone="muted" />}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {(saques.data?.data ?? []).length > 0 && (
        <View>
          <SectionTitle title="Saques" />
          <View style={s.list}>
            {saques.data!.data.map((q, i) => (
              <View key={q.id} style={[s.item, i > 0 && s.divider]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.rowTitle}>{centavos(q.valor_centavos)}</Text>
                  <Text style={s.muted}>{format(new Date(q.created_at), "dd/MM/yyyy 'às' HH:mm")}</Text>
                  {q.status === 'falhou' && q.motivo_falha ? <Text style={[s.muted, { color: colors.danger }]}>{q.motivo_falha}</Text> : null}
                </View>
                <Badge label={STATUS_SAQUE[q.status].label} tone={STATUS_SAQUE[q.status].tone} />
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  hero: { borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: font.small },
  heroValor: { color: '#fff', fontSize: 34, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.small },
  heroHint: { color: '#fff', fontSize: font.small, textAlign: 'center', opacity: 0.9 },
  sacar: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  sacarText: { color: colors.primary, fontWeight: '800', fontSize: font.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: '700', color: colors.text },
  muted: { color: colors.muted, fontSize: font.small },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  list: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  valor: { fontWeight: '800', color: colors.success },
  riscado: { color: colors.muted, textDecorationLine: 'line-through' },
});
