import React from "react";
import { render } from "@testing-library/react-native";
import AuthForm from "../components/Auth/AuthForm";

describe("AuthForm Component", () => {
  const credentialsInvalid = {
    email: false,
    password: false,
    name: false,
    confirmEmail: false,
    confirmPassword: false,
  };

  it("renders correctly in login mode", () => {
    const onSubmitMock = jest.fn();
    const { queryByText, getByText } = render(
      <AuthForm
        isLogin={true}
        onSubmit={onSubmitMock}
        credentialsInvalid={credentialsInvalid}
      />
    );

    expect(getByText("Log In")).toBeTruthy();
    expect(queryByText("Name")).toBeNull();
    expect(queryByText("Confirm Email Address")).toBeNull();
    expect(queryByText("Confirm Password")).toBeNull();
  });

  it("renders correctly in sign-up mode", () => {
    const onSubmitMock = jest.fn();
    const { getByText } = render(
      <AuthForm
        isLogin={false}
        onSubmit={onSubmitMock}
        credentialsInvalid={credentialsInvalid}
      />
    );

    expect(getByText("Sign Up")).toBeTruthy();
    expect(getByText("Name")).toBeTruthy();
    expect(getByText("Confirm Email Address")).toBeTruthy();
    expect(getByText("Confirm Password")).toBeTruthy();
  });
});
