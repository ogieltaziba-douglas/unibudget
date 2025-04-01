import { useContext, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
} from "react-native";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
} from "firebase/firestore";
import { Colors } from "../constants/styles";
import TransactionForm from "../components/TransactionForm";

const incomeCategories = ["Salary", "Gift", "Other"];
const expenseCategories = [
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

function FinanceManagementScreen() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const allCategories = [
    "All",
    ...new Set([...incomeCategories, ...expenseCategories]),
  ];

  // Subscribe to the user document in Firestore to get transactions and balance.
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const userDocRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const sortedTransactions = (data.transactions || []).sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );
          setTransactions(sortedTransactions);
          setBalance(data.balance || 0);
        } else {
          setDoc(userDocRef, { transactions: [], balance: 0 }).catch((err) =>
            console.error("Error creating user document:", err)
          );
          setTransactions([]);
          setBalance(0);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  function resetTransactionForm() {
    setTransactionAmount("");
    setTransactionPurpose("");
    setTransactionCategory("");
    setTransactionType("");
    setEditingTransaction(null);
  }

  // Add transaction handler
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
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        let currentBalance = 0;
        if (!userDoc.exists()) {
          transaction.set(userDocRef, { transactions: [], balance: 0 });
        } else {
          currentBalance = userDoc.data().balance || 0;
        }
        const newBalance =
          transactionType === "income"
            ? currentBalance + amount
            : currentBalance - amount;
        transaction.update(userDocRef, {
          transactions: arrayUnion(transactionData),
          balance: newBalance,
        });
      });
      setIsAddModalVisible(false);
      resetTransactionForm();
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  }

  // Edit transaction handler
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
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentBalance = userDoc.data().balance || 0;
        const oldEffect =
          editingTransaction.type === "income"
            ? editingTransaction.amount
            : -editingTransaction.amount;
        const newEffect = transactionType === "income" ? amount : -amount;
        const diff = newEffect - oldEffect;
        const newBalance = currentBalance + diff;
        transaction.update(userDocRef, {
          transactions: arrayRemove(editingTransaction),
        });
        transaction.update(userDocRef, {
          transactions: arrayUnion(updatedTransaction),
          balance: newBalance,
        });
      });
      setIsEditModalVisible(false);
      resetTransactionForm();
    } catch (error) {
      console.error("Error editing transaction:", error);
    }
  }

  // Delete transaction handler
  async function handleDeleteTransaction() {
    if (!editingTransaction) return;
    try {
      const userDocRef = doc(db, "users", userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const currentBalance = userDoc.data().balance || 0;
        const effect =
          editingTransaction.type === "income"
            ? editingTransaction.amount
            : -editingTransaction.amount;
        const newBalance = currentBalance - effect;
        transaction.update(userDocRef, {
          transactions: arrayRemove(editingTransaction),
          balance: newBalance,
        });
      });
      setIsEditModalVisible(false);
      resetTransactionForm();
    } catch (error) {
      console.error("Error deleting transaction:", error);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  // Filter transactions based on selected category.
  const filteredTransactions =
    selectedCategory === "All"
      ? transactions
      : transactions.filter((tx) => tx.category === selectedCategory);

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

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.activeFilterButton,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategory === category && { color: "#fff" },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.subtitle}>
        {selectedCategory === "All"
          ? "All Transactions:"
          : `${selectedCategory} Transactions:`}
      </Text>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(_, index) => index.toString()}
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
            <Text>
              {item.purpose} - {item.category}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Add Transaction Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsAddModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
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
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsEditModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
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
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#f44336" }]}
                  onPress={handleDeleteTransaction}
                >
                  <Text style={styles.modalButtonText}>Delete Transaction</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 8,
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
    marginHorizontal: 5,
    marginVertical: 0,
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
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#ddd",
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: Colors.primary500,
  },
  filterButtonText: {
    color: "#000",
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
