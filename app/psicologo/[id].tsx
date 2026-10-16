import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAvailableSlots, usePsychologist } from '../../src/api/hooks';
import type { Agenda } from '../../src/api/types';
import { Avatar, Card, GradientButton, Loading, SectionTitle } from '../../src/ui';
import { colors, font, radius, spacing } from '../../src/theme';
import { capitalizar, formatCRP, storageUrl } from '../../src/format';

/** Agrupa horários por dia LOCAL do dispositivo (fuso do paciente). */
function groupByLocalDay(slots: Agenda[]) {
  const map = new Map<string, { label: string; slots: Agenda[] }>();
  for (const slot of slots) {
    const d = new Date(slot.data_hora_inicio);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) {
      map.set(key, { label: capitalizar(format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })), slots: [] });
    }
    map.get(key)!.slots.push(slot);
  }
  return Array.from(map.values());
}

export default function PsychologistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const psicologoId = Number(id);

  const { data: p, isLoading } = usePsychologist(psicologoId);
  const { data: slots, isLoading: loadingSlots } = useAvailableSlots(psicologoId);
  const [selected, setSelected] = useState<Agenda | null>(null);

  const days = useMemo(() => groupByLocalDay(slots ?? []), [slots]);

  if (isLoading || !p) return <Loading />;

  // Mesmo padrão do back (VALOR_SESSAO_PADRAO) quando o psicólogo não definiu preço.
  const price = p.perfil?.valor_sessao ?? 70;
  const duration = p.perfil?.duracao_sessao ?? 50;
  const rating = p.nota_media ? Number(p.nota_media).toFixed(1) : null;
  const reviews = p.avaliacoes?.filter((a) => a.comentario) ?? [];

  const handleSchedule = () => {
    if (!selected) return;
    router.push({
      pathname: '/pagamento',
      params: {
        agendaId: String(selected.id),
        nome: p.user.name,
        valor: String(selected.valor ?? price ?? ''),
        quando: `${format(new Date(selected.data_hora_inicio), "dd/MM 'às' HH:mm")}`,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 120 }}>
        {/* Cabeçalho do perfil */}
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Avatar name={p.user.name} size={64} uri={storageUrl(p.perfil?.foto_perfil)} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{p.user.name}</Text>
              <Text style={s.crp}>{p.crp ? `CRP ${formatCRP(p.crp)}` : 'Psicólogo(a)'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {(p.especialidades ?? []).slice(0, 3).map((e) => (
                  <View key={e.id} style={s.tag}>
                    <Text style={s.tagText}>{e.nome}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statValue}>{rating ?? '—'}</Text>
              <Text style={s.statLabel}>Avaliação</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{duration} min</Text>
              <Text style={s.statLabel}>Sessão</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={[s.statValue, { color: colors.primary }]}>
                {price ? `R$ ${Number(price).toFixed(0)}` : '—'}
              </Text>
              <Text style={s.statLabel}>Valor</Text>
            </View>
          </View>
        </Card>

        {/* Sobre */}
        {(p.perfil?.sobre || p.bio) && (
          <View>
            <SectionTitle title="Sobre" />
            <Card>
              <Text style={s.about}>{p.perfil?.sobre ?? p.bio}</Text>
              {p.perfil?.formacao ? <Text style={[s.about, { marginTop: spacing.sm, color: colors.muted }]}>🎓 {p.perfil.formacao}</Text> : null}
            </Card>
          </View>
        )}

        {/* Horários */}
        <View>
          <SectionTitle title="Horários disponíveis" />
          <Text style={s.timezoneNote}>Horários exibidos no seu fuso horário.</Text>
          {loadingSlots ? (
            <Loading />
          ) : days.length === 0 ? (
            <Card style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Text style={{ color: colors.muted }}>Nenhum horário disponível no momento.</Text>
            </Card>
          ) : (
            <View style={{ gap: spacing.lg }}>
              {days.map(({ label, slots: daySlots }) => (
                <View key={label}>
                  <Text style={s.dayLabel}>{label}</Text>
                  <View style={s.slotGrid}>
                    {daySlots.map((slot) => {
                      const active = selected?.id === slot.id;
                      return (
                        <Pressable
                          key={slot.id}
                          onPress={() => setSelected(active ? null : slot)}
                          style={[s.slot, active && s.slotActive]}
                        >
                          <Text style={[s.slotText, active && s.slotTextActive]}>
                            {format(new Date(slot.data_hora_inicio), 'HH:mm')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Avaliações */}
        {reviews.length > 0 && (
          <View>
            <SectionTitle title="O que dizem os pacientes" />
            <View style={{ gap: spacing.md }}>
              {reviews.slice(0, 3).map((r) => (
                <Card key={r.id}>
                  <View style={{ flexDirection: 'row', gap: 2, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons key={n} name={n <= r.nota ? 'star' : 'star-outline'} size={14} color="#F59E0B" />
                    ))}
                  </View>
                  <Text style={s.review}>"{r.comentario}"</Text>
                  <Text style={s.reviewer}>— {r.paciente?.user?.name ?? 'Paciente'}</Text>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Barra fixa de agendamento */}
      {selected && (
        <View style={s.bottomBar}>
          <View style={{ flex: 1 }}>
            <Text style={s.bottomWhen}>
              {format(new Date(selected.data_hora_inicio), "dd/MM 'às' HH:mm")}
            </Text>
            <Text style={s.bottomPrice}>
              {`R$ ${Number(selected.valor ?? price).toFixed(2).replace('.', ',')}`}
            </Text>
          </View>
          <GradientButton title="Agendar" onPress={handleSchedule} icon="arrow-forward" style={{ minWidth: 150 }} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  name: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  crp: { color: colors.muted, fontSize: font.small, marginTop: 2 },
  tag: { backgroundColor: colors.primarySoft, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: colors.primary, fontSize: font.tiny, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border },
  statValue: { fontSize: font.body, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.muted, marginTop: 2 },
  about: { color: colors.text, lineHeight: 22, fontSize: font.body },
  timezoneNote: { color: colors.muted, fontSize: font.tiny, marginTop: -6, marginBottom: spacing.md },
  dayLabel: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { fontWeight: '700', color: colors.text },
  slotTextActive: { color: '#fff' },
  review: { color: colors.text, fontStyle: 'italic', lineHeight: 20 },
  reviewer: { color: colors.muted, fontSize: font.small, marginTop: 6 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.lg,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomWhen: { fontWeight: '700', color: colors.text },
  bottomPrice: { color: colors.primary, fontWeight: '800', fontSize: font.subtitle },
});
