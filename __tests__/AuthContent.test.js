import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import AuthContent from "../components/Auth/AuthContent";

const mockReplace = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

describe("AuthContent Component", () => {
  it("switches auth mode when the switch button is pressed (login mode)", () => {
    const onAuthenticateMock = jest.fn();
    const { getByText } = render(
      <AuthContent isLogin={true} onAuthenticate={onAuthenticateMock} />
    );

    const switchButton = getByText("Create a new user");
    fireEvent.press(switchButton);

    expect(mockReplace).toHaveBeenCalledWith("Signup");
  });

  it("does not call onAuthenticate when submitted with invalid inputs", () => {
    const onAuthenticateMock = jest.fn();
    const { getByText } = render(
      <AuthContent isLogin={true} onAuthenticate={onAuthenticateMock} />
    );

    const loginButton = getByText("Log In");
    fireEvent.press(loginButton);

    expect(onAuthenticateMock).not.toHaveBeenCalled();
  });
});
