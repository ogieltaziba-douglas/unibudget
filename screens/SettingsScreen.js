import { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal
} from "react-native";
import { AuthContext } from "../store/auth-context"; 
import { db } from "../util/firebase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore"; 
import { Colors } from "../constants/styles"; 

function SettingsScreen() {
  const authCtx = useContext(AuthContext); 
  const userId = authCtx.uid; 
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    } else {
      setError("User is not logged in");
    }
  }, [userId]);

  async function fetchUserData() {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.name || "");
        setUserEmail(userData.email || "");
      } else {
        setError("User data not found");
      }
    } catch (error) {
      setError("An error occurred while fetching user data.");
    } finally {
      setLoading(false);
    }
  }

  // Function to update the user's name in Firebase
  const handleSaveName = async () => {
    if (!userName) {
      Alert.alert("Please enter a name");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { name: userName });
      Alert.alert("Name updated successfully!");
    } catch (error) {
      console.error("Error updating name:", error);
      Alert.alert("Failed to update name.");
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
      {/* <Text style={styles.header}>Settings</Text> */}

      {/* Display user's email and name */}
      <View style={styles.settingItem}>
        <Text>Email:</Text>
        <Text>{userEmail}</Text>
      </View>

      <View style={styles.settingItem}>
        <Text>Name:</Text>
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

      {/* Privacy & GDPR Button */}
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={styles.privacyText}>Privacy & GDPR</Text>
      </TouchableOpacity>

      {/* Privacy & GDPR Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Privacy & GDPR</Text>
            <Text style={styles.modalText}>
              We take your privacy seriously. This app collects minimal user data 
              and adheres to GDPR guidelines. Your personal data is securely stored 
              and never shared with third parties without your consent.
            </Text>
            <Text style={styles.modalText}>
              You have the right to request data deletion at any time by contacting 
              support. For more details, please read our full privacy policy.
            </Text>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  settingItem: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  button: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  privacyText: {
    color: Colors.primary500,
    textAlign: "center",
    marginTop: 30,
    textDecorationLine: "underline",
    fontSize: 16,
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    textAlign: "center",
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

export default SettingsScreen;
