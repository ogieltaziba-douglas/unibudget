import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import BudgetManagementScreen from "../screens/BudgetMangementScreen";
import { AuthContext } from "../store/auth-context";

let onSnapshotBudgetsCallback;
let onSnapshotUserCallback;

jest.mock("firebase/firestore", () => {
  const originalModule = jest.requireActual("firebase/firestore");
  return {
    ...originalModule,
    doc: jest.fn((_, userId) => ({ userId })),
    collection: jest.fn((_, __, userId, subCollectionName) => ({
      userId,
      subCollectionName,
    })),
    onSnapshot: jest.fn((ref, successCallback, errorCallback) => {
      if (ref.subCollectionName === "budgets") {
        onSnapshotBudgetsCallback = successCallback;
        successCallback({ docs: [] });
      } else if (ref.userId) {
        onSnapshotUserCallback = successCallback;
        successCallback({
          exists: () => true,
          data: () => ({
            balance: 0,
            transactions: [],
            name: "Mock User",
          }),
        });
      }
      return () => {};
    }),
    addDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    setDoc: jest.fn(() => Promise.resolve()),
    serverTimestamp: jest.fn(() => "MOCK_SERVER_TIMESTAMP"),
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

describe("BudgetManagementScreen", () => {
  beforeEach(() => {
    onSnapshotBudgetsCallback = null;
    onSnapshotUserCallback = null;
  });

  it("shows loading indicator until data arrives, then shows available balance and empty budget text", async () => {
    const { queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotBudgetsCallback({ docs: [] });
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          balance: 500,
          transactions: [],
          name: "Test User",
        }),
      });
    });

    await waitFor(() => {
      expect(queryByText(/Available Balance: £500/)).toBeTruthy();
      expect(queryByText(/No budgets created/i)).toBeTruthy();
    });
  });

  it("renders existing budgets and calculates available balance", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          balance: 1000,
          transactions: [],
          name: "Test User",
        }),
      });
      onSnapshotBudgetsCallback({
        docs: [
          {
            id: "budget1",
            data: () => ({
              amount: 300,
              category: "Shopping",
              purpose: "Clothes",
              timestamp: "2023-01-01T00:00:00Z",
            }),
          },
          {
            id: "budget2",
            data: () => ({
              amount: 200,
              category: "Food & Drinks",
              purpose: "Groceries",
              timestamp: "2023-01-02T00:00:00Z",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(getByText(/Available Balance: £500/i)).toBeTruthy();
      expect(getByText(/Clothes - £300/)).toBeTruthy();
      expect(getByText(/Groceries - £200/)).toBeTruthy();
      expect(queryByText(/No budgets created/i)).toBeNull();
    });
  });

  it("opens the Create Budget modal when 'Create New Budget' is pressed", async () => {
    const { getByText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotBudgetsCallback({ docs: [] });
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({ balance: 100, transactions: [] }),
      });
    });

    expect(queryByPlaceholderText("Enter amount")).toBeNull();

    fireEvent.press(getByText("Create New Budget"));

    await waitFor(() => {
      expect(queryByPlaceholderText("Enter amount")).toBeTruthy();
      expect(queryByPlaceholderText("Enter purpose")).toBeTruthy();
    });
  });

  it("validates form inputs when creating a new budget", async () => {
    const { getByText, getByPlaceholderText, getAllByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotBudgetsCallback({ docs: [] });
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({ balance: 100, transactions: [] }),
      });
    });

    fireEvent.press(getByText("Create New Budget"));
    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText("Enter amount"), "-10");
    fireEvent.changeText(getByPlaceholderText("Enter purpose"), "Test");

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const createBudgetButtons = getAllByText("Create Budget");
    fireEvent.press(createBudgetButtons[1]);
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("creates a budget with valid inputs and updates available balance and budget list", async () => {
    const { getByText, getByPlaceholderText, getAllByText, getByTestId } =
      render(
        <AuthContext.Provider value={authContextValue}>
          <BudgetManagementScreen />
        </AuthContext.Provider>
      );

    await act(async () => {
      onSnapshotBudgetsCallback({ docs: [] });
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({ balance: 1000, transactions: [] }),
      });
    });

    await waitFor(() => {
      expect(getByText(/Available Balance: £1000/)).toBeTruthy();
    });

    fireEvent.press(getByText("Create New Budget"));
    await waitFor(() => {
      expect(getByPlaceholderText("Enter amount")).toBeTruthy();
    });

    fireEvent(getByTestId("budget-picker"), "onValueChange", "Shopping");

    fireEvent.changeText(getByPlaceholderText("Enter amount"), "200");
    fireEvent.changeText(
      getByPlaceholderText("Enter purpose"),
      "Birthday Gifts"
    );

    const createBudgetButtons = getAllByText("Create Budget");
    await act(async () => {
      fireEvent.press(createBudgetButtons[1]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    await act(async () => {
      onSnapshotBudgetsCallback({
        docs: [
          {
            id: "b1",
            data: () => ({
              amount: 200,
              category: "Shopping",
              purpose: "Birthday Gifts",
              timestamp: "2023-04-01T00:00:00Z",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(getByText(/Available Balance: £800/)).toBeTruthy();
      expect(getByText(/Birthday Gifts - £200/)).toBeTruthy();
    });

    const { addDoc } = require("firebase/firestore");
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(addDoc.mock.calls[0][1]).toMatchObject({
      amount: 200,
      purpose: "Birthday Gifts",
      timestamp: "MOCK_SERVER_TIMESTAMP",
    });
  });

  it("opens edit modal when a budget is tapped and allows editing, then re-renders updated data", async () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({ balance: 1000, transactions: [] }),
      });
      onSnapshotBudgetsCallback({
        docs: [
          {
            id: "b1",
            data: () => ({
              amount: 300,
              category: "Shopping",
              purpose: "Clothes",
              timestamp: "2023-01-01T00:00:00Z",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(getByText(/Available Balance: £700/)).toBeTruthy();
      expect(getByText(/Clothes - £300/)).toBeTruthy();
    });

    fireEvent.press(getByText(/Clothes - £300/));
    await waitFor(() => {
      expect(getByText("Edit Budget")).toBeTruthy();
      expect(getByPlaceholderText("Enter amount").props.value).toBe("300");
    });

    fireEvent.changeText(getByPlaceholderText("Enter amount"), "350");
    await act(async () => {
      fireEvent.press(getByText("Update Budget"));
    });

    await act(async () => {
      onSnapshotBudgetsCallback({
        docs: [
          {
            id: "b1",
            data: () => ({
              amount: 350,
              category: "Shopping",
              purpose: "Clothes",
              timestamp: "2023-01-01T00:00:00Z",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(queryByPlaceholderText("Enter amount")).toBeNull();
      expect(getByText(/Available Balance: £650/)).toBeTruthy();
      expect(getByText(/Clothes - £350/)).toBeTruthy();
    });

    const { updateDoc } = require("firebase/firestore");
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc.mock.calls[0][1]).toMatchObject({
      amount: 350,
      purpose: "Clothes",
      timestamp: "MOCK_SERVER_TIMESTAMP",
    });
  });

  it("allows deleting a budget and updates available balance", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <BudgetManagementScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({ balance: 1000, transactions: [] }),
      });
      onSnapshotBudgetsCallback({
        docs: [
          {
            id: "b1",
            data: () => ({
              amount: 300,
              category: "Shopping",
              purpose: "Clothes",
              timestamp: "2023-01-01T00:00:00Z",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      expect(getByText(/Available Balance: £700/)).toBeTruthy();
      expect(getByText(/Clothes - £300/)).toBeTruthy();
    });

    // Open the edit modal and trigger deletion.
    fireEvent.press(getByText(/Clothes - £300/));
    await waitFor(() => {
      expect(getByText("Edit Budget")).toBeTruthy();
    });

    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((title, message, buttons) => {
        if (
          buttons &&
          buttons.length > 1 &&
          typeof buttons[1].onPress === "function"
        ) {
          buttons[1].onPress();
        }
      });

    await act(async () => {
      fireEvent.press(getByText("Delete Budget"));
    });

    await act(async () => {
      onSnapshotBudgetsCallback({ docs: [] });
    });

    await waitFor(() => {
      expect(queryByText(/Clothes - £300/)).toBeNull();
      expect(getByText(/Available Balance: £1000/)).toBeTruthy();
    });

    const { deleteDoc } = require("firebase/firestore");
    expect(deleteDoc).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
