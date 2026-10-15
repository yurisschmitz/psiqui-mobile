import React, { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useChangePassword } from '../src/api/hooks';
import { Card, GradientButton, Input } from '../src/ui';
import { colors, font, spacing } from '../src/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const change = useChangePassword();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');

  const salvar = () => {
    if (nova.length < 8) return Alert.alert('Senha curta', 'A nova senha precisa de pelo menos 8 caracteres.');
    if (nova !== confirma) return Alert.alert('Senhas diferentes', 'A confirmação não bate com a nova senha.');
    change.mutate(
      { senha_atual: atual, password: nova, password_confirmation: confirma },
      {
        onSuccess: () => {
          Alert.alert('Senha alterada', 'Os outros aparelhos conectados foram desconectados.');
          router.back();
        },
        onError: (e: any) => Alert.alert('Não foi possível alterar', e?.message ?? 'Tente novamente.'),
      }
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.xl }}>
      <Card style={{ gap: spacing.md }}>
        <Text style={{ color: colors.muted, fontSize: font.small }}>
          Ao trocar a senha, os outros aparelhos conectados são desconectados.
        </Text>
        <Input label="Senha atual" secureTextEntry autoComplete="current-password" value={atual} onChangeText={setAtual} />
        <Input label="Nova senha" secureTextEntry autoComplete="new-password" value={nova} onChangeText={setNova} />
        <Input label="Confirmar nova senha" secureTextEntry autoComplete="new-password" value={confirma} onChangeText={setConfirma} />
        <GradientButton
          title="Alterar senha"
          onPress={salvar}
          loading={change.isPending}
          disabled={!atual || !nova || !confirma}
        />
      </Card>
    </ScrollView>
  );
}
