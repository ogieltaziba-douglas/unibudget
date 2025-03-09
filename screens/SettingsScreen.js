import { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { Colors } from "../constants/styles";

const APP_VERSION = "1.0.0";

function SettingsScreen() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  // Local state for user data and UI
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [tosModalVisible, setTosModalVisible] = useState(false);

  useEffect(() => {
    if (!userId) {
      setError("User is not logged in");
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserName(data.name || "");
          setUserEmail(data.email || "");
          setError(null);
        } else {
          setDoc(userDocRef, {
            name: "",
            email: "",
            balance: 0,
            transactions: [],
          }).catch((err) =>
            console.error("Error creating user document:", err)
          );
          setError("User data not found");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching user data:", err);
        setError("An error occurred while fetching user data.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Save name handler
  const handleSaveName = async () => {
    if (!userName.trim()) {
      Alert.alert("Validation", "Please enter a name.");
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { name: userName });
      Alert.alert("Success", "Name updated successfully!");
    } catch (err) {
      console.error("Error updating name:", err);
      Alert.alert("Error", "Failed to update name.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{userEmail}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSaveName}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Save Name</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.button} onPress={authCtx.logout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>

        {/* Privacy & GDPR */}
        <TouchableOpacity onPress={() => setPrivacyModalVisible(true)}>
          <Text style={styles.privacyText}>Privacy & GDPR</Text>
        </TouchableOpacity>

        {/* Terms of Service */}
        <TouchableOpacity onPress={() => setTosModalVisible(true)}>
          <Text style={styles.privacyText}>Terms of Service</Text>
        </TouchableOpacity>
      </View>

      {/* BOTTOM CONTENT: APP VERSION */}
      <View>
        <Text style={styles.versionText}>App Version: {APP_VERSION}</Text>
      </View>

      {/* Privacy & GDPR Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Privacy & GDPR</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>
                We take your privacy seriously. This app collects minimal user
                data and adheres to GDPR guidelines. Your personal data is
                securely stored and never shared with third parties without your
                consent.
              </Text>
              <Text style={styles.modalText}>
                You have the right to request data deletion at any time by
                contacting support. For more details, please read our full
                privacy policy.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={tosModalVisible}
        onRequestClose={() => setTosModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>
                By using this app, you agree to our Terms of Service. All
                transactions and data are provided "as is" without warranty of
                any kind. You acknowledge that the app is not liable for any
                data loss or errors. You agree to use the app responsibly and
                understand that any breach of these terms may result in
                termination of your account.
              </Text>
              <Text style={styles.modalText}>
                Please review these terms carefully before continuing. If you do
                not agree with our policies, please discontinue use of this app.
                Your continued use of the app constitutes your acceptance of
                these terms.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setTosModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
    justifyContent: "space-between",
  },
  settingItem: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  value: {
    fontSize: 16,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  privacyText: {
    color: Colors.primary500,
    textAlign: "center",
    marginTop: 30,
    textDecorationLine: "underline",
    fontSize: 16,
  },
  versionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: "left",
    marginBottom: 10,
  },
  modalButton: {
    marginTop: 15,
    backgroundColor: Colors.primary500,
    padding: 10,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
