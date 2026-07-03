import { Amplify } from 'aws-amplify';
import { Authenticator, View } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { RouterProvider } from 'react-router-dom';
import routesBasic from './route';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID!,
      ...(process.env.REACT_APP_COGNITO_ENDPOINT
        ? { userPoolEndpoint: process.env.REACT_APP_COGNITO_ENDPOINT }
        : {}),
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

function App() {
  return (
    <Authenticator components={components} formFields={formFields} hideSignUp={!!process.env.REACT_APP_COGNITO_ENDPOINT}>
      <RouterProvider router={routesBasic} />
    </Authenticator>
  );
}

export default App;
