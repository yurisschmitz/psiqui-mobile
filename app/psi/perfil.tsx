import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePerfilPsi, useSalvarPerfilPsi } from '../../src/api/psi';
import { Avatar, Card, GradientButton, Input, Loading } from '../../src/ui';
import { VALOR_SESSAO_PADRAO, formatCRP, storageUrl } from '../../src/format';
import { colors, font, spacing } from '../../src/theme';

/** O que o paciente vê na vitrine. Foto, vídeo e redes ficam na web. */
export default function PsiPerfil() {
  const { data, isLoading } = usePerfilPsi();
  const salvar = useSalvarPerfilPsi();
  const [titulo, setTitulo] = useState('');
  const [sobre, setSobre] = useState('');
  const [valor, setValor] = useState('');

  useEffect(() => {
    if (!data) return;
    setTitulo(data.perfil?.titulo || (data.psicologo.especialidades ?? []).map((e) => e.nome).join(', '));
    setSobre(data.perfil?.sobre ?? '');
    setValor(data.perfil?.valor_sessao != null ? String(Number(data.perfil.valor_sessao)).replace('.', ',') : '');
  }, [data]);

  if (isLoading || !data) return <Loading />;

  const valorNum = valor.trim() ? Number(valor.replace(',', '.')) : null;

  const submit = () => {
    if (valorNum !== null && (Number.isNaN(valorNum) || valorNum <= 0)) {
      return Alert.alert('Valor inválido', 'Informe o valor da sessão em reais, ex.: 120 ou 99,90.');
    }
    salvar.mutate(
      { titulo: titulo.trim(), sobre: sobre.trim(), valor_sessao: valorNum },
      {
        onSuccess: () => Alert.alert('Perfil salvo', 'As mudanças já aparecem para os pacientes.'),
        onError: (e: any) => Alert.alert('Não foi possível salvar', e?.message ?? 'Tente novamente.'),
      }
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Avatar name={data.user.name} size={88} uri={storageUrl(data.perfil?.foto_perfil)} />
        <Text style={s.name}>{data.user.name}</Text>
        {data.psicologo.crp ? <Text style={s.muted}>CRP {formatCRP(data.psicologo.crp)}</Text> : null}
      </View>

      <Card style={{ gap: spacing.lg }}>
        <Input
          label="Especialidades"
          placeholder="Ex.: Ansiedade, Depressão, Casais"
          value={titulo}
          onChangeText={setTitulo}
        />
        <Text style={[s.muted, { marginTop: -spacing.sm }]}>Separe por vírgula. Viram os filtros da busca de psicólogos.</Text>
        <Input
          label="Sobre você"
          placeholder="Como você trabalha, abordagem, para quem é a terapia"
          multiline
          textAlignVertical="top"
          style={{ minHeight: 140, paddingTop: spacing.md }}
          value={sobre}
          onChangeText={setSobre}
        />
        <Input
          label="Valor da sessão (R$)"
          placeholder={String(VALOR_SESSAO_PADRAO)}
          keyboardType="decimal-pad"
          value={valor}
          onChangeText={(v) => setValor(v.replace(/[^\d,.]/g, ''))}
        />
        <Text style={[s.muted, { marginTop: -spacing.sm }]}>
          Vale para os horários liberados daqui em diante. Em branco, a sessão custa R$ {VALOR_SESSAO_PADRAO}.
        </Text>
        <GradientButton title="Salvar perfil" onPress={submit} loading={salvar.isPending} />
      </Card>
      <Text style={[s.muted, { textAlign: 'center' }]}>Foto, vídeo de apresentação e redes sociais: edite pelo site.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 48 },
  name: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  muted: { color: colors.muted, fontSize: font.small },
});
