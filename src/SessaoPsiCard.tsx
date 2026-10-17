import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMudarStatusSessao } from './api/psi';
import type { Agendamento, StatusAgendamento } from './api/types';
import { Avatar, Badge, Card } from './ui';
import { capitalizar, storageUrl } from './format';
import { colors, font, radius, spacing } from './theme';

const DEZ_MIN = 10 * 60 * 1000;

export const tituloDia = (d: Date, fmt = "EEEE, dd 'de' MMMM") =>
  isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : capitalizar(format(d, fmt, { locale: ptBR }));

/** Momento da sessão do ponto de vista do psicólogo (mesmas regras da web e do back). */
export function faseSessao(a: Agendamento, agora = Date.now()) {
  const ini = new Date(a.agenda?.data_hora_inicio ?? 0).getTime();
  const fim = new Date(a.agenda?.data_hora_fim ?? 0).getTime();
  const confirmada = a.status === 'confirmado';
  return {
    ini,
    fim,
    podeEntrar: confirmada && agora >= ini - DEZ_MIN && agora < fim,
    // Back só aceita realizada/falta depois do início e sobre sessão paga.
    precisaRegistro: confirmada && agora >= ini,
    podeCancelar: (a.status === 'pendente' || confirmada) && agora < ini,
  };
}

const BADGE: Record<StatusAgendamento, { label: string; tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  pendente: { label: 'Aguardando pagamento', tone: 'warning' },
  confirmado: { label: 'Confirmada', tone: 'primary' },
  realizado: { label: 'Realizada', tone: 'success' },
  faltou: { label: 'Paciente faltou', tone: 'danger' },
  cancelado: { label: 'Cancelada', tone: 'muted' },
};

export const SessaoPsiCard: React.FC<{ sessao: Agendamento; mostrarData?: boolean }> = ({ sessao, mostrarData = true }) => {
  const router = useRouter();
  const mudar = useMudarStatusSessao();
  const f = faseSessao(sessao);
  const nome = sessao.paciente?.user?.name ?? 'Paciente';
  const inicio = new Date(f.ini);

  const aplicar = (status: StatusAgendamento, titulo: string, msg: string) =>
    Alert.alert(titulo, msg, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        style: status === 'cancelado' ? 'destructive' : 'default',
        onPress: () =>
          mudar.mutate(
            { id: sessao.id, status },
            { onError: (e: any) => Alert.alert('Não foi possível atualizar', e?.message ?? 'Tente novamente.') }
          ),
      },
    ]);

  const badge =
    f.precisaRegistro && !f.podeEntrar ? { label: 'Registre o atendimento', tone: 'warning' as const } : BADGE[sessao.status];

  return (
    <Card style={{ gap: spacing.md }}>
      <Pressable
        onPress={() => sessao.paciente && router.push({ pathname: '/psi/paciente/[id]', params: { id: String(sessao.paciente.id) } })}
        style={s.row}
      >
        <Avatar name={nome} size={46} uri={storageUrl(sessao.paciente?.foto_perfil)} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.nome} numberOfLines={1}>{nome}</Text>
          <Text style={s.sub}>
            {mostrarData ? `${tituloDia(inicio, "EEE, dd 'de' MMM")} · ` : ''}
            {format(inicio, 'HH:mm')}–{format(new Date(f.fim), 'HH:mm')}
          </Text>
          <View style={{ marginTop: 4 }}>
            <Badge label={badge.label} tone={badge.tone} />
          </View>
        </View>
      </Pressable>

      {(f.podeEntrar || f.precisaRegistro || f.podeCancelar) && (
        <View style={s.actions}>
          {f.podeEntrar && (
            <Pressable
              style={[s.btn, s.btnPrimary]}
              onPress={() => router.push({ pathname: '/sessao/[id]', params: { id: String(sessao.id), nome } })}
            >
              <Ionicons name="videocam" size={16} color="#fff" />
              <Text style={[s.btnText, { color: '#fff' }]}>Entrar na sala</Text>
            </Pressable>
          )}
          {f.precisaRegistro && (
            <>
              <Pressable
                style={s.btn}
                disabled={mudar.isPending}
                onPress={() => aplicar('realizado', 'Sessão realizada?', `Confirma que a sessão com ${nome} aconteceu?`)}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                <Text style={[s.btnText, { color: colors.success }]}>Realizada</Text>
              </Pressable>
              <Pressable
                style={s.btn}
                disabled={mudar.isPending}
                onPress={() => aplicar('faltou', 'Paciente faltou?', 'A sessão fica registrada como falta, sem estorno.')}
              >
                <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
                <Text style={[s.btnText, { color: colors.danger }]}>Faltou</Text>
              </Pressable>
            </>
          )}
          {f.podeCancelar && (
            <Pressable
              style={s.btn}
              disabled={mudar.isPending}
              onPress={() =>
                aplicar(
                  'cancelado',
                  'Cancelar sessão?',
                  sessao.status === 'confirmado'
                    ? `${nome} recebe o valor de volta integralmente e é avisado(a) por e-mail.`
                    : `O horário com ${nome} é cancelado.`
                )
              }
            >
              <Text style={[s.btnText, { color: colors.muted }]}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      )}
    </Card>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nome: { fontWeight: '700', fontSize: font.body, color: colors.text },
  sub: { color: colors.muted, fontSize: font.small },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { fontWeight: '700', fontSize: font.small },
});
