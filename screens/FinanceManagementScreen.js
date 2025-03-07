import { useContext, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { Colors } from "../constants/styles";
import { Picker } from "@react-native-picker/picker";

function FinanceManagementScreen() {
  const [transactions, setTransactions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  const incomeCategories = ["Salary", "Gift", "Other"];
  const expenseCategories = [
    "Shopping",
    "Food & drinks",
    "Bills & Utilities",
    "Entertainment",
    "Others",
  ];

  // Fetch the user's transactions
  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const sortedTransactions = (userData.transactions || []).sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );

        setTransactions(sortedTransactions);
      } else {
        console.log("No transactions found.");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  // Handle adding or editing a transaction (income or expense)
  async function handleAddOrEditTransaction() {
    const amount = parseFloat(transactionAmount);

    if (
      isNaN(amount) ||
      amount <= 0 ||
      !transactionPurpose ||
      !transactionCategory
    ) {
      console.error("Please enter a valid amount, purpose, and category.");
      return;
    }

    const transactionData = {
      amount: amount,
      type: transactionType,
      purpose: transactionPurpose,
      category: transactionCategory,
      timestamp: editingTransaction
        ? editingTransaction.timestamp
        : new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, "users", userId);
      const docSnapshot = await getDoc(userDocRef);

      if (!docSnapshot.exists()) {
        console.error("User document does not exist. Initializing document...");
        await setDoc(userDocRef, {
          transactions: [],
        });
      }

      if (editingTransaction) {
        // Update the existing transaction in Firestore without modifying the timestamp
        await updateDoc(userDocRef, {
          transactions: arrayRemove(editingTransaction),
        });
      }

      await updateDoc(userDocRef, {
        transactions: arrayUnion(transactionData),
      });

      setTransactions((prev) =>
        [...prev.filter((t) => t !== editingTransaction), transactionData].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      );

      // // Update local state
      // if (editingTransaction) {
      //   setTransactions((prev) => {
      //     return prev.map((item) =>
      //       item.timestamp === editingTransaction.timestamp
      //         ? transactionData
      //         : item
      //     );
      //   });
      // } else {
      //   setTransactions((prev) => [...prev, transactionData]);
      // }

      setIsModalVisible(false);
      setTransactionAmount("");
      setTransactionPurpose("");
      setTransactionCategory("");
      setEditingTransaction(null);
    } catch (error) {
      console.error("Error adding/updating transaction:", error);
    }
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
      {/* Buttons to Add Income and Expense */}
      <View style={styles.transactionButtonsContainer}>
        <TouchableOpacity
          style={[styles.transactionButton, styles.incomeButton]}
          onPress={() => {
            setTransactionType("income");
            setIsModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>+ Add Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.transactionButton, styles.expenseButton]}
          onPress={() => {
            setTransactionType("expense");
            setIsModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>- Add Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Display Recent Transactions */}
      <Text style={styles.subtitle}>All Transactions:</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.transaction}
            onPress={() => {
              setEditingTransaction(item);
              setTransactionAmount(item.amount.toString());
              setTransactionPurpose(item.purpose);
              setTransactionCategory(item.category);
              setTransactionType(item.type);
              setIsModalVisible(true);
            }}
          >
            <Text>
              {item.type === "income" ? "+" : "-"}£{item.amount.toFixed(2)}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <Text>
              {item.purpose} - {item.category}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal for adding or editing income/expense */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {transactionType === "income" ? "Add Income" : "Add Expense"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              value={transactionAmount}
              onChangeText={setTransactionAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter purpose"
              value={transactionPurpose}
              onChangeText={setTransactionPurpose}
            />

            {/* Category Picker */}
            <Picker
              selectedValue={transactionCategory}
              onValueChange={setTransactionCategory}
              style={styles.input}
            >
              {(transactionType === "income"
                ? incomeCategories
                : expenseCategories
              ).map((category) => (
                <Picker.Item key={category} label={category} value={category} />
              ))}
            </Picker>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleAddOrEditTransaction}
            >
              <Text style={styles.modalButtonText}>Add</Text>
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
    </View>
  );
}

export default FinanceManagementScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timestamp: {
    color: "#888",
    fontSize: 12,
  },
  transactionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  transactionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  incomeButton: {
    backgroundColor: "#4caf50",
  },
  expenseButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
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
    backgroundColor: "#4caf50",
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
