import { Amplify } from 'aws-amplify';
import { Authenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { RouterProvider } from 'react-router-dom';
import routesBasic from './route';
import { useEffect, useRef } from 'react';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

const winEnv = (window as any)._env_ || {};
const userPoolId = winEnv.REACT_APP_COGNITO_USER_POOL_ID || process.env.REACT_APP_COGNITO_USER_POOL_ID;
const userPoolClientId = winEnv.REACT_APP_COGNITO_CLIENT_ID || process.env.REACT_APP_COGNITO_CLIENT_ID;
const endpoint = winEnv.REACT_APP_COGNITO_ENDPOINT || process.env.REACT_APP_COGNITO_ENDPOINT;

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: userPoolId!,
      userPoolClientId: userPoolClientId!,
      ...(endpoint ? { userPoolEndpoint: endpoint } : {}),
    }
  }
});

const components = {
  Header() {
    return (
      <View textAlign="center" padding="30px 0 0">
        <div className="auth-logo">🍔 JavaEats</div>
      </View>
    );
  },
};

const formFields = {
  signIn: {
    username: {
      label: 'ユーザー名',
      placeholder: 'ユーザー名を入力',
    },
    password: {
      label: 'パスワード',
      placeholder: 'パスワードを入力',
    },
  },
  signUp: {
    username: {
      label: 'ユーザー名',
      placeholder: 'ユーザー名を入力',
      order: 1,
    },
    email: {
      label: 'メールアドレス',
      placeholder: '例: sample@example.co.jp',
      order: 2,
    },
    password: {
      label: 'パスワード',
      placeholder: 'パスワードを入力（8文字以上）',
      order: 3,
    },
    confirm_password: {
      label: 'パスワード（確認）',
      placeholder: 'パスワードを再入力',
      order: 4,
    },
  },
  confirmSignUp: {
    confirmation_code: {
      label: '確認コード',
      placeholder: 'メールに届いた6桁のコードを入力',
    },
  },
};

function MainApp() {
  const registeredRef = useRef(false);

  useEffect(() => {
    const registerUserIfNeeded = async () => {
      if (registeredRef.current) return;
      registeredRef.current = true;

      try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();
        const user = await getCurrentUser();
        const apiBase = process.env.REACT_APP_API_BASE || '';

        if (!idToken || !user) return;

        // AWS Cognito から ログイン中の user_name (または email の @ より前など) をフォールバック用に取得
        const userName = user.signInDetails?.loginId?.split('@')[0] || user.username || '新規ユーザー';

        // べき等な register API を呼び出す
        await fetch(`${apiBase}/user/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            id: user.userId, // Cognito sub
            userName: userName
          })
        });
        console.log('User registered/synced successfully with DB.');
      } catch (e) {
        console.error('Failed to auto register user to DB:', e);
      }
    };

    registerUserIfNeeded();
  }, []);

  return <RouterProvider router={routesBasic} />;
}

function App() {
  return (
    <Authenticator components={components} formFields={formFields} hideSignUp={!!process.env.REACT_APP_COGNITO_ENDPOINT}>
      <MainApp />
    </Authenticator>
  );
}

export default App;
