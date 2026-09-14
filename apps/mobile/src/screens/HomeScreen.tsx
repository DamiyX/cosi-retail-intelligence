import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { appEnvironment } from '../config/environment';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>COSI · {appEnvironment}</Text>
      <Text accessibilityRole="header" style={styles.title}>Welcome</Text>
      <Text style={styles.body}>Your retail workspace starts here.</Text>
      <Text style={styles.body}>This early build is ready to explore. Business tools will arrive in future versions.</Text>
      <Link href="/about" style={styles.link}>About this app</Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: '#F7F8F5' },
  label: { color: '#41534C', fontSize: 14 },
  title: { color: '#17251F', fontSize: 32, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28, maxWidth: 560 },
  link: { color: '#174F46', fontSize: 18, fontWeight: '600', paddingVertical: 16, textDecorationLine: 'underline' },
});
