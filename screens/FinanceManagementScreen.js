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
import TransactionForm from "../components/TransactionForm";

function FinanceManagementScreen() {
  const [transactions, setTransactions] = useState([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
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

  async function handleAddTransaction() {
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
      amount,
      type: transactionType,
      purpose: transactionPurpose,
      category: transactionCategory,
      timestamp: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, "users", userId);
      const docSnapshot = await getDoc(userDocRef);

      if (!docSnapshot.exists()) {
        await setDoc(userDocRef, { transactions: [] });
      }

      await updateDoc(userDocRef, {
        transactions: arrayUnion(transactionData),
      });

      setTransactions((prev) => [transactionData, ...prev]);

      setIsAddModalVisible(false);
      resetTransactionForm();
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  }

  async function handleEditTransaction() {
    if (!editingTransaction) return;

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

    const updatedTransaction = {
      ...editingTransaction,
      amount,
      purpose: transactionPurpose,
      category: transactionCategory,
    };

    try {
      const userDocRef = doc(db, "users", userId);

      await updateDoc(userDocRef, {
        transactions: arrayRemove(editingTransaction),
      });

      await updateDoc(userDocRef, {
        transactions: arrayUnion(updatedTransaction),
      });

      setTransactions((prev) =>
        prev.map((t) =>
          t.timestamp === editingTransaction.timestamp ? updatedTransaction : t
        )
      );

      setIsEditModalVisible(false);
      resetTransactionForm();
    } catch (error) {
      console.error("Error editing transaction:", error);
    }
  }

  function resetTransactionForm() {
    setTransactionAmount("");
    setTransactionPurpose("");
    setTransactionCategory("");
    setTransactionType("");
    setEditingTransaction(null);
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
      <View style={styles.transactionButtonsContainer}>
        <TouchableOpacity
          style={[styles.transactionButton, styles.incomeButton]}
          onPress={() => {
            resetTransactionForm();
            setTransactionType("income");
            setIsAddModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>+ Add Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.transactionButton, styles.expenseButton]}
          onPress={() => {
            resetTransactionForm();
            setTransactionType("expense");
            setIsAddModalVisible(true);
          }}
        >
          <Text style={styles.buttonText}>- Add Expense</Text>
        </TouchableOpacity>
      </View>

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
              setIsEditModalVisible(true);
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

      {/* Add Transaction Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add {transactionType}</Text>
            <TransactionForm
              transactionAmount={transactionAmount}
              transactionPurpose={transactionPurpose}
              transactionCategory={transactionCategory}
              transactionType={transactionType}
              categories={
                transactionType === "income"
                  ? incomeCategories
                  : expenseCategories
              }
              setTransactionAmount={setTransactionAmount}
              setTransactionPurpose={setTransactionPurpose}
              setTransactionCategory={setTransactionCategory}
              onSubmit={handleAddTransaction}
              onCancel={() => setIsAddModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit {transactionType}</Text>
            <TransactionForm
              transactionAmount={transactionAmount}
              transactionPurpose={transactionPurpose}
              transactionCategory={transactionCategory}
              transactionType={transactionType}
              categories={
                transactionType === "income"
                  ? incomeCategories
                  : expenseCategories
              }
              setTransactionAmount={setTransactionAmount}
              setTransactionPurpose={setTransactionPurpose}
              setTransactionCategory={setTransactionCategory}
              onSubmit={handleEditTransaction}
              onCancel={() => setIsEditModalVisible(false)}
            />
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
