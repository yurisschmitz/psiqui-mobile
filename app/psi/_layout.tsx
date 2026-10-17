import React from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/auth';
import { usePerfilPsi } from '../../src/api/psi';
import { GradientButton, OutlineButton } from '../../src/ui';
import { colors, font, spacing } from '../../src/theme';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://psiqui.com.br';

/**
 * Área do psicólogo. Cadastro (documentos + aprovação) é feito na web;
 * até ser aprovado, o app só explica o que falta.
 */
export default function PsiLayout() {
  const { logout } = useAuth();
  const { data, isLoading, isError, refetch } = usePerfilPsi();

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const status = data?.psicologo?.status;
  if (isError || status !== 'aprovado') {
    const emAnalise = status === 'pendente';
    return (
      <View style={s.center}>
        <View style={s.icon}>
          <Ionicons name={isError ? 'cloud-offline-outline' : emAnalise ? 'hourglass-outline' : 'document-text-outline'} size={32} color={colors.primary} />
        </View>
        <Text style={s.title}>
          {isError ? 'Não foi possível carregar' : emAnalise ? 'Cadastro em análise' : 'Complete seu cadastro'}
        </Text>
        <Text style={s.text}>
          {isError
            ? 'Verifique a internet e tente de novo.'
            : emAnalise
              ? 'Nossa equipe está conferindo seus documentos. Assim que for aprovado, sua agenda aparece aqui.'
              : 'Envie seus documentos e preencha o perfil pelo site. Depois da aprovação, use o app no dia a dia.'}
        </Text>
        <View style={{ alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.lg }}>
          {isError || emAnalise ? (
            <GradientButton title="Tentar de novo" icon="refresh" onPress={() => refetch()} />
          ) : (
            <GradientButton title="Abrir o site" icon="open-outline" onPress={() => Linking.openURL(`${WEB_URL}/login`)} />
          )}
          <OutlineButton title="Sair da conta" onPress={() => logout()} />
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="liberar" options={{ headerShown: true, headerTitle: 'Liberar horários' }} />
      <Stack.Screen name="paciente/[id]" options={{ headerShown: true, headerTitle: 'Paciente' }} />
      <Stack.Screen name="perfil" options={{ headerShown: true, headerTitle: 'Perfil profissional' }} />
    </Stack>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.bg, gap: spacing.sm },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: font.subtitle, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
