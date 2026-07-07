import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import Header from './Header';

type OrderState = {
  userId: string;
  itemId: number;
  itemName: string;
  shopName: string;
  price: number;
  quantity: number;
  address: string;
  orderPrice: number;
  shippingFee: number;
  discount: number;
  totalPrice: number;
};

function OrderConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as OrderState | null;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.REACT_APP_API_BASE || '';

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    return headers;
  };

  // state が存在しない場合（直接 URL アクセス等）はトップに戻す
  React.useEffect(() => {
    if (!state) {
      navigate('/');
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiBase}/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId:      state.userId,
          itemId:      state.itemId,
          quantity:    state.quantity,
          orderPrice:  state.orderPrice,
          shippingFee: state.shippingFee,
          discount:    state.discount,
          totalPrice:  state.totalPrice,
        }),
      });
      if (!res.ok) {
        throw new Error('注文の送信に失敗しました');
      }
      navigate('/order/complete', {
        state: { itemName: state.itemName },
      });
    } catch (e: any) {
      setError(e.message || '注文の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <Header showMyPage />

      <div className="container">
        <div className="form-card">
          <h2>ご注文内容の確認</h2>

          <p><strong>ショップ名：</strong> {state.shopName}</p>
          <p><strong>商品名：</strong> {state.itemName}</p>
          <p><strong>数量：</strong> {state.quantity} 個</p>
          <p><strong>お届け先：</strong> {state.address}</p>

          <div className="summary-box" style={{ marginTop: '20px' }}>
            <p>小計： {state.orderPrice.toLocaleString()} 円</p>
            {state.discount > 0 && (
              <p className="discount-text">★ランク特典： {state.discount} 円引き！</p>
            )}
            <p>配送料： {state.shippingFee.toLocaleString()} 円</p>
            <p style={{ fontWeight: 'bold', fontSize: '18px', marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
              お支払い合計： <span style={{ color: '#e53935' }}>{state.totalPrice.toLocaleString()}</span> 円
            </p>
          </div>

          {error && <p className="error-msg" style={{ marginTop: '16px' }}>{error}</p>}

          <button
            className="btn-submit"
            onClick={handleConfirm}
            disabled={submitting}
            style={{ marginTop: '20px' }}
          >
            {submitting ? '送信中...' : '注文を確定する'}
          </button>
          <button
            className="btn-back"
            onClick={handleBack}
            disabled={submitting}
          >
            修正する
          </button>
        </div>
      </div>
    </>
  );
}

export default OrderConfirmPage;
