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
  Dimensions,
  TextInput,
} from "react-native";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { AuthContext } from "../store/auth-context";
import { db } from "../util/firebase";
import { Colors } from "../constants/styles";
import { formatDistanceToNow } from "date-fns";
import { Picker } from "@react-native-picker/picker";
import TransactionForm from "../components/TransactionForm";
import { PieChart } from "react-native-chart-kit";

function HomeScreen() {
  const authCtx = useContext(AuthContext);
  const userId = authCtx.uid;

  const [userName, setUserName] = useState("");
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isChartModalVisible, setChartModalVisible] = useState(false);
  const [chartModalPage, setChartModalPage] = useState(1);
  const [transactionType, setTransactionType] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [transactionCategory, setTransactionCategory] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBalanceModalVisible, setIsBalanceModalVisible] = useState(false);
  const [newBalanceValue, setNewBalanceValue] = useState("");

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

  // Firestore subscription
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

  // Add transaction
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

  function openBalanceModal() {
    setNewBalanceValue(""); // Clear any old input
    setIsBalanceModalVisible(true);
  }

  function closeBalanceModal() {
    setIsBalanceModalVisible(false);
  }

  async function handleEditBalance() {
    const newVal = parseFloat(newBalanceValue);
    if (isNaN(newVal)) {
      Alert.alert(
        "Invalid Input",
        "Please enter a valid number for the new balance."
      );
      return;
    }

    const currentNet = income - expenses;
    const differnce = newVal - currentNet;

    const adjustmentTx = {
      amount: Math.abs(differnce),
      type: differnce >= 0 ? "income" : "expense",
      purpose: "Balance Adjustment",
      category: "Adjustment",
      timestamp: new Date().toISOString(),
    };

    try {
      const userDocRef = doc(db, "users", userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) {
          transaction.set(userDocRef, {
            balance: newVal,
            transactions: [adjustmentTx],
            name: userName || "User",
          });
        } else {
          const oldData = userDoc.data();
          const updatedTransactions = [
            ...(oldData.transactions || []),
            adjustmentTx,
          ];
          transaction.update(userDocRef, {
            balance: newVal,
            transactions: updatedTransactions,
          });
        }
      });

      setIsBalanceModalVisible(false);
      setNewBalanceValue("");
    } catch (error) {
      console.error("Error updating balance:", error);
      Alert.alert("Error", "Could not update balance. Please try again.");
    }
  }

  useEffect(() => {
    if (!isChartModalVisible) {
      setChartModalPage(1);
    }
  }, [isChartModalVisible]);

  const total = income + expenses;
  const incomePercentage = total > 0 ? (income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (expenses / total) * 100 : 0;
  const net = income - expenses;

  const screenWidth = Dimensions.get("window").width;
  const renderBalancePie = useCallback(() => {
    if ((income === 0 && expenses === 0) || isNaN(income) || isNaN(expenses)) {
      return (
        <Text style={styles.chartInfoText}>
          No transaction data to display yet.
        </Text>
      );
    }

    const data = [
      {
        name: `Income`,
        population: income,
        color: "#4caf50",
        legendFontColor: "#4caf50",
        legendFontSize: 14,
      },
      {
        name: `Expenses`,
        population: expenses,
        color: "#f44336",
        legendFontColor: "#f44336",
        legendFontSize: 14,
      },
    ];

    return (
      <PieChart
        data={data}
        width={screenWidth * 0.8}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#6a11cb",
          backgroundGradientTo: "#2575fc",
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        center={[0, 0]}
        absolute={false}
      />
    );
  }, [income, expenses, screenWidth]);

  const renderIncomePie = useCallback(() => {
    const incomeTransactions = transactions.filter(
      (tx) => tx.type === "income"
    );

    if (incomeTransactions.length === 0) {
      return <Text>No income transactions to display yet.</Text>;
    }

    let salary = 0;
    let gift = 0;
    let other = 0;

    incomeTransactions.forEach((tx) => {
      if (tx.category === "Salary") {
        salary += tx.amount;
      } else if (tx.category === "Gift") {
        gift += tx.amount;
      } else {
        other += tx.amount;
      }
    });

    const totalIncome = salary + gift + other;
    if (totalIncome === 0) {
      return <View>No Income data to display yet.</View>;
    }

    const data = [
      {
        name: "Salary",
        population: salary,
        color: "#4caf50",
        legendFontColor: "#4caf50",
        legendFontSize: 14,
      },
      {
        name: "Gift",
        population: gift,
        color: "#2196F3",
        legendFontColor: "#2196F3",
        legendFontSize: 14,
      },
      {
        name: "Other",
        population: other,
        color: "#FF9800",
        legendFontColor: "#FF9800",
        legendFontSize: 14,
      },
    ];

    return (
      <PieChart
        data={data}
        width={screenWidth * 0.8}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#6a11cb",
          backgroundGradientTo: "#2575fc",
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        center={[0, 0]}
        absolute={false}
      />
    );
  }, [transactions, screenWidth]);

  const renderExpensePie = useCallback(() => {
    const expenseTransactions = transactions.filter(
      (tx) => tx.type === "expense"
    );

    if (expenseTransactions.length === 0) {
      return (
        <Text style={styles.chartInfoText}>
          No expense transactions to display yet.
        </Text>
      );
    }

    let shopping = 0;
    let foodDrinks = 0;
    let billsUtilities = 0;
    let entertainment = 0;
    let transportation = 0;
    let travel = 0;
    let savings = 0;
    let investments = 0;
    let others = 0;

    expenseTransactions.forEach((tx) => {
      if (tx.category === "Shopping") {
        shopping += tx.amount;
      } else if (tx.category === "Food & Drinks") {
        foodDrinks += tx.amount;
      } else if (tx.category === "Bills & Utilities") {
        billsUtilities += tx.amount;
      } else if (tx.category === "Entertainment") {
        entertainment += tx.amount;
      } else if (tx.category === "Transportation") {
        transportation += tx.amount;
      } else if (tx.category === "Travel") {
        travel += tx.amount;
      } else if (tx.category === "Savings") {
        savings += tx.amount;
      } else if (tx.category === "Investments") {
        investments += tx.amount;
      } else {
        others += tx.amount;
      }
    });

    const totalExpenses =
      shopping +
      foodDrinks +
      billsUtilities +
      entertainment +
      transportation +
      travel +
      savings +
      investments +
      others;

    if (totalExpenses === 0) {
      return (
        <Text style={styles.chartInfoText}>
          No expense data to display yet.
        </Text>
      );
    }

    const data = [
      {
        name: "Shopping",
        population: shopping,
        color: "#4caf50",
        legendFontColor: "#4caf50",
        legendFontSize: 14,
      },
      {
        name: "Food & Drinks",
        population: foodDrinks,
        color: "#F44336",
        legendFontColor: "#F44336",
        legendFontSize: 14,
      },
      {
        name: "Bills & Utilities",
        population: billsUtilities,
        color: "#FF9800",
        legendFontColor: "#FF9800",
        legendFontSize: 14,
      },
      {
        name: "Entertainment",
        population: entertainment,
        color: "#9C27B0",
        legendFontColor: "#9C27B0",
        legendFontSize: 14,
      },
      {
        name: "Transportation",
        population: transportation,
        color: "#00BCD4",
        legendFontColor: "#00BCD4",
        legendFontSize: 14,
      },
      {
        name: "Travel",
        population: travel,
        color: "#E91E63",
        legendFontColor: "#E91E63",
        legendFontSize: 14,
      },
      {
        name: "Savings",
        population: savings,
        color: "#8BC34A",
        legendFontColor: "#8BC34A",
        legendFontSize: 14,
      },
      {
        name: "Investments",
        population: investments,
        color: "#FF5722",
        legendFontColor: "#FF5722",
        legendFontSize: 14,
      },
      {
        name: "Others",
        population: others,
        color: "#2196F3",
        legendFontColor: "#2196F3",
        legendFontSize: 14,
      },
    ];

    return (
      <PieChart
        data={data}
        width={screenWidth * 0.8}
        height={220}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#6a11cb",
          backgroundGradientTo: "#2575fc",
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="10"
        center={[0, 0]}
        absolute={false}
      />
    );
  }, [transactions, screenWidth]);

  function renderTransactionItem({ item }) {
    const borderColor = item.type === "income" ? "#4caf50" : "#f44336";
    return (
      <View style={[styles.transaction, { borderLeftColor: borderColor }]}>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionAmount}>
            {item.type === "income" ? "+" : "-"}£{item.amount.toFixed(2)}
          </Text>
          <Text style={styles.purposeText}>{item.purpose}</Text>
        </View>
        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(item.timestamp))} ago
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Greeting */}
      {/* <Text style={styles.welcomeText}>
        {userName ? `Welcome ${userName},` : "Welcome User,"}
      </Text> */}
      <View style={styles.headerRow}>
        <Text style={styles.welcomeText}>
          {userName ? `Welcome ${userName},` : "Welcome User,"}
        </Text>
        <TouchableOpacity onPress={openBalanceModal}>
          <Text style={styles.editBalanceButtonText}>Edit Balance</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <TouchableOpacity
        style={styles.balanceContainer}
        onPress={() => setChartModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.balance}>£{balance.toLocaleString()}</Text>
        <View style={styles.incomeExpenseContainer}>
          <Text style={styles.income}>Income: £{income.toLocaleString()}</Text>
          <Text style={styles.expense}>
            Expenses: £{expenses.toLocaleString()}
          </Text>
        </View>
        <Text style={styles.tapForChartText}>Tap for Charts</Text>
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
        renderItem={renderTransactionItem}
      />
      {/* Edit Balance Modal */}
      <Modal
        visible={isBalanceModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeBalanceModal}
      >
        <TouchableWithoutFeedback onPress={closeBalanceModal}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Set New Balance</Text>

                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={newBalanceValue}
                  onChangeText={setNewBalanceValue}
                  placeholder="Enter new balance"
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.editmodalButton}
                    onPress={handleEditBalance}
                  >
                    <Text style={styles.modalButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.editmodalButton,
                      { backgroundColor: "#666" },
                    ]}
                    onPress={closeBalanceModal}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Transaction Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
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
        {/* Outer TouchableWithoutFeedback for backdrop click-to-close */}
        <TouchableWithoutFeedback onPress={() => setChartModalVisible(false)}>
          <View style={styles.chartModalContainer}>
            {/* Inner TouchableWithoutFeedback to keep modal open when clicking content */}
            <TouchableWithoutFeedback>
              <View style={styles.chartModalContent}>
                {chartModalPage === 1 && (
                  <>
                    <Text style={styles.modalTitle}>Income/Expenses</Text>
                    {renderBalancePie()}

                    <Text style={styles.summaryText}>
                      <Text style={{ fontWeight: "bold" }}>Income:</Text> £
                      {income.toFixed(2)} ({incomePercentage.toFixed(0)}%)
                      {"\n"}
                      <Text style={{ fontWeight: "bold" }}>Expenses:</Text> £
                      {expenses.toFixed(2)} ({expensePercentage.toFixed(0)}%)
                    </Text>

                    {net >= 0 ? (
                      <Text style={styles.summaryText}>
                        You have a net positive balance of £{net.toFixed(2)}.
                        Great job!
                        {"\n"}
                        Keep tracking to maintain a healthy balance!
                      </Text>
                    ) : (
                      <Text style={styles.summaryText}>
                        You're spending £{Math.abs(net).toFixed(2)} more than
                        you earn. Consider reviewing your expenses.
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.modalButton, { marginTop: 20 }]}
                      onPress={() => setChartModalPage(2)}
                    >
                      <Text style={styles.modalButtonText}>Next</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { marginTop: 10, backgroundColor: "#666" },
                      ]}
                      onPress={() => setChartModalVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}

                {chartModalPage === 2 && (
                  <>
                    <Text style={styles.modalTitle}>
                      {" "}
                      Recent Income by Category
                    </Text>
                    {renderIncomePie()}
                    <Text style={styles.summaryText}>
                      The chart above breaks your income by categories.
                    </Text>

                    {/* Back button to return to the first page */}
                    <TouchableOpacity
                      style={[styles.modalButton, { marginTop: 20 }]}
                      onPress={() => setChartModalPage(3)}
                    >
                      <Text style={styles.modalButtonText}>Next</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, { marginTop: 10 }]}
                      onPress={() => setChartModalPage(1)}
                    >
                      <Text style={styles.modalButtonText}>Back</Text>
                    </TouchableOpacity>

                    {/* Close button */}
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { marginTop: 10, backgroundColor: "#666" },
                      ]}
                      onPress={() => setChartModalVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}

                {chartModalPage === 3 && (
                  <>
                    <Text style={styles.modalTitle}>
                      {" "}
                      Recent Expenses by Category
                    </Text>
                    {renderExpensePie()}
                    <Text style={styles.summaryText}>
                      The chart above breaks your expense by categories.
                    </Text>
                    <TouchableOpacity
                      style={[styles.modalButton, { marginTop: 20 }]}
                      onPress={() => setChartModalPage(2)}
                    >
                      <Text style={styles.modalButtonText}>Back</Text>
                    </TouchableOpacity>

                    {/* Close button */}
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        { marginTop: 10, backgroundColor: "#666" },
                      ]}
                      onPress={() => setChartModalVisible(false)}
                    >
                      <Text style={styles.modalButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "left",
    color: "#333",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#444",
  },
  chartInfoText: {
    fontSize: 16,
    color: "#555",
    marginVertical: 8,
    textAlign: "center",
  },
  balanceContainer: {
    backgroundColor: Colors.primary500,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  balance: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  incomeExpenseContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 4,
  },
  income: {
    color: "#4caf50",
    fontWeight: "bold",
    fontSize: 16,
  },
  expense: {
    color: "#f44336",
    fontWeight: "bold",
    fontSize: 16,
  },
  tapForChartText: {
    marginTop: 8,
    color: "#fff",
    fontStyle: "italic",
    fontSize: 12,
  },

  /* Transaction Buttons */
  transactionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  transactionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
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
    fontWeight: "600",
    textAlign: "center",
  },
  transaction: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionDetails: {
    flexDirection: "column",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  purposeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  timestamp: {
    color: "#888",
    fontSize: 12,
    alignSelf: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 320,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  modalButton: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
    // flex: 1,
    // marginHorizontal: 5,
  },
  editmodalButton: {
    backgroundColor: Colors.primary500,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
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
    width: 340,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  editBalanceButtonText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});
