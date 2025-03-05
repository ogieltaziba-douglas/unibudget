import { useState, useEffect, useContext } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { db } from "../util/firebase";
import { AuthContext } from "../store/auth-context";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Colors } from "../constants/styles";
import { Picker } from "@react-native-picker/picker";

const budgetCategories = [
  "Food & Drinks",
  "Entertainment",
  "Shopping",
  "Rent",
  "Bills",
  "Transportation",
  "Travel",
  "Savings",
  "Investments",
  "Other",
];

function BudgetManagementScreen() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPurpose, setBudgetPurpose] = useState("");
  const [userBalance, setUserBalance] = useState(0);
  const [selectedBudget, setSelectedBudget] = useState(null);

  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  // Fetch budgets and user balance when userId changes (after login)
  useEffect(() => {
    if (userId) {
      fetchBudgets();
      fetchUserBalance();
    }
  }, [userId]);

  async function fetchBudgets() {
    setLoading(true);
    try {
      const budgetRef = collection(db, "users", userId, "budgets");
      const budgetSnapshot = await getDocs(budgetRef);
      const budgetList = budgetSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id, // Adding Firestore document id
      }));
      setBudgets(budgetList); // Update the state with fetched budgets
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch user balance from Firestore
  async function fetchUserBalance() {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserBalance(userData.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching user balance:", error);
    }
  }

  // Handle budget creation
  async function handleCreateBudget() {
    if (!budgetCategory || !budgetAmount || !budgetPurpose) {
      Alert.alert("All fields are required");
      return;
    }

    if (parseFloat(budgetAmount) > userBalance) {
      Alert.alert("Budget amount cannot exceed your balance.");
      return;
    }

    const newBudget = {
      category: budgetCategory,
      amount: parseFloat(budgetAmount),
      purpose: budgetPurpose,
      timestamp: serverTimestamp(),
    };

    try {
      const budgetRef = collection(db, "users", userId, "budgets");
      await addDoc(budgetRef, newBudget);

      setBudgets((prev) => [...prev, newBudget]);
      setIsModalVisible(false);
      setBudgetCategory("");
      setBudgetAmount("");
      setBudgetPurpose("");
    } catch (error) {
      console.error("Error adding budget:", error);
    }
  }

  // Handle budget deletion
  async function handleDeleteBudget() {
    if (!selectedBudget) return;

    try {
      const budgetRef = doc(db, "users", userId, "budgets", selectedBudget.id);
      await deleteDoc(budgetRef);

      setBudgets((prev) => prev.filter((budget) => budget.id !== selectedBudget.id));
      setIsEditModalVisible(false);
      setSelectedBudget(null);
    } catch (error) {
      console.error("Error deleting budget:", error);
    }
  }

  // Handle budget update
  async function handleUpdateBudget() {
    if (!selectedBudget || !budgetCategory || !budgetAmount || !budgetPurpose) {
      Alert.alert("All fields are required");
      return;
    }

    try {
      const budgetRef = doc(db, "users", userId, "budgets", selectedBudget.id);
      await updateDoc(budgetRef, {
        category: budgetCategory,
        amount: parseFloat(budgetAmount),
        purpose: budgetPurpose,
        timestamp: serverTimestamp(),
      });

      setBudgets((prev) =>
        prev.map((budget) =>
          budget.id === selectedBudget.id
            ? { ...budget, category: budgetCategory, amount: parseFloat(budgetAmount), purpose: budgetPurpose }
            : budget
        )
      );

      setIsEditModalVisible(false);
      setSelectedBudget(null);
      setBudgetCategory("");
      setBudgetAmount("");
      setBudgetPurpose("");
    } catch (error) {
      console.error("Error updating budget:", error);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  const availableBalance = userBalance - budgets.reduce((total, budget) => total + budget.amount, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.availableBalance}>Available Balance: £{availableBalance}</Text>
      {budgets.length === 0 ? (
        <Text style={styles.noBudgetText}>
          No budgets created. Create a new budget!
        </Text>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id || item.timestamp.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.budgetItem}
              onPress={() => {
                setSelectedBudget(item);
                setBudgetCategory(item.category);
                setBudgetAmount(item.amount.toString());
                setBudgetPurpose(item.purpose);
                setIsEditModalVisible(true);
              }}
            >
              <Text>{item.category} - £{item.amount}</Text>
              <Text>{item.purpose}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Budget</Text>
      </TouchableOpacity>

      {/* Create Budget Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Budget</Text>
            <Picker
              selectedValue={budgetCategory}
              onValueChange={setBudgetCategory}
              style={styles.input}
            >
              {budgetCategories.map((category) => (
                <Picker.Item key={category} label={category} value={category} />
              ))}
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter purpose"
              value={budgetPurpose}
              onChangeText={setBudgetPurpose}
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCreateBudget}
            >
              <Text style={styles.modalButtonText}>Create Budget</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#ccc" }]}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Budget</Text>
            <Picker
              selectedValue={budgetCategory}
              onValueChange={setBudgetCategory}
              style={styles.input}
            >
              {budgetCategories.map((category) => (
                <Picker.Item key={category} label={category} value={category} />
              ))}
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              value={budgetAmount}
              onChangeText={setBudgetAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter purpose"
              value={budgetPurpose}
              onChangeText={setBudgetPurpose}
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleUpdateBudget}
            >
              <Text style={styles.modalButtonText}>Update Budget</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#ccc" }]}
              onPress={() => setIsEditModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#f00" }]}
              onPress={handleDeleteBudget}
            >
              <Text style={styles.modalButtonText}>Delete Budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default BudgetManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  availableBalance: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  noBudgetText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
    textAlign: "center",
    marginBottom: 20,
  },
  createButton: {
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
  budgetItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

