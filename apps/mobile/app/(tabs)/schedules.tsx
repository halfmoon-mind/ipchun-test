import { View, Text, StyleSheet } from 'react-native';

export default function SchedulesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>일정</Text>
      <Text style={styles.empty}>등록된 일정이 없습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
});
