import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import { GradientButton, Input, OutlineButton } from '../../src/ui';
import { colors, font, spacing } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await api.post('/esqueci-senha', { email: email.trim() });
    } catch {
      // resposta neutra: mostramos sucesso de qualquer forma
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      {sent ? (
        <View style={s.success}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={s.title}>Verifique seu e-mail</Text>
          <Text style={s.subtitle}>
            Se houver uma conta com {email || 'este e-mail'}, enviamos um link para redefinir a senha. Confira também a
            caixa de spam.
          </Text>
          <OutlineButton title="Voltar para o login" onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <Text style={s.title}>Recuperar senha</Text>
          <Text style={s.subtitle}>Enviaremos um link por e-mail para você criar uma nova senha.</Text>

          <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
            <Input
              label="E-mail"
              icon="mail-outline"
              placeholder="seu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <GradientButton title="Enviar link de recuperação" onPress={handleSubmit} loading={loading} disabled={!email.trim()} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, paddingTop: 64 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.muted, marginTop: 6, lineHeight: 22 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  successIcon: { marginBottom: spacing.lg },
});
