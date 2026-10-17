import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSendSupport } from '../src/api/hooks';
import { isPsicologo, useAuth } from '../src/context/auth';
import { Card, GradientButton, Input } from '../src/ui';
import { colors, font, radius, spacing } from '../src/theme';

// Mesmas respostas da web, com os nomes das telas do app.
const FAQ = [
  {
    p: 'Como agendar uma sessão?',
    r: 'Na aba "Psicólogos", escolha o profissional, toque num horário livre e pague. A sessão é confirmada assim que o pagamento é aprovado.',
  },
  { p: 'Quais formas de pagamento são aceitas?', r: 'PIX e cartão de crédito. O histórico fica em Mais → Pagamentos.' },
  {
    p: 'Como reagendar ou cancelar?',
    r: 'Na aba "Sessões", use "Reagendar" (grátis, com mais de 24h de antecedência) ou "Cancelar". Cancelando com mais de 48h, o valor volta integralmente; com 48h ou menos, não há reembolso.',
  },
  {
    p: 'Como entro na sessão por vídeo?',
    r: 'O botão "Entrar na sessão" aparece na aba "Sessões" 10 minutos antes do horário. Permita o acesso à câmera e ao microfone quando o app pedir.',
  },
  {
    p: 'Meu psicólogo vê meu diário?',
    r: 'Sim. Os registros do Diário de bem-estar ficam visíveis para o seu psicólogo, para acompanhar sua evolução entre as sessões.',
  },
];

const FAQ_PSI = [
  {
    p: 'Como libero horários?',
    r: 'Na aba "Agenda", toque em "Liberar", escolha os dias e os horários de início. Cada horário vira uma sessão online de 50 min. Dá para repetir nas semanas seguintes.',
  },
  {
    p: 'Quando recebo pelas sessões?',
    r: 'O valor de cada sessão paga libera para saque quando ela termina. Em "Financeiro", você saca via PIX uma vez por semana.',
  },
  {
    p: 'E se eu precisar cancelar?',
    r: 'Cancele pelo cartão da sessão na "Agenda". O paciente recebe o valor de volta integralmente e é avisado por e-mail.',
  },
  {
    p: 'O que é "Registre o atendimento"?',
    r: 'Depois do horário, marque a sessão como "Realizada" ou "Faltou". Falta não gera estorno ao paciente.',
  },
  {
    p: 'Onde emito laudos, atestados e recibos?',
    r: 'Pelo painel do site (Mais → Painel completo no site). O paciente recebe o documento no app dele.',
  },
];

export default function SupportScreen() {
  const faq = isPsicologo(useAuth().user) ? FAQ_PSI : FAQ;
  const enviar = useSendSupport();
  const [aberta, setAberta] = useState<number | null>(null);
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');

  const submit = () =>
    enviar.mutate(
      { assunto: assunto.trim(), mensagem: mensagem.trim() },
      {
        onSuccess: () => {
          setAssunto('');
          setMensagem('');
          Alert.alert('Mensagem enviada', 'Respondemos no e-mail da sua conta, em dias úteis.');
        },
        onError: (e: any) => Alert.alert('Não foi possível enviar', e?.message ?? 'Tente novamente.'),
      }
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
      <Text style={s.section}>Perguntas frequentes</Text>
      <View style={s.faq}>
        {faq.map(({ p, r }, i) => (
          <Pressable key={p} onPress={() => setAberta(aberta === i ? null : i)} style={[s.item, i > 0 && s.divider]}>
            <View style={s.row}>
              <Text style={s.question}>{p}</Text>
              <Ionicons name={aberta === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
            </View>
            {aberta === i && <Text style={s.answer}>{r}</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={s.section}>Fale com a equipe</Text>
      <Card style={{ gap: spacing.md }}>
        <Input label="Assunto" placeholder="Ex.: dúvida sobre pagamento" value={assunto} onChangeText={setAssunto} maxLength={150} />
        <Input
          label="Mensagem"
          style={s.textarea}
          placeholder="Conte com detalhes o que aconteceu"
          multiline
          textAlignVertical="top"
          value={mensagem}
          onChangeText={setMensagem}
        />
        <GradientButton
          title="Enviar mensagem"
          onPress={submit}
          loading={enviar.isPending}
          disabled={!assunto.trim() || !mensagem.trim()}
        />
        <Text style={s.hint}>Em crise, ligue 188 (CVV, 24h, gratuito) ou 192 (SAMU).</Text>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  section: { fontSize: font.body, fontWeight: '800', color: colors.text },
  faq: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden' },
  item: { padding: spacing.lg, gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  question: { flex: 1, fontWeight: '700', color: colors.text },
  answer: { color: colors.muted, lineHeight: 20 },
  textarea: { minHeight: 120, paddingTop: spacing.md },
  hint: { color: colors.muted, fontSize: font.tiny, textAlign: 'center' },
});
