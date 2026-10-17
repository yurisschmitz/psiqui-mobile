import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSessoesPsi } from '../../../src/api/psi';
import type { Agendamento } from '../../../src/api/types';
import { Avatar, EmptyState, Input, Skeleton, useTopPad } from '../../../src/ui';
import { storageUrl } from '../../../src/format';
import { colors, font, radius, spacing } from '../../../src/theme';

interface PacienteResumo {
  id: number;
  nome: string;
  foto?: string | null;
  realizadas: number;
  proxima?: number;
  ultima?: number;
}

/** O back não tem lista de pacientes: deriva das sessões, como a web (use-patients). */
function resumirPacientes(sessoes: Agendamento[]): PacienteResumo[] {
  const agora = Date.now();
  const mapa = new Map<number, PacienteResumo>();
  for (const a of sessoes) {
    if (!a.paciente || !a.agenda) continue;
    const p = mapa.get(a.paciente.id) ?? { id: a.paciente.id, nome: a.paciente.user?.name ?? 'Paciente', foto: a.paciente.foto_perfil, realizadas: 0 };
    const ini = Date.parse(a.agenda.data_hora_inicio);
    if (ini <= agora && (a.status === 'confirmado' || a.status === 'realizado')) {
      p.realizadas++;
      p.ultima = Math.max(p.ultima ?? 0, ini);
    }
    if (ini > agora && (a.status === 'confirmado' || a.status === 'pendente')) p.proxima = Math.min(p.proxima ?? Infinity, ini);
    mapa.set(p.id, p);
  }
  // Quem tem próxima sessão primeiro (mais perto no topo), depois por última sessão.
  return [...mapa.values()].sort((a, b) => (a.proxima ?? Infinity) - (b.proxima ?? Infinity) || (b.ultima ?? 0) - (a.ultima ?? 0));
}

export default function PsiPacientes() {
  const topPad = useTopPad();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useSessoesPsi();
  const [busca, setBusca] = useState('');

  const pacientes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return resumirPacientes(data ?? []).filter((p) => !termo || p.nome.toLowerCase().includes(termo));
  }, [data, busca]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, paddingTop: topPad, gap: spacing.lg, paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Pacientes</Text>
      <Input icon="search" placeholder="Buscar pelo nome" value={busca} onChangeText={setBusca} autoCorrect={false} />

      {isLoading ? (
        [0, 1, 2, 3].map((i) => <Skeleton key={i} height={72} />)
      ) : pacientes.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={busca ? 'Ninguém com esse nome' : 'Nenhum paciente ainda'}
          subtitle={busca ? undefined : 'Quem agendar uma sessão com você aparece aqui.'}
        />
      ) : (
        <View style={s.list}>
          {pacientes.map((p, i) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/psi/paciente/[id]', params: { id: String(p.id) } })}
              style={({ pressed }) => [s.item, i > 0 && s.divider, pressed && { backgroundColor: colors.bg }]}
            >
              <Avatar name={p.nome} size={46} uri={storageUrl(p.foto)} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.nome} numberOfLines={1}>{p.nome}</Text>
                <Text style={s.sub}>
                  {p.realizadas} {p.realizadas === 1 ? 'sessão realizada' : 'sessões realizadas'}
                  {p.proxima ? ` · próxima ${format(p.proxima, 'dd/MM HH:mm')}` : p.ultima ? ` · última ${format(p.ultima, 'dd/MM')}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  list: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  nome: { fontWeight: '700', color: colors.text, fontSize: font.body },
  sub: { color: colors.muted, fontSize: font.small },
});
