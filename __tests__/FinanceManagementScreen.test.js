import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  act,
} from "@testing-library/react-native";
import FinanceManagementScreen from "../screens/FinanceManagementScreen";
import { AuthContext } from "../store/auth-context";

let onSnapshotCallback;

global.fakeTransactions = [
  {
    type: "income",
    amount: 200,
    purpose: "Test Income",
    category: "Salary",
    timestamp: new Date().toISOString(),
  },
  {
    type: "expense",
    amount: 100,
    purpose: "Test Expense",
    category: "Food & Drinks",
    timestamp: new Date().toISOString(),
  },
];

const arrayUnion = (item) => ({ __op: "arrayUnion", item });
const arrayRemove = (item) => ({ __op: "arrayRemove", item });

jest.mock("firebase/firestore", () => {
  const originalModule = jest.requireActual("firebase/firestore");
  return {
    ...originalModule,
    doc: jest.fn(),
    setDoc: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn((docRef, successCallback) => {
      onSnapshotCallback = successCallback;
      const fakeSnapshot = {
        exists: () => true,
        data: () => ({
          name: "Test User",
          balance: 100,
          transactions: global.fakeTransactions,
        }),
        docs: [],
      };
      successCallback(fakeSnapshot);
      return () => {};
    }),
    runTransaction: jest.fn((db, transactionFunction) => {
      return transactionFunction({
        get: async () => ({
          exists: () => true,
          data: () => ({
            balance: 100,
            transactions: global.fakeTransactions,
          }),
        }),
        update: (_ref, updateData) => {
          const tx = updateData.transactions;
          if (tx?.__op === "arrayRemove") {
            const toRemove = tx.item;
            global.fakeTransactions = global.fakeTransactions.filter(
              (t) =>
                !(
                  t.purpose === toRemove.purpose &&
                  t.category === toRemove.category &&
                  t.type === toRemove.type
                )
            );
          }
          if (tx?.__op === "arrayUnion") {
            const toAdd = tx.item;
            global.fakeTransactions = global.fakeTransactions.filter(
              (t) =>
                !(
                  t.purpose === toAdd.purpose &&
                  t.category === toAdd.category &&
                  t.type === toAdd.type
                )
            );
            global.fakeTransactions.unshift(toAdd);
          }
          return Promise.resolve();
        },
      });
    }),
    updateDoc: jest.fn((docRef, updateData) => {
      const tx = updateData.transactions;
      if (tx?.__op === "arrayRemove") {
        const toRemove = tx.item;
        global.fakeTransactions = global.fakeTransactions.filter(
          (t) =>
            !(
              t.purpose === toRemove.purpose &&
              t.category === toRemove.category &&
              t.type === toRemove.type
            )
        );
      }
      return Promise.resolve();
    }),
    arrayUnion,
    arrayRemove,
  };
});

jest.mock("../util/firebase", () => ({
  db: {},
}));

const authContextValue = {
  loading: false,
  uid: "test-uid",
  authenticate: jest.fn(),
  logout: jest.fn(),
};

describe("FinanceManagementScreen", () => {
  beforeEach(() => {
    global.fakeTransactions = [
      {
        type: "income",
        amount: 200,
        purpose: "Test Income",
        category: "Salary",
        timestamp: new Date().toISOString(),
      },
      {
        type: "expense",
        amount: 100,
        purpose: "Test Expense",
        category: "Food & Drinks",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  it("renders a list of transactions", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );
    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });
  });

  it("filters transactions based on selected category", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );
    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });
    fireEvent.press(getByText("Salary"));
    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(queryByText(/Test Expense/i)).toBeNull();
    });
    fireEvent.press(getByText("Food & Drinks"));
    await waitFor(() => {
      expect(getByText(/Test Expense/i)).toBeTruthy();
      expect(queryByText(/Test Income/i)).toBeNull();
    });
  });

  it('opens the "Add Income" modal when "+ Add Income" is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );
    expect(queryByPlaceholderText("Enter amount")).toBeNull();
    fireEvent.press(getByText("+ Add Income"));
    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
      expect(getByText("Add Income")).toBeTruthy();
    });
  });

  it("adds the new income transaction to the list", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });

    const newSnapshotIncome = {
      exists: () => true,
      data: () => ({
        name: "Test User",
        balance: 400,
        transactions: [
          {
            type: "income",
            amount: 200,
            purpose: "Test Income",
            category: "Salary",
            timestamp: new Date().toISOString(),
          },
          {
            type: "income",
            amount: 300,
            purpose: "New Income",
            category: "Gift",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 100,
            purpose: "Test Expense",
            category: "Food & Drinks",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      docs: [],
    };

    await act(async () => {
      onSnapshotCallback(newSnapshotIncome);
    });

    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
      expect(getByText(/New Income/i)).toBeTruthy();
    });
  });

  it('opens the "Add Expense" modal when "- Add Expense" is pressed', async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );
    expect(queryByPlaceholderText("Enter amount")).toBeNull();
    fireEvent.press(getByText("- Add Expense"));
    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
      expect(getByText("Add Expense")).toBeTruthy();
    });
  });

  it("adds the new expense transaction to the list", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });

    const newSnapshotIncome = {
      exists: () => true,
      data: () => ({
        name: "Test User",
        balance: 400,
        transactions: [
          {
            type: "income",
            amount: 200,
            purpose: "Test Income",
            category: "Salary",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 50,
            purpose: "New Expense",
            category: "Shopping",
            timestamp: new Date().toISOString(),
          },
          {
            type: "expense",
            amount: 100,
            purpose: "Test Expense",
            category: "Food & Drinks",
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      docs: [],
    };

    await act(async () => {
      onSnapshotCallback(newSnapshotIncome);
    });

    await waitFor(() => {
      expect(getByText(/Test Income/i)).toBeTruthy();
      expect(getByText(/Test Expense/i)).toBeTruthy();
      expect(getByText(/New Expense/i)).toBeTruthy();
    });
  });

  it("allows editing a transaction", async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Test Expense/i));
    await waitFor(() => {
      expect(getByText("Edit expense")).toBeTruthy();
    });
    const amountInput = getByPlaceholderText("Enter amount");
    expect(amountInput.props.value).toBe("100");

    fireEvent.changeText(amountInput, "150");
    fireEvent.press(getByText("Add Expense"));

    await waitForElementToBeRemoved(() =>
      queryByPlaceholderText("Enter amount")
    );

    await act(async () => {
      onSnapshotCallback({
        exists: () => true,
        data: () => ({
          name: "Test User",
          balance: 100,
          transactions: [
            {
              type: "income",
              amount: 200,
              purpose: "Test Income",
              category: "Salary",
              timestamp: new Date().toISOString(),
            },
            {
              type: "expense",
              amount: 150,
              purpose: "Test Expense",
              category: "Food & Drinks",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
        docs: [],
      });
    });

    fireEvent.press(getByText(/Test Expense/i));
    await waitFor(() => {
      expect(getByText("Edit expense")).toBeTruthy();
    });
    const updatedAmountInput = getByPlaceholderText("Enter amount");
    expect(updatedAmountInput.props.value).toBe("150");
  });

  it("allows deleting a transaction", async () => {
    const { getByText, queryByPlaceholderText, unmount } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/Test Expense/i)).toBeTruthy();
    });

    fireEvent.press(getByText(/Test Expense/i));
    await waitFor(() => {
      expect(getByText("Edit expense")).toBeTruthy();
    });
    fireEvent.press(getByText("Delete Transaction"));

    await waitForElementToBeRemoved(() =>
      queryByPlaceholderText("Enter amount")
    );
    unmount();

    const { queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <FinanceManagementScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(queryByText(/Test Expense/i)).toBeNull();
    });
  });
});
