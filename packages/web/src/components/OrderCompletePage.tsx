import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';

function OrderCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuthenticator();
  const state = location.state as { itemName?: string } | null;

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <h1 className="site-title"><a href="/">🍔 JavaEats</a></h1>
          <button className="btn-logout" onClick={signOut}>ログアウト</button>
        </div>
      </header>

      <div className="container">
        <div className="form-card complete-card" style={{ textAlign: 'center' }}>
          <h2 className="success-title">ご注文ありがとうございました！</h2>
          {state?.itemName && (
            <p className="message-text">「{state.itemName}」のご注文が確定しました。</p>
          )}
          <p className="sub-text">商品は準備でき次第、お届け先へ出発いたします。</p>
          <button
            className="btn-submit btn-return"
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            メニュー一覧へ戻る
          </button>
        </div>
      </div>
    </>
  );
}

export default OrderCompletePage;
