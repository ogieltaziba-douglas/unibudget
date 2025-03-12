import { useContext, useEffect, useState, useCallback } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import { Colors } from "../constants/styles";
import { formatDistanceToNow } from "date-fns";
import { Picker } from "@react-native-picker/picker";
import { VictoryPie } from "victory-native";
import TransactionForm from "../components/TransactionForm";

function HomeScreen() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;
  // States:
  // Core user data states
  const [userName, setUserName] = useState("");
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  // Transaction data states
  const [transactions, setTransactions] = useState([]);
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChartModalVisible, setChartModalVisible] = useState(false);
  // Transaction form states
  const [transactionType, setTransactionType] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // Define income and expense categories as simple strings with correct casing
  const incomeCategories = ["Salary", "Gift", "Other"];
  const expenseCategories = [
    "Shopping",
    "Food & Drinks",
    "Bills & Utilities",
    "Entertainment",
    "Rent",
    "Transportation",
    "Travel",
    "Savings",
    "Investments",
    "Others",
  ];

  const categories =
    transactionType === "income" ? incomeCategories : expenseCategories;

  // Subscribe to user document in Firestore in real time.
  useEffect(() => {
    if (!authCtx.loading && userId) {
      const userDocRef = doc(db, "users", userId);

      const unsubscribe = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setDoc(userDocRef, {
              balance: 0,
              transactions: [],
              name: "User",
            }).catch((error) =>
              console.error("Error creating user document:", error)
            );
            setUserName("User");
            setBalance(0);
            setTransactions([]);
            setIncome(0);
            setExpenses(0);
            return;
          }

          const userData = snapshot.data();
          setUserName(userData.name || "User");
          setBalance(userData.balance || 0);

          const allTransactions = userData.transactions || [];

          // Sort transactions (most recent first)
          allTransactions.sort(
            (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
          );

          // Show only 8 most recent transactions
          setTransactions(allTransactions.slice(0, 8));

          // Calculate total income & expenses
          let totalIncome = 0;
          let totalExpenses = 0;
          for (const tx of allTransactions) {
            if (tx.type === "income") {
              totalIncome += tx.amount;
            } else {
              totalExpenses += tx.amount;
            }
          }
          setIncome(totalIncome);
          setExpenses(totalExpenses);
        },
        (error) => {
          console.error("Error subscribing to user data:", error);
          setErrorMessage("Failed to load user data. Please try again.");
        }
      );

      return () => unsubscribe();
    }
  }, [authCtx.loading, userId]);

  if (authCtx.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Unable to load user data. Please try logging in again.
        </Text>
      </View>
    );
  }

  function openTransactionModal(type) {
    setTransactionType(type);
    setIsModalVisible(true);
  }

  // Add transaction handler
  async function handleAddTransaction() {
    const amount = parseFloat(transactionAmount);
    if (
      isNaN(amount) ||
      amount <= 0 ||
      !transactionPurpose.trim() ||
      !transactionCategory
    ) {
      setErrorMessage("Please enter a valid amount, purpose, and category.");
      return;
    }
    const transactionData = {
      amount,
      type: transactionType,
      purpose: transactionPurpose.trim(),
      category: transactionCategory,
      timestamp: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, "users", userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        let currentBalance = 0;
        if (!userDoc.exists()) {
          transaction.set(userDocRef, {
            balance: 0,
            transactions: [],
          });
        } else {
          currentBalance = userDoc.data().balance || 0;
        }
        const newBalance =
          transactionType === "income"
            ? currentBalance + amount
            : currentBalance - amount;

        transaction.update(userDocRef, {
          balance: newBalance,
          transactions: arrayUnion(transactionData),
        });
      });

      setIsModalVisible(false);
      setTransactionAmount("");
      setTransactionPurpose("");
      setTransactionCategory("");
      setErrorMessage("");
    } catch (error) {
      console.error("Error adding transaction:", error);
      setErrorMessage(
        "An error occurred while adding the transaction. Please try again."
      );
    }
  }

  // Renders the income vs. expenses chart (VictoryPie).
  const renderIncomeExpensePie = useCallback(() => {
    if ((income === 0 && expenses === 0) || isNaN(income) || isNaN(expenses)) {
      return (
        <Text style={styles.chartInfoText}>
          No transaction data to display yet.
        </Text>
      );
    }
    const data = [
      { x: "Income", y: income },
      { x: "Expenses", y: expenses },
    ];
    return (
      <VictoryPie
        data={data}
        colorScale={["#4caf50", "#f44336"]}
        innerRadius={50}
        labels={({ datum }) => `${datum.x}: £${datum.y.toLocaleString()}`}
        style={{
          labels: { fontSize: 14, fill: "#333" },
        }}
      />
    );
  }, [income, expenses]);

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        {userName ? `Welcome ${userName},` : "Welcome User,"}
      </Text>

      {/* Balance Card */}
      <TouchableOpacity
        style={styles.balanceContainer}
        onPress={() => setChartModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.balance}>£{balance.toLocaleString()}</Text>
        <View style={styles.incomeExpenseContainer}>
          <Text style={styles.income}>Income: £{income.toLocaleString()}</Text>
          <Text style={styles.expense}>Expenses: £{expenses.toLocaleString()}</Text>
        </View>
        <Text style={styles.tapForChartText}>
          Tap for Income vs Expense Chart
        </Text>
      </TouchableOpacity>

      {/* Transaction Buttons */}
      <View style={styles.transactionButtonsContainer}>
        <TouchableOpacity
          style={[styles.transactionButton, styles.incomeButton]}
          onPress={() => openTransactionModal("income")}
        >
          <Text style={styles.buttonText}>+ Add Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.transactionButton, styles.expenseButton]}
          onPress={() => openTransactionModal("expense")}
        >
          <Text style={styles.buttonText}>- Add Expense</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Recent Transactions:</Text>
      <FlatList
        data={transactions}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.transaction}>
            <Text>
              {item.type === "income" ? "+" : "-"}£{item.amount.toFixed(2)}
            </Text>
            <Text style={styles.purposeText}>
              {item.purpose}
            </Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(item.timestamp))} ago
            </Text>
          </View>
        )}
      />

      {/* Transaction Modal using TransactionForm */}
      <Modal visible={isModalVisible} animationType="slide  " transparent>
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
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
                  onCancel={() => setIsModalVisible(false)}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Chart Modal */}
      <Modal
        visible={isChartModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setChartModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setChartModalVisible(false)}>
          <View style={styles.chartModalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.chartModalContent}>
                <Text style={styles.modalTitle}>Income vs. Expenses</Text>
                {renderIncomeExpensePie()}
                <TouchableOpacity
                  style={[styles.modalButton, { marginTop: 20 }]}
                  onPress={() => setChartModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "left",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 8,
  },
  balanceContainer: {
    backgroundColor: Colors.primary500,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  balance: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  incomeExpenseContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 12,
  },
  income: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  expense: {
    color: "#f44336",
    fontWeight: "bold",
  },
  tapForChartText: {
    marginTop: 8,
    color: "#fff",
    fontStyle: "italic",
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
    marginHorizontal: 8,
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
  purposeText: {
    fontSize: 14,
    justifyContent: "center",
    color: "#333",
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
  chartModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  chartModalContent: {
    width: 320,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    alignItems: "center",
  },
  chartInfoText: {
    fontSize: 16,
    color: "#555",
    marginVertical: 8,
    textAlign: "center",
  },
});