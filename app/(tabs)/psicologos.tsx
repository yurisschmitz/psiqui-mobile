import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePsychologists } from '../../src/api/hooks';
import type { Psicologo } from '../../src/api/types';
import { Avatar, Badge, EmptyState, Input, Skeleton } from '../../src/ui';
import { colors, font, radius, shadow, spacing } from '../../src/theme';
import { formatBRL, formatCRP, storageUrl } from '../../src/format';

function PsychologistCard({ p, onPress }: { p: Psicologo; onPress: () => void }) {
  const price = p.perfil?.valor_sessao;
  const specialty = p.especialidades?.[0]?.nome ?? 'Psicologia';
  const rating = p.nota_media ? Number(p.nota_media).toFixed(1) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      <Avatar name={p.user.name} size={52} uri={storageUrl(p.perfil?.foto_perfil)} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name}>{p.user.name}</Text>
        <Text style={s.specialty} numberOfLines={1}>
          {specialty}
          {p.crp ? ` · CRP ${formatCRP(p.crp)}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {rating ? (
            <View style={s.rating}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={s.ratingText}>{rating}</Text>
            </View>
          ) : (
            <Badge label="Novo" tone="primary" />
          )}
          <Text style={s.price}>{formatBRL(price)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

export default function PsychologistsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = usePsychologists(search);

  const list = data?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={s.header}>
        <Text style={s.title}>Encontre seu psicólogo</Text>
        <Input
          icon="search-outline"
          placeholder="Buscar por nome..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.xl, gap: spacing.md }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={88} />
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
              icon="people-outline"
              title="Nenhum psicólogo encontrado"
              subtitle={search ? `Sem resultados para "${search}".` : 'Volte em breve — novos profissionais chegam toda semana.'}
            />
          }
          renderItem={({ item }) => (
            <PsychologistCard p={item} onPress={() => router.push({ pathname: '/psicologo/[id]', params: { id: String(item.id) } })} />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 64, padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  name: { fontWeight: '700', color: colors.text, fontSize: font.body },
  specialty: { color: colors.muted, fontSize: font.small },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  ratingText: { fontSize: font.tiny, fontWeight: '700', color: '#B45309' },
  price: { fontSize: font.small, fontWeight: '800', color: colors.primary },
});
