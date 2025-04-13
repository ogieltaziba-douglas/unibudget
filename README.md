# 💰 UniBudget

**UniBudget** is a lightweight personal finance tracker built for students. It helps users monitor their income, expenses, and overall budget with an intuitive mobile interface. Designed with simplicity in mind, UniBudget makes it easy to stay on top of your spending.

---

## 📲 Features

- 📌 Add, edit, and delete transactions
- 📊 View your current balance and recent spending
- 📁 Categorise income and expenses
- 💼 Create, manage, and delete custom budgets
- 🔐 Sign up and login securely using Firebase Authentication
- ☁️ Cloud data storage with Firestore
- 🔄 Data persists across sessions

---

## ⚙️ Tech Stack

- **React Native** (via Expo)
- **Firebase** (Authentication & Firestore)
- **React Context API** – state management
- **Axios** – HTTP client for API requests
- **Jest** & **React Native Testing Library** – testing

---

## 📁 Project Structure

```sh
└── uniBudget/
    ├── App.js
    ├── README.md
    ├── __mocks__
    │   └── fileMock.js
    ├── __tests__
    │   ├── AuthContent.test.js
    │   ├── AuthForm.test.js
    │   ├── AuthScreens.test.js
    │   ├── BudgetManagementScreen.test.js
    │   ├── FinanceManagementScreen.test.js
    │   ├── Homescreen.test.js
    │   ├── Input.test.js
    │   ├── Navigation.test.js
    │   ├── SettingsScreen.test.js
    │   └── TransactionForm.test.js
    ├── app.json
    ├── assets
    ├── babel.config.js
    ├── components
    │   ├── Auth
    │   ├── TransactionForm.js
    │   └── ui
    ├── constants
    │   └── styles.js
    ├── jestSetup.js
    ├── node_modules
    ├── package-lock.json
    ├── package.json
    ├── screens
    │   ├── BudgetMangementScreen.js
    │   ├── FinanceManagementScreen.js
    │   ├── HomeScreen.js
    │   ├── LoginScreen.js
    │   ├── SettingsScreen.js
    │   └── SignupScreen.js
    ├── store
    │   ├── auth-context.js
    │   └── globalDataContext.js
    └── util
        ├── auth.js
        ├── firebase.js
        └── firebaseInit.js
```

---
## 🚀 Getting Started

### 🔧 Prerequisites

- JavaScript
- Node.js and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A Firebase project with:
  - Authentication enabled (email/password)
  - Firestore database set up

---

## 🔧 Firebase Setup

To connect UniBudget to Firebase, follow these steps:

### 1. Create a Firebase Project

- Go to [Firebase Console](https://console.firebase.google.com/)
- Click **Add project** → give it a name like `UniBudget`
- Disable Google Analytics (optional) and click **Create project**

---

### 2. Enable Email/Password Authentication

- In your Firebase project, go to **Authentication** > **Sign-in method**
- Enable **Email/Password**

---

### 3. Create a Firestore Database

- Go to **Firestore Database**
- Click **Create database**
- Choose **Start in test mode** (for development)
- Select your region and click **Enable**

---

### 4. Add Firebase Config to Your App

#### Using `.env` file 
Install `react-native-config` if not already done:

```bash
npm install react-native-config

Create a .env file at the root of your project:

FIREBASE_API_KEY=your-api-key
AUTH_DOMAIN=your-auth-domain
DATABASE_URL=your-database-url
PROJECT_ID=your-project-id
STORAGE_BUCKET=your-storage-bucket
MESSAGING_SENDER_ID=your-messaging-sender-id
APP_ID=your-app-id

```

### 📦 Installation

```bash
git clone https://github.com/ogieltaziba-douglas/uniBudget.git
cd uniBudget
npm install
npx expo start


```

### 🧪 Running Tests

npm test

Tests are located in the __tests__/ directory.

---