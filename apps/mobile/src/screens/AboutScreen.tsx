import { ScrollView, StyleSheet, Text } from 'react-native';

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>About COSI</Text>
      <Text style={styles.body}>COSI is the working name for a retail tool that helps you understand daily business activity and changing restock costs.</Text>
      <Text style={styles.body}>This foundation build contains no business records. Use the back button to return to the welcome screen.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 30, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28, maxWidth: 560 },
});
