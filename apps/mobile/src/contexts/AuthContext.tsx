import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { api, setUserId as setApiUserId } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

const USER_ID_KEY = '@ipchun/userId';

interface AuthUser {
  userId: string;
  email: string;
  nickname: string | null;
  imageUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  // Restore persisted session on mount
  useEffect(() => {
    AsyncStorage.getItem(USER_ID_KEY).then(async (storedUserId) => {
      if (storedUserId) {
        setApiUserId(storedUserId);
        try {
          const profile = await api.users.getMe();
          setUser(profile);
        } catch {
          await AsyncStorage.removeItem(USER_ID_KEY);
          setApiUserId(null);
        }
      }
      setIsLoading(false);
    });
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const { authentication } = googleResponse;
    if (!authentication?.accessToken) return;

    (async () => {
      try {
        setIsLoading(true);
        const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        });
        const googleUser = await userInfoRes.json();
        const result = await api.users.signIn({
          provider: 'GOOGLE',
          providerAccountId: googleUser.id,
          email: googleUser.email,
          nickname: googleUser.name ?? undefined,
          imageUrl: googleUser.picture ?? undefined,
        });
        await persistUser(result);
      } catch (error) {
        console.error('Google sign-in failed:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [googleResponse]);

  async function persistUser(result: { userId: string; email: string; nickname: string | null; imageUrl: string | null }) {
    await AsyncStorage.setItem(USER_ID_KEY, result.userId);
    setApiUserId(result.userId);
    setUser(result);
  }

  async function signInWithApple() {
    if (Platform.OS !== 'ios') return;
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const email = credential.email ?? `${credential.user}@apple.com`;
      const nickname = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      const result = await api.users.signIn({
        provider: 'APPLE',
        providerAccountId: credential.user,
        email,
        nickname: nickname || undefined,
      });
      await persistUser(result);
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        console.error('Apple sign-in failed:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    await googlePromptAsync();
  }

  async function signOut() {
    await AsyncStorage.removeItem(USER_ID_KEY);
    setApiUserId(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signInWithApple, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
