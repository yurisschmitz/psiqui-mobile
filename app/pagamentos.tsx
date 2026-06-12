import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePayments } from '../src/api/hooks';
import { Badge, EmptyState, Skeleton } from '../src/ui';
import { colors, font, radius, shadow, spacing } from '../src/theme';

const statusTone = { pago: 'success', pendente: 'warning', cancelado: 'danger' } as const;
const statusLabel = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' } as const;

export default function PaymentsScreen() {
  const { data: payments, isLoading, refetch, isRefetching } = usePayments();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={80} />
          ))}
        </View>
      ) : (
        <FlatList
          data={payments ?? []}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState icon="card-outline" title="Nenhum pagamento" subtitle="Seu histórico de pagamentos aparece aqui." />
          }
          renderItem={({ item }) => {
            const psicologo =
              item.agendamento?.agenda && (item.agendamento as any)?.agenda?.psicologo?.user?.name;
            const tone = statusTone[item.status] ?? 'muted';
            return (
              <View style={s.card}>
                <View style={s.icon}>
                  <Ionicons
                    name={item.tipo === 'pix' ? 'qr-code-outline' : 'card-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.title}>Sessão de terapia{psicologo ? ` · ${psicologo}` : ''}</Text>
                  <Text style={s.meta}>
                    {format(new Date(item.data_pagamento ?? item.created_at), 'dd/MM/yyyy', { locale: ptBR })} ·{' '}
                    {item.tipo === 'pix' ? 'PIX' : 'Cartão'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.value}>R$ {Number(item.valor).toFixed(2).replace('.', ',')}</Text>
                  <Badge label={statusLabel[item.status] ?? item.status} tone={tone} />
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '700', color: colors.text, fontSize: font.small },
  meta: { color: colors.muted, fontSize: font.tiny },
  value: { fontWeight: '800', color: colors.text, fontSize: font.body },
});
