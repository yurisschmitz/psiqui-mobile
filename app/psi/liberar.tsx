import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDays, addMinutes, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLiberarHorarios } from '../../src/api/psi';
import { Card, GradientButton } from '../../src/ui';
import { capitalizar } from '../../src/format';
import { colors, font, radius, spacing } from '../../src/theme';

const DURACAO_MIN = 50; // igual à web (AddTimeSlotDialog)
const DIAS = 21;

const meiaHora = (de: number, ate: number) =>
  Array.from({ length: (ate - de) * 2 }, (_, i) => {
    const m = de * 60 + i * 30;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  });

const PERIODOS = [
  { label: 'Manhã', horas: meiaHora(6, 12) },
  { label: 'Tarde', horas: meiaHora(12, 18) },
  { label: 'Noite', horas: meiaHora(18, 24) },
];

const REPETIR = [
  { semanas: 1, label: 'Só estas datas' },
  { semanas: 2, label: '2 semanas' },
  { semanas: 4, label: '4 semanas' },
];

export default function LiberarHorarios() {
  const router = useRouter();
  const liberar = useLiberarHorarios();
  const { bottom } = useSafeAreaInsets();
  const hoje = startOfDay(new Date());
  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => addDays(hoje, i)), [hoje.getTime()]);
  const [diasSel, setDiasSel] = useState<number[]>([]); // índices em `dias`
  const [horasSel, setHorasSel] = useState<string[]>([]);
  const [semanas, setSemanas] = useState(1);

  const toggle = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const slots = useMemo(() => {
    const agora = Date.now();
    const out: { data_hora_inicio: string; data_hora_fim: string }[] = [];
    for (let w = 0; w < semanas; w++) {
      for (const i of diasSel) {
        for (const h of horasSel) {
          const [hh, mm] = h.split(':').map(Number);
          const ini = addDays(dias[i], w * 7);
          ini.setHours(hh, mm, 0, 0);
          if (ini.getTime() <= agora) continue;
          out.push({ data_hora_inicio: ini.toISOString(), data_hora_fim: addMinutes(ini, DURACAO_MIN).toISOString() });
        }
      }
    }
    return out;
  }, [diasSel, horasSel, semanas, dias]);

  const enviar = () =>
    liberar.mutate(slots, {
      onSuccess: ({ criados, ignorados }) => {
        Alert.alert(
          criados > 0 ? 'Horários liberados' : 'Nada novo para liberar',
          (criados > 0 ? `${criados} ${criados === 1 ? 'horário já aparece' : 'horários já aparecem'} para os pacientes.` : '') +
            (ignorados > 0 ? `\n${ignorados} já existia${ignorados === 1 ? '' : 'm'} ou conflitava${ignorados === 1 ? '' : 'm'} com outro horário.` : '')
        );
        if (criados > 0) router.back();
      },
      onError: (e: any) => Alert.alert('Não foi possível liberar', e?.message ?? 'Tente novamente.'),
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, paddingBottom: 140 }}>
        <View style={{ gap: spacing.md }}>
          <Text style={s.step}>1. Escolha os dias</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing.xl }}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.xl }}
          >
            {dias.map((d, i) => {
              const ativo = diasSel.includes(i);
              return (
                <Pressable key={i} onPress={() => setDiasSel(toggle(diasSel, i))} style={[s.dia, ativo && s.ativo]}>
                  <Text style={[s.diaSemana, ativo && s.branco]}>{i === 0 ? 'Hoje' : capitalizar(format(d, 'EEE', { locale: ptBR }))}</Text>
                  <Text style={[s.diaNum, ativo && s.branco]}>{format(d, 'dd')}</Text>
                  <Text style={[s.diaSemana, ativo && s.branco]}>{format(d, 'MMM', { locale: ptBR })}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.step}>2. Escolha os horários de início</Text>
          {PERIODOS.map(({ label, horas }) => {
            const todos = horas.every((h) => horasSel.includes(h));
            return (
              <Card key={label} style={{ gap: spacing.md }}>
                <View style={s.periodoRow}>
                  <Text style={s.periodo}>{label}</Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => setHorasSel(todos ? horasSel.filter((h) => !horas.includes(h)) : [...new Set([...horasSel, ...horas])])}
                  >
                    <Text style={s.link}>{todos ? 'Limpar' : 'Marcar todos'}</Text>
                  </Pressable>
                </View>
                <View style={s.grade}>
                  {horas.map((h) => {
                    const ativo = horasSel.includes(h);
                    return (
                      <Pressable key={h} onPress={() => setHorasSel(toggle(horasSel, h))} style={[s.hora, ativo && s.ativo]}>
                        <Text style={[s.horaText, ativo && s.branco]}>{h}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={s.step}>3. Repetir toda semana?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {REPETIR.map((r) => (
              <Pressable key={r.semanas} onPress={() => setSemanas(r.semanas)} style={[s.rep, semanas === r.semanas && s.ativo]}>
                <Text style={[s.repText, semanas === r.semanas && s.branco]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: spacing.lg + bottom }]}>
        <Text style={s.resumo}>
          {slots.length === 0
            ? 'Escolha ao menos um dia e um horário.'
            : `${slots.length} ${slots.length === 1 ? 'horário' : 'horários'} de ${DURACAO_MIN} min, online`}
        </Text>
        <GradientButton title="Liberar horários" onPress={enviar} loading={liberar.isPending} disabled={slots.length === 0} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  step: { fontWeight: '800', color: colors.text, fontSize: font.body },
  dia: {
    width: 62,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  diaSemana: { fontSize: font.tiny, color: colors.muted, fontWeight: '600' },
  diaNum: { fontSize: 20, fontWeight: '800', color: colors.text },
  ativo: { backgroundColor: colors.primary, borderColor: colors.primary },
  branco: { color: '#fff' },
  periodoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  periodo: { fontWeight: '700', color: colors.text },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  hora: {
    width: '23.5%',
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  horaText: { fontWeight: '700', color: colors.text, fontSize: font.small },
  rep: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  repText: { fontWeight: '700', color: colors.text, fontSize: font.small },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resumo: { textAlign: 'center', color: colors.muted, fontSize: font.small, fontWeight: '600' },
});
