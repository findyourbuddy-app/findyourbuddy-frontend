import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user.display_name}</Text>
      <Text style={styles.email}>{user.email}</Text>
      {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  name: { fontSize: 22, fontWeight: "700" },
  email: { color: "#666", marginTop: 4 },
  bio: { marginTop: 16, fontSize: 16 },
  button: { backgroundColor: "#333", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 32 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
