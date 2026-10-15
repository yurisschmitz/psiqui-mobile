import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/auth';
import { GradientButton, Input } from '../../src/ui';
import { colors, font, radius, spacing } from '../../src/theme';

/** Máscara simples dd/mm/aaaa enquanto digita. */
function maskDate(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** dd/mm/aaaa → aaaa-mm-dd (ou null se inválida). */
function toISODate(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (date.getDate() !== Number(d) || date.getMonth() !== Number(mo) - 1) return null;
  if (date > new Date()) return null;
  return `${y}-${mo}-${d}`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [genero, setGenero] = useState<'M' | 'F' | ''>('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const iso = toISODate(nascimento);
    if (!nome.trim() || !email.trim() || !password) {
      Alert.alert('Atenção', 'Preencha nome, e-mail e senha.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Atenção', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Atenção', 'As senhas não conferem.');
      return;
    }
    if (!iso) {
      Alert.alert('Atenção', 'Data de nascimento inválida. Use o formato dd/mm/aaaa.');
      return;
    }
    if (!genero) {
      Alert.alert('Atenção', 'Selecione o gênero.');
      return;
    }

    try {
      setLoading(true);
      await register({
        nome: nome.trim(),
        email: email.trim(),
        password,
        data_nascimento: iso,
        telefone: telefone.trim() || undefined,
        genero,
      });
      Alert.alert(
        'Conta criada! 🎉',
        'Enviamos um e-mail de confirmação. Agora é só fazer login.',
        [{ text: 'Fazer login', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro no cadastro', e?.message ?? 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Text style={s.title}>Crie sua conta</Text>
        <Text style={s.subtitle}>Comece sua jornada de cuidado na Psiqui</Text>

        <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>
          <Input label="Nome completo" icon="person-outline" placeholder="Seu nome" value={nome} onChangeText={setNome} />
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
            placeholder="Mínimo 8 caracteres"
            secureTextEntry={!show}
            rightIcon={show ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShow(!show)}
            value={password}
            onChangeText={setPassword}
          />
          <Input
            label="Confirmar senha"
            icon="lock-closed-outline"
            placeholder="Repita a senha"
            secureTextEntry={!show}
            value={confirm}
            onChangeText={setConfirm}
          />
          <Input
            label="Data de nascimento"
            icon="calendar-outline"
            placeholder="dd/mm/aaaa"
            keyboardType="number-pad"
            value={nascimento}
            onChangeText={(v) => setNascimento(maskDate(v))}
            maxLength={10}
          />
          <Input
            label="Telefone (opcional)"
            icon="call-outline"
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={setTelefone}
          />

          <View style={{ gap: 6 }}>
            <Text style={s.label}>Gênero</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {(
                [
                  { v: 'M', label: 'Masculino' },
                  { v: 'F', label: 'Feminino' },
                ] as const
              ).map(({ v, label }) => (
                <Pressable
                  key={v}
                  onPress={() => setGenero(v)}
                  style={[s.chip, genero === v && s.chipActive]}
                >
                  <Text style={[s.chipText, genero === v && s.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <GradientButton title="Criar conta" onPress={handleRegister} loading={loading} />

          <Text style={s.terms}>
            Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade da Psiqui.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, paddingTop: 64, paddingBottom: 48 },
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
  subtitle: { fontSize: font.body, color: colors.muted, marginTop: 4 },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { color: colors.muted, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  terms: { fontSize: font.tiny, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
