import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useCreateBooking, usePaymentConfig, usePaymentStatus } from '../src/api/hooks';
import type { Cartao } from '../src/api/types';
import { Card, GradientButton, Input, Loading, OutlineButton } from '../src/ui';
import { colors, font, radius, spacing } from '../src/theme';

type Step = 'method' | 'card' | 'cpf' | 'pix' | 'processing' | 'success';
type Tipo = 'pix' | 'credit_card';

const digitos = (v: string) => v.replace(/\D/g, '');
const mascaraCartao = (v: string) => digitos(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const mascaraCpf = (v: string) =>
  digitos(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

// Mesmo fluxo da web: método → (CPF só na 1ª vez) → PIX com polling ou cartão.
// Sem gateway configurado o back devolve cobranca = null e a sessão já sai confirmada.
export default function PaymentScreen() {
  const router = useRouter();
  const { agendaId, nome, valor, quando } = useLocalSearchParams<{
    agendaId: string;
    nome: string;
    valor: string;
    quando: string;
  }>();

  const [step, setStep] = useState<Step>('method');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pixCodigo, setPixCodigo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cartao, setCartao] = useState({ numero: '', nome: '', mes: '', ano: '', cvv: '' });
  const [cpf, setCpf] = useState('');
  const pendente = useRef<{ tipo: Tipo; cartao?: Cartao } | null>(null);

  const createBooking = useCreateBooking();
  const { data: config } = usePaymentConfig();
  const semCobranca = config?.configurado === false;
  const { data: status } = usePaymentStatus(paymentId, step === 'pix' || step === 'processing');

  useEffect(() => {
    if (status?.status === 'pago') setStep('success');
  }, [status?.status]);

  const valorNum = Number(valor) || 0;
  const valorFmt = valorNum > 0 ? `R$ ${valorNum.toFixed(2).replace('.', ',')}` : '';

  const cobrar = (tipo: Tipo, dadosCartao?: Cartao, cpfInformado?: string) => {
    setErro(null);
    createBooking.mutate(
      {
        agenda_id: Number(agendaId),
        tipo_pagamento: tipo,
        ...(dadosCartao ? { cartao: dadosCartao } : {}),
        ...(cpfInformado ? { cpf: cpfInformado } : {}),
      },
      {
        onSuccess: ({ cobranca }) => {
          if (!cobranca || cobranca.status === 'pago') return setStep('success');
          setPaymentId(cobranca.id);
          if (tipo === 'pix') {
            setPixCodigo(cobranca.pix?.copia_e_cola ?? null);
            setStep('pix');
          } else {
            setStep('processing');
          }
        },
        onError: (e: any) => {
          const body = e?.data;
          if (body?.precisa_cpf) {
            pendente.current = { tipo, cartao: dadosCartao };
            return setStep('cpf');
          }
          setErro(body?.errors?.cpf?.[0] ?? e?.message ?? 'Não foi possível processar o pagamento.');
          setStep(tipo === 'credit_card' ? 'card' : 'method');
        },
      }
    );
  };

  const pagarComCartao = () => {
    const numero = digitos(cartao.numero);
    const mes = Number(cartao.mes);
    const ano = Number(cartao.ano);
    const hoje = new Date();
    if (numero.length < 13) return setErro('Número do cartão incompleto.');
    if (!cartao.nome.trim()) return setErro('Informe o nome como está impresso no cartão.');
    if (cartao.mes.length !== 2 || mes < 1 || mes > 12) return setErro('Mês de validade inválido (01 a 12).');
    if (cartao.ano.length !== 4) return setErro('Ano de validade com 4 dígitos (ex.: 2030).');
    if (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1))
      return setErro('Este cartão está vencido.');
    if (cartao.cvv.length < 3) return setErro('CVV incompleto (3 ou 4 dígitos no verso).');
    cobrar('credit_card', { nome: cartao.nome.trim(), numero, mes: cartao.mes, ano: cartao.ano, cvv: cartao.cvv });
  };

  const copyPix = async () => {
    if (!pixCodigo) return;
    await Clipboard.setStringAsync(pixCodigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: 48 }}>
      {/* Resumo */}
      {step !== 'success' && (
        <Card>
          <Text style={s.summaryLabel}>Sessão com</Text>
          <Text style={s.summaryName}>{nome}</Text>
          <Text style={s.summaryWhen}>{quando} (seu horário)</Text>
          <View style={s.summaryDivider} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>Total</Text>
            <Text style={s.summaryPrice}>{valorFmt || 'A confirmar'}</Text>
          </View>
        </Card>
      )}

      {erro && (
        <View style={s.erro}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <Text style={s.erroText}>{erro}</Text>
        </View>
      )}

      {/* Escolha do método: tocar já segue (PIX cobra; cartão abre o formulário) */}
      {step === 'method' && (
        <>
          {semCobranca ? (
            <GradientButton
              title="Confirmar agendamento"
              onPress={() => cobrar('pix')}
              loading={createBooking.isPending}
            />
          ) : (
          <>
          <Text style={s.question}>Como você quer pagar?</Text>
          <View style={{ gap: spacing.md }}>
            {(
              [
                { k: 'pix', icon: 'qr-code-outline', title: 'PIX', sub: 'Aprovação na hora' },
                { k: 'credit_card', icon: 'card-outline', title: 'Cartão de crédito', sub: 'Cobrança única' },
              ] as const
            ).map(({ k, icon, title, sub }) => (
              <Pressable
                key={k}
                disabled={createBooking.isPending}
                onPress={() => {
                  setErro(null);
                  if (k === 'pix') cobrar('pix');
                  else setStep('card');
                }}
                style={({ pressed }) => [s.method, pressed && s.methodActive]}
              >
                <View style={s.methodIcon}>
                  <Ionicons name={icon} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.methodTitle}>{title}</Text>
                  <Text style={s.methodSub}>{sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>
          {createBooking.isPending && <Loading />}
          </>
          )}
          <Text style={s.secure}>
            Reagendar é grátis até 24 horas antes. Cancelando com mais de 48 horas, o valor volta integralmente.
          </Text>
          {!semCobranca && <Text style={s.secure}>🔒 Pagamento processado com segurança pelo Asaas</Text>}
        </>
      )}

      {/* Cartão */}
      {step === 'card' && (
        <Card style={{ gap: spacing.md }}>
          <Input
            label="Número do cartão"
            placeholder="0000 0000 0000 0000"
            keyboardType="number-pad"
            autoComplete="cc-number"
            value={cartao.numero}
            onChangeText={(v) => setCartao((c) => ({ ...c, numero: mascaraCartao(v) }))}
          />
          <Input
            label="Nome impresso no cartão"
            placeholder="Como está no cartão"
            autoCapitalize="characters"
            autoComplete="cc-name"
            value={cartao.nome}
            onChangeText={(v) => setCartao((c) => ({ ...c, nome: v }))}
          />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Input
                label="Mês"
                placeholder="MM"
                keyboardType="number-pad"
                maxLength={2}
                value={cartao.mes}
                onChangeText={(v) => setCartao((c) => ({ ...c, mes: digitos(v) }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Ano"
                placeholder="AAAA"
                keyboardType="number-pad"
                maxLength={4}
                value={cartao.ano}
                onChangeText={(v) => setCartao((c) => ({ ...c, ano: digitos(v) }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="CVV"
                placeholder="123"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={cartao.cvv}
                onChangeText={(v) => setCartao((c) => ({ ...c, cvv: digitos(v) }))}
              />
            </View>
          </View>
          <GradientButton title={`Pagar ${valorFmt}`.trim()} onPress={pagarComCartao} loading={createBooking.isPending} />
          <OutlineButton
            title="Voltar"
            onPress={() => {
              setErro(null);
              setStep('method');
            }}
          />
        </Card>
      )}

      {/* CPF: o Asaas exige na 1ª cobrança */}
      {step === 'cpf' && (
        <Card style={{ gap: spacing.md }}>
          <Text style={s.pixTitle}>Só falta seu CPF</Text>
          <Text style={s.pixSub}>O Asaas pede o CPF de quem paga. Pedimos só nesta primeira vez.</Text>
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            keyboardType="number-pad"
            value={cpf}
            onChangeText={(v) => setCpf(mascaraCpf(v))}
          />
          <GradientButton
            title="Continuar"
            disabled={digitos(cpf).length !== 11}
            loading={createBooking.isPending}
            onPress={() => pendente.current && cobrar(pendente.current.tipo, pendente.current.cartao, digitos(cpf))}
          />
        </Card>
      )}

      {/* Cartão em análise */}
      {step === 'processing' && (
        <Card style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }}>
          <Ionicons name="card-outline" size={48} color={colors.primary} />
          <Text style={s.pixSub}>Confirmando o pagamento com a operadora do cartão…</Text>
          <Loading />
        </Card>
      )}

      {/* PIX */}
      {step === 'pix' && (
        <Card style={{ alignItems: 'center', gap: spacing.lg }}>
          <Text style={s.pixTitle}>Pague com PIX</Text>
          <Text style={s.pixSub}>Escaneie o QR Code no app do seu banco ou use o copia-e-cola.</Text>
          {pixCodigo && (
            <View style={s.qrWrap}>
              <QRCode value={pixCodigo} size={200} />
            </View>
          )}
          {pixCodigo && (
            <Pressable onPress={copyPix} style={s.copyBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primary} />
              <Text style={s.copyText}>{copied ? 'Copiado!' : 'Copiar código PIX'}</Text>
            </Pressable>
          )}
          <View style={s.waiting}>
            <Loading />
            <Text style={{ color: colors.muted, fontSize: font.small, marginTop: -spacing.lg }}>
              Aguardando a confirmação do pagamento…
            </Text>
          </View>
        </Card>
      )}

      {/* Sucesso */}
      {step === 'success' && (
        <Card style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
          <Text style={s.successTitle}>Sessão confirmada!</Text>
          <Text style={s.successWhen}>{quando}</Text>
          <Text style={s.pixSub}>Sua sessão com {nome} está garantida. Enviamos os detalhes por e-mail.</Text>
          <GradientButton
            title="Ver minhas sessões"
            onPress={() => router.replace('/(tabs)/sessoes')}
            style={{ alignSelf: 'stretch' }}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  summaryLabel: { color: colors.muted, fontSize: font.small },
  summaryName: { fontSize: font.subtitle, fontWeight: '800', color: colors.text, marginTop: 2 },
  summaryWhen: { color: colors.muted, marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  summaryPrice: { fontSize: font.title, fontWeight: '800', color: colors.primary },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  question: { fontWeight: '700', color: colors.text, fontSize: font.body },
  erro: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerBg,
  },
  erroText: { color: colors.danger, flex: 1, fontSize: font.small },
  successWhen: { fontWeight: '700', color: colors.text, fontSize: font.body },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontWeight: '700', color: colors.text, fontSize: font.body },
  methodSub: { color: colors.muted, fontSize: font.small },
  secure: { textAlign: 'center', color: colors.muted, fontSize: font.tiny },
  pixTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  pixSub: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
  qrWrap: { backgroundColor: '#fff', padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  copyText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  waiting: { alignItems: 'center' },
  successIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { fontSize: font.title, fontWeight: '800', color: colors.text },
});
