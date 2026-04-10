import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../src/contexts/AuthContext';

export default function SignInScreen() {
  const { user, isLoading, signInWithApple, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>IPCHUN</Text>
        <Text style={styles.tagline}>인디 아티스트 팬을 위한 공연 트래커</Text>
      </View>

      <View style={styles.actions}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={0}
            style={styles.appleButton}
            onPress={signInWithApple}
          />
        )}

        <Pressable style={styles.googleButton} onPress={signInWithGoogle}>
          <Text style={styles.googleButtonText}>Google로 계속하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDFCF9',
  },
  container: {
    flex: 1,
    backgroundColor: '#FDFCF9',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brand: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 48,
    color: '#1A1A1A',
    letterSpacing: -2,
  },
  tagline: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#777777',
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  appleButton: {
    height: 52,
    width: '100%',
  },
  googleButton: {
    height: 52,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontFamily: 'Pretendard-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
