import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api/client';
import type { User } from '../api/types';

interface RegisterData {
  nome: string;
  email: string;
  password: string;
  data_nascimento: string; // YYYY-MM-DD
  telefone?: string;
  genero: 'M' | 'F';
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const me = await api.get<User>('/me');
    setUser(me);
  }, []);

  // Restaura a sessão ao abrir o app
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) await refreshUser();
      } catch {
        await setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ access_token: string }>('/login', { email, password });
      await setToken(res.access_token);
      const me = await api.get<User>('/me');

      // Este app é exclusivo do paciente
      if (!me.roles?.some((r) => r.name === 'paciente')) {
        await setToken(null);
        throw new Error('Este aplicativo é exclusivo para pacientes. Psicólogos devem usar a plataforma web.');
      }

      setUser(me);
    },
    []
  );

  const register = useCallback(async (data: RegisterData) => {
    await api.post('/register', {
      nome: data.nome,
      email: data.email,
      password: data.password,
      papel: 'paciente',
      paciente: {
        data_nascimento: data.data_nascimento,
        telefone: data.telefone || undefined,
        genero: data.genero,
      },
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      // mesmo se a API falhar, limpamos a sessão local
    }
    await setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
