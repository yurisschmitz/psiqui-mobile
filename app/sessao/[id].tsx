import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '../../src/api/client';
import { isPsicologo, useAuth } from '../../src/context/auth';
import { colors, font, spacing } from '../../src/theme';
import { useTopPad } from '../../src/ui';

/**
 * Sessão de vídeo (v1): abre a sala da plataforma web dentro do app,
 * injetando o token de autenticação no localStorage antes do carregamento.
 * A página web cuida do TRTC (câmera, microfone, conexão).
 */
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://psiqui.com.br';

// No Android a WebView só recebe a câmera se o APP tiver a permissão em tempo de
// execução; sem isso o getUserMedia falha com NotReadableError e não há vídeo.
async function pedirCameraMicrofone(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Um pedido por vez: o requestMultiple às vezes não resolve depois do 2º diálogo.
  const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return cam === PermissionsAndroid.RESULTS.GRANTED && mic === PermissionsAndroid.RESULTS.GRANTED;
}

export default function VideoSessionScreen() {
  const topPad = useTopPad(spacing.sm);
  const router = useRouter();
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const saiu = useRef(false);
  const psi = isPsicologo(useAuth().user);

  useEffect(() => {
    Promise.all([getToken(), pedirCameraMicrofone()]).then(([t, ok]) => {
      setTokenState(t);
      setSemPermissao(!ok);
      setLoading(false);
    });
  }, []);

  // A web tem uma sala por papel; o nome no fim da URL é o da outra pessoa.
  const url = `${WEB_URL}/video-session-${psi ? 'psico' : 'patient'}/${id}/${encodeURIComponent(nome ?? 'Sessão')}`;

  // Injeta o token Sanctum no localStorage da SPA antes do carregamento
  // __PSIQUI_APP__ faz a página trocar "navegador" por "celular" nos avisos.
  const injectAuth = `window.__PSIQUI_APP__ = true;${
    token ? ` window.localStorage.setItem('auth_token', ${JSON.stringify(token)});` : ''
  } true;`;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={[s.topBar, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          Sessão com {nome ?? (psi ? 'o paciente' : 'seu psicólogo')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : semPermissao ? (
        <View style={s.center}>
          <Ionicons name="videocam-off-outline" size={40} color="#94A3B8" />
          <Text style={[s.loadingText, { textAlign: 'center', paddingHorizontal: spacing.xl }]}>
            Sem acesso à câmera e ao microfone. Libere nas configurações do celular e entre de novo.
          </Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: '#0F172A' }}
          injectedJavaScriptBeforeContentLoaded={injectAuth}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          // Ao encerrar, a página web volta ao painel: aqui isso significa fechar a tela.
          onNavigationStateChange={(nav) => {
            if (!saiu.current && /\/(patient-dashboard|psychologist-dashboard|login)(\/|$|\?)/.test(nav.url)) {
              saiu.current = true;
              router.back();
            }
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={[s.center, StyleSheet.absoluteFill, { backgroundColor: '#0F172A' }]}>
              <ActivityIndicator size="large" color="#60A5FA" />
              <Text style={s.loadingText}>Conectando à sessão...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#0F172A',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#fff', fontWeight: '700', fontSize: font.body, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: font.small },
});
