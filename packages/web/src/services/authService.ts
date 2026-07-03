const COGNITO_ENDPOINT = process.env.REACT_APP_COGNITO_ENDPOINT || "http://localhost:4566";
const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || "";

// 共通のCognito APIリクエストヘルパー
async function callCognitoAPI(action: string, payload: object) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.Message || `${action} failed`);
  }
  return data;
}

export const AuthService = {
  // 1. サインアップ (新規登録)
  async signUp(username: string, password: string, email: string) {
    return callCognitoAPI("SignUp", {
      ClientId: CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }]
    });
  },

  // 2. ログイン (サインイン)
  async signIn(username: string, password: string) {
    const result = await callCognitoAPI("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    if (result.AuthenticationResult) {
      const { IdToken, AccessToken, RefreshToken } = result.AuthenticationResult;
      // ローカルストレージにトークンをセーブ
      localStorage.setItem("id_token", IdToken);
      localStorage.setItem("access_token", AccessToken);
      localStorage.setItem("refresh_token", RefreshToken);
      return result.AuthenticationResult;
    }
    throw new Error("Invalid authentication result");
  },

  // 3. ログアウト
  signOut() {
    localStorage.removeItem("id_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  // 4. トークンの取得
  getIdToken() {
    return localStorage.getItem("id_token");
  },

  // 5. ログイン状態の確認
  isLoggedIn() {
    return !!localStorage.getItem("id_token");
  }
};
