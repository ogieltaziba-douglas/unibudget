import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import SettingsScreen from "../screens/SettingsScreen";
import { AuthContext } from "../store/auth-context";

let onSnapshotUserCallback;

jest.mock("firebase/firestore", () => {
  const originalModule = jest.requireActual("firebase/firestore");
  return {
    ...originalModule,
    doc: jest.fn((_, userId) => ({ userId })),
    onSnapshot: jest.fn((ref, successCallback, errorCallback) => {
      onSnapshotUserCallback = successCallback;
      return () => {};
    }),
    updateDoc: jest.fn(() => Promise.resolve()),
    setDoc: jest.fn(() => Promise.resolve()),
  };
});

const authContextValue = {
  loading: false,
  uid: "test-uid",
  authenticate: jest.fn(),
  logout: jest.fn(),
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    onSnapshotUserCallback = null;
    jest.clearAllMocks();
  });

  it("shows loading indicator until data arrives, then displays user data", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    expect(queryByText(/Available Balance/i)).toBeNull();
    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Test",
          email: "test@test.com",
        }),
      });
    });

    await waitFor(() => {
      expect(getByText(/Email:/i)).toBeTruthy();
      expect(getByText("test@test.com")).toBeTruthy();
      expect(getByText(/Name:/i)).toBeTruthy();
    });
  });

  it("displays an error if user is not logged in (no uid)", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={{ ...authContextValue, uid: null }}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(getByText(/User is not logged in/i)).toBeTruthy();
    });
  });

  it("creates a user doc if doc does not exist, sets an error message", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => false,
      });
    });

    await waitFor(() => {
      expect(getByText(/User data not found/i)).toBeTruthy();
    });

    const { setDoc } = require("firebase/firestore");
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it("validates empty name when saving", async () => {
    const { getByText, getByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Test",
          email: "test@test.com",
        }),
      });
    });

    await waitFor(() => {
      expect(getByPlaceholderText("Enter your name").props.value).toBe("Test");
    });

    fireEvent.changeText(getByPlaceholderText("Enter your name"), "");

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    fireEvent.press(getByText("Save Name"));
    expect(alertSpy).toHaveBeenCalledWith("Validation", "Please enter a name.");
    alertSpy.mockRestore();
  });

  it("saves valid name and shows success alert", async () => {
    const { getByText, getByPlaceholderText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Old Name",
          email: "test@test.com",
        }),
      });
    });

    await waitFor(() => {
      expect(getByPlaceholderText("Enter your name").props.value).toBe(
        "Old Name"
      );
    });

    fireEvent.changeText(getByPlaceholderText("Enter your name"), "New Name");

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    fireEvent.press(getByText("Save Name"));

    await waitFor(() => {
      const { updateDoc } = require("firebase/firestore");
      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(updateDoc.mock.calls[0][1]).toEqual({ name: "New Name" });
      expect(alertSpy).toHaveBeenCalledWith(
        "Success",
        "Name updated successfully!"
      );
    });
    alertSpy.mockRestore();
  });

  it("opens and closes Privacy & GDPR modal", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Test",
          email: "test@test.com",
        }),
      });
    });

    fireEvent.press(getByText("Privacy & GDPR"));

    await waitFor(() => {
      expect(getByText(/We take your privacy seriously/i)).toBeTruthy();
    });

    fireEvent.press(getByText("Close"));
    await waitFor(() => {
      expect(queryByText(/We take your privacy seriously/i)).toBeNull();
    });
  });

  it("opens and closes Terms of Service modal", async () => {
    const { getByText, queryByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Test",
          email: "test@test.com",
        }),
      });
    });

    fireEvent.press(getByText("Terms of Service"));

    await waitFor(() => {
      expect(
        getByText(/By using this app, you agree to our Terms of Service/i)
      ).toBeTruthy();
    });

    fireEvent.press(getByText("Close"));
    await waitFor(() => {
      expect(
        queryByText(/By using this app, you agree to our Terms of Service/i)
      ).toBeNull();
    });
  });

  it("logs out when 'Logout' is pressed", async () => {
    const { getByText } = render(
      <AuthContext.Provider value={authContextValue}>
        <SettingsScreen />
      </AuthContext.Provider>
    );

    await act(async () => {
      onSnapshotUserCallback({
        exists: () => true,
        data: () => ({
          name: "Test",
          email: "test@test.com",
        }),
      });
    });

    fireEvent.press(getByText("Logout"));
    expect(authContextValue.logout).toHaveBeenCalledTimes(1);
  });
});
