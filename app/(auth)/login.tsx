import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/auth';
import { GradientButton, Input } from '../../src/ui';
import { brandGradient, colors, font, radius, spacing } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Informe e-mail e senha.');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
      // O AuthGate redireciona para as tabs automaticamente
    } catch (e: any) {
      Alert.alert('Não foi possível entrar', e?.message ?? 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Cabeçalho da marca */}
        <LinearGradient colors={[...brandGradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.logoWrap}>
            <Image source={require('../../assets/images/psiqui-logo.png')} style={s.logo} resizeMode="contain" />
          </View>
          <Text style={s.heroTitle}>Psiqui</Text>
          <Text style={s.heroSubtitle}>Cuidado psicológico na palma da mão</Text>
        </LinearGradient>

        <View style={s.body}>
          <Text style={s.title}>Bem-vindo(a) de volta</Text>
          <Text style={s.subtitle}>Entre na sua conta para continuar</Text>

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
            <Input
              label="Senha"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry={!show}
              rightIcon={show ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShow(!show)}
              value={password}
              onChangeText={setPassword}
            />

            <Pressable onPress={() => router.push('/(auth)/esqueci-senha')} hitSlop={8}>
              <Text style={s.link}>Esqueceu a senha?</Text>
            </Pressable>

            <GradientButton title="Entrar" onPress={handleLogin} loading={loading} />
          </View>

          <View style={s.footer}>
            <Text style={{ color: colors.muted }}>Ainda não tem uma conta? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text style={[s.link, { textAlign: 'center' }]}>Cadastre-se</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: { width: 64, height: 64 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 0.5 },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, marginTop: 4 },
  body: { flex: 1, padding: spacing.xl, paddingTop: spacing.xxl },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.muted, marginTop: 4 },
  link: { color: colors.primary, fontWeight: '600', alignSelf: 'flex-end' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl, alignItems: 'center' },
});
