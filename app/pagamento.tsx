import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/context/auth';
import { useConfirmDevPayment, useCreateBooking, useInvoiceStatus } from '../src/api/hooks';
import type { Fatura } from '../src/api/types';
import { Card, GradientButton, Loading, OutlineButton } from '../src/ui';
import { colors, font, radius, spacing } from '../src/theme';

type Step = 'method' | 'pix' | 'card' | 'success';

export default function PaymentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { agendaId, nome, valor, quando } = useLocalSearchParams<{
    agendaId: string;
    nome: string;
    valor: string;
    quando: string;
  }>();

  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix');
  const [step, setStep] = useState<Step>('method');
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [copied, setCopied] = useState(false);

  const createBooking = useCreateBooking();
  const confirmDev = useConfirmDevPayment();
  const isDev = !!fatura?.id?.startsWith('dev_');
  const { data: status } = useInvoiceStatus(fatura?.id ?? null, step === 'pix' || step === 'card');

  // Pagamento confirmado via polling
  useEffect(() => {
    if (status?.status === 'paid') setStep('success');
  }, [status?.status]);

  const valorNum = Number(valor) || 0;
  const valorFmt = valorNum > 0 ? `R$ ${valorNum.toFixed(2).replace('.', ',')}` : '';

  const handleConfirm = () => {
    createBooking.mutate(
      {
        agenda_id: Number(agendaId),
        nome: user?.name ?? 'Paciente',
        email: user?.email ?? '',
        return_url: 'https://psiqui.com.br/pagamento-concluido',
        tipo_pagamento: method,
      },
      {
        onSuccess: (res) => {
          setFatura(res.fatura);
          if (method === 'pix') {
            setStep('pix');
          } else {
            setStep('card');
            if (res.fatura.secure_url) Linking.openURL(res.fatura.secure_url);
          }
        },
        onError: (e: any) => Alert.alert('Não foi possível agendar', e?.message ?? 'Tente novamente.'),
      }
    );
  };

  const copyPix = async () => {
    if (!fatura?.pix?.qrcode_text) return;
    await Clipboard.setStringAsync(fatura.pix.qrcode_text);
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

      {/* Escolha do método */}
      {step === 'method' && (
        <>
          <View style={{ gap: spacing.md }}>
            {(
              [
                { k: 'pix', icon: 'qr-code-outline', title: 'PIX', sub: 'Aprovação em segundos' },
                { k: 'credit_card', icon: 'card-outline', title: 'Cartão de crédito', sub: 'Pagamento em ambiente seguro' },
              ] as const
            ).map(({ k, icon, title, sub }) => {
              const active = method === k;
              return (
                <Pressable key={k} onPress={() => setMethod(k)} style={[s.method, active && s.methodActive]}>
                  <View style={[s.methodIcon, active && { backgroundColor: colors.primary }]}>
                    <Ionicons name={icon} size={22} color={active ? '#fff' : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.methodTitle}>{title}</Text>
                    <Text style={s.methodSub}>{sub}</Text>
                  </View>
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={active ? colors.primary : colors.border}
                  />
                </Pressable>
              );
            })}
          </View>

          <GradientButton title="Confirmar e pagar" onPress={handleConfirm} loading={createBooking.isPending} />
          <Text style={s.secure}>🔒 Pagamento processado com segurança pela Iugu</Text>
        </>
      )}

      {/* PIX */}
      {step === 'pix' && fatura && (
        <Card style={{ alignItems: 'center', gap: spacing.lg }}>
          <Text style={s.pixTitle}>Pague com PIX</Text>
          <Text style={s.pixSub}>Escaneie o QR Code no app do seu banco ou use o copia-e-cola.</Text>

          {fatura.pix?.qrcode_text ? (
            <View style={s.qrWrap}>
              <QRCode value={fatura.pix.qrcode_text} size={200} />
            </View>
          ) : (
            <View style={[s.qrWrap, { width: 232, height: 232, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="qr-code-outline" size={48} color={colors.muted} />
              {isDev && <Text style={{ color: colors.muted, fontSize: font.tiny, textAlign: 'center', marginTop: 8 }}>Modo dev — use o botão abaixo</Text>}
            </View>
          )}

          {fatura.pix?.qrcode_text && (
            <Pressable onPress={copyPix} style={s.copyBtn}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.primary} />
              <Text style={s.copyText}>{copied ? 'Copiado!' : 'Copiar código PIX'}</Text>
            </Pressable>
          )}

          <View style={s.waiting}>
            <Loading />
            <Text style={{ color: colors.muted, fontSize: font.small, marginTop: -spacing.lg }}>
              Aguardando confirmação do pagamento...
            </Text>
          </View>

          {isDev && (
            <OutlineButton
              title="Simular pagamento (dev)"
              onPress={() => fatura.id && confirmDev.mutate(fatura.id)}
              loading={confirmDev.isPending}
              style={{ alignSelf: 'stretch' }}
            />
          )}
        </Card>
      )}

      {/* Cartão */}
      {step === 'card' && fatura && (
        <Card style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }}>
          <Ionicons name="card-outline" size={48} color={colors.primary} />
          <Text style={s.pixSub}>
            Conclua o pagamento na página segura que abrimos no navegador. Esta tela confirma automaticamente.
          </Text>
          {fatura.secure_url && (
            <OutlineButton
              title="Abrir página de pagamento"
              icon="open-outline"
              onPress={() => Linking.openURL(fatura.secure_url!)}
              style={{ alignSelf: 'stretch' }}
            />
          )}
          <Text style={{ color: colors.muted, fontSize: font.small }}>Aguardando confirmação...</Text>
        </Card>
      )}

      {/* Sucesso */}
      {step === 'success' && (
        <Card style={{ alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={42} color="#fff" />
          </View>
          <Text style={s.successTitle}>Sessão confirmada! 🎉</Text>
          <Text style={s.pixSub}>
            Sua sessão com {nome} está garantida. Enviamos os detalhes por e-mail.
          </Text>
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
