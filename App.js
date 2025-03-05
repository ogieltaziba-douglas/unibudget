import { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import { Colors } from "./constants/styles";
import AuthContextProvider, { AuthContext } from "./store/auth-context";
import IconButton from "./components/ui/IconButton";
import SettingsScreen from "./screens/SettingsScreen";
import FinanceManagementScreen from "./screens/FinanceManagementScreen";
import BudgetManagementScreen from "./screens/BudgetMangementScreen";
import { GlobalDataProvider } from "./store/globalDataContext";

const Stack = createNativeStackNavigator();
const BottomTab = createBottomTabNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary500 },
        headerTintColor: "white",
        contentStyle: { backgroundColor: Colors.primary100 },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AuthenticatedStack() {
  const authCtx = useContext(AuthContext);
  return (
    <BottomTab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary500 },
        headerTintColor: "white",
        contentStyle: { backgroundColor: Colors.primary100 },
        tabBarStyle: {
          height: 75,
          paddingBottom: 20,
        },
      }}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerRight: ({ tintColor }) => (
            <IconButton
              icon="exit"
              color={tintColor}
              size={24}
              onPress={authCtx.logout}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="home" color={color} size={size} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Management"
        component={FinanceManagementScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="wallet" color={color} size={size} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Budget"
        component={BudgetManagementScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="stats-chart" color={color} size={size} />
          ),
        }}
      />
      <BottomTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="settings" color={color} size={size} />
          ),
        }}
      />
    </BottomTab.Navigator>
  );
}

function Navigation() {
  const authCtx = useContext(AuthContext);

  return (
    <NavigationContainer>
      {!authCtx.isAuthenticated && <AuthStack />}
      {authCtx.isAuthenticated && <AuthenticatedStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AuthContextProvider>
        {/* <GlobalDataProvider> */}
          <Navigation />
        {/* </GlobalDataProvider> */}
      </AuthContextProvider>
    </>
  );
}
