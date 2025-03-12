import { useState, useEffect, useContext, useMemo } from "react";
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
  TouchableWithoutFeedback,
} from "react-native";
import { db } from "../util/firebase";
import { AuthContext } from "../store/auth-context";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Colors } from "../constants/styles";
import { Picker } from "@react-native-picker/picker";

/** Budget categories available for selection */
const budgetCategories = [
  "Shopping",
  "Food & Drinks",
  "Rent",
  "Bills & Utilities",
  "Entertainment",
  "Transportation",
  "Travel",
  "Savings",
  "Investments",
  "Others",
];

/**
 * Helper to normalize a timestamp.
 * If the timestamp is a string, we create a new Date from it.
 * If it's a Firestore Timestamp (with a toDate method or seconds property), we convert accordingly.
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
}

function BudgetManagementScreen() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;
  // State for budgets
  const [budgets, setBudgets] = useState([]);
  // States for user data from the main user doc
  const [userBalance, setUserBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  // Loading state
  const [loading, setLoading] = useState(true);
  // States for Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  // States for Form fields for budget creation/editing
  const [budgetCategory, setBudgetCategory] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPurpose, setBudgetPurpose] = useState("");
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Subscribe in real time to the budgets subcollection
  useEffect(() => {
    if (!userId) return;
    const budgetRef = collection(db, "users", userId, "budgets");
    const unsubscribeBudgets = onSnapshot(
      budgetRef,
      (snapshot) => {
        const budgetList = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        }));
        setBudgets(budgetList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching budgets:", error);
        setLoading(false);
      }
    );
    return () => unsubscribeBudgets();
  }, [userId]);

  // Subscribe in real time to the user document to get balance and transactions
  useEffect(() => {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    const unsubscribeUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setDoc(userDocRef, {
            balance: 0,
            transactions: [],
            name: "User",
          }).catch((error) =>
            console.error("Error creating user document:", error)
          );
          setUserBalance(0);
          setTransactions([]);
          return;
        }
        const data = docSnap.data();
        setUserBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      },
      (error) => {
        console.error("Error subscribing to user data:", error);
      }
    );
    return () => unsubscribeUser();
  }, [userId]);

  // Calculate available balance (userBalance minus sum of allocated budgets)
  const availableBalance = useMemo(() => {
    const totalBudgetAmount = budgets.reduce(
      (total, budget) => total + budget.amount,
      0
    );
    return userBalance - totalBudgetAmount;
  }, [userBalance, budgets]);

  // Validate that amount is positive
  function isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
  }

  function resetForm() {
    setBudgetCategory("");
    setBudgetAmount("");
    setBudgetPurpose("");
    setSelectedBudget(null);
  }

  /**
   * Helper: Calculate the total spent for a budget category,
   * considering only expense transactions with a timestamp
   * on or after the budget's creation timestamp.
   */
  function getSpentForCategorySince(category, budgetTimestamp) {
    if (!budgetTimestamp) return 0;
    const budgetDate = normalizeTimestamp(budgetTimestamp);
    return transactions
      .filter((tx) => {
        if (tx.type !== "expense" || tx.category !== category) return false;
        const txDate = normalizeTimestamp(tx.timestamp);
        return txDate >= budgetDate; // Only count expense transactions after budget creation
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  // Create budget handler
  async function handleCreateBudget() {
    if (!budgetCategory || !budgetAmount || !budgetPurpose) {
      Alert.alert("Validation Error", "All fields are required");
      return;
    }
    if (!isValidAmount(budgetAmount)) {
      Alert.alert(
        "Validation Error",
        "Enter a valid positive number for amount"
      );
      return;
    }
    if (parseFloat(budgetAmount) > userBalance) {
      Alert.alert(
        "Validation Error",
        "Budget amount cannot exceed your balance."
      );
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
      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Error adding budget:", error);
      Alert.alert("Error", "Failed to create budget. Please try again.");
    }
  }

  // Update budget handler
  async function handleUpdateBudget() {
    if (!selectedBudget || !budgetCategory || !budgetAmount || !budgetPurpose) {
      Alert.alert("Validation Error", "All fields are required");
      return;
    }
    if (!isValidAmount(budgetAmount)) {
      Alert.alert(
        "Validation Error",
        "Enter a valid positive number for amount"
      );
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
      setIsEditModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Error updating budget:", error);
      Alert.alert("Error", "Failed to update budget. Please try again.");
    }
  }

  // Delete budget handler
  async function handleDeleteBudget() {
    if (!selectedBudget) return;
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const budgetRef = doc(
                db,
                "users",
                userId,
                "budgets",
                selectedBudget.id
              );
              await deleteDoc(budgetRef);
              setIsEditModalVisible(false);
              resetForm();
            } catch (error) {
              console.error("Error deleting budget:", error);
              Alert.alert(
                "Error",
                "Failed to delete budget. Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function dismissModal(setModalVisibility) {
    setModalVisibility(false);
    resetForm();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.availableBalance}>
        Available Balance: £{availableBalance}
      </Text>
      {budgets.length === 0 ? (
        <Text style={styles.noBudgetText}>
          No budgets created. Create a new budget!
        </Text>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id || item.timestamp?.toString()}
          renderItem={({ item }) => {
            const spent = getSpentForCategorySince(
              item.category,
              item.timestamp
            );
            const remaining = item.amount - spent;
            const percentUsed = (spent / item.amount) * 100;
            return (
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
                <Text style={styles.budgetText}>
                  {item.purpose} - £{item.amount}
                </Text>

                <Text style={styles.budgetText}>
                  Spent: £{spent} | Remaining:{" "}
                  <Text
                    style={
                      remaining < 0
                        ? styles.remainingOverBudget
                        : percentUsed >= 75
                        ? styles.remainingWarning
                        : styles.remainingNormal
                    }
                  >
                    £{remaining}
                  </Text>
                </Text>
                {percentUsed >= 75 && remaining >= 0 && (
                  <Text style={styles.warningText}>
                    Warning: You've used {Math.round(percentUsed)}% of your
                    budget!
                  </Text>
                )}
                {remaining < 0 && (
                  <Text style={styles.overBudgetText}>
                    You have exceeded your budget!
                  </Text>
                )}
                <Text style={styles.budgetText}>Category: {item.category}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Budget</Text>
      </TouchableOpacity>

      {/* Create Budget Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => dismissModal(setIsModalVisible)}
      >
        <TouchableWithoutFeedback
          onPress={() => dismissModal(setIsModalVisible)}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Create Budget</Text>
                <Picker
                  selectedValue={budgetCategory}
                  onValueChange={setBudgetCategory}
                  style={styles.input}
                >
                  <Picker.Item label="Select Category" value="" />
                  {budgetCategories.map((category) => (
                    <Picker.Item
                      key={category}
                      label={category}
                      value={category}
                    />
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
                  onPress={() => dismissModal(setIsModalVisible)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => dismissModal(setIsEditModalVisible)}
      >
        <TouchableWithoutFeedback
          onPress={() => dismissModal(setIsEditModalVisible)}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Budget</Text>
                <Picker
                  selectedValue={budgetCategory}
                  onValueChange={setBudgetCategory}
                  style={styles.input}
                >
                  <Picker.Item label="Select Category" value="" />
                  {budgetCategories.map((category) => (
                    <Picker.Item
                      key={category}
                      label={category}
                      value={category}
                    />
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
                  onPress={() => dismissModal(setIsEditModalVisible)}
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  budgetItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  budgetText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  remainingNormal: {
    color: "#333",
  },
  remainingWarning: {
    color: "orange",
    fontWeight: "bold",
  },
  remainingOverBudget: {
    color: "red",
    fontWeight: "bold",
  },
  warningText: {
    color: "orange",
    fontSize: 14,
    fontWeight: "bold",
  },
  overBudgetText: {
    color: "red",
    fontSize: 14,
    fontWeight: "bold",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
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
});
