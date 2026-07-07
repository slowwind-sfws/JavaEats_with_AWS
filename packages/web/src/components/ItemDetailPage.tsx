import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import Header from './Header';

type ItemResponse = {
  id: number;
  itemName: string;
  price: number;
  imagePath: string;
  shopName: string;
  categoryName: string;
};

function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<ItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フォームステート
  const [quantity, setQuantity] = useState<number>(1);
  const [address, setAddress] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ quantity?: string; address?: string }>({});

  const apiBase = process.env.REACT_APP_API_BASE || '';

  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    return headers;
  };

  useEffect(() => {
    const fetchItemDetailAndProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const headers = await getAuthHeaders();
        const res = await fetch(`${apiBase}/item/${id}`, { headers });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('商品が見つかりませんでした');
          }
          throw new Error('データの取得に失敗しました');
        }
        const data: ItemResponse = await res.json();
        setItem(data);

        // ユーザープロフィール情報から住所を自動補完
        try {
          const session = await fetchAuthSession();
          const userId = session.tokens?.idToken?.payload?.sub as string;
          if (userId) {
            const profileRes = await fetch(`${apiBase}/user/${userId}`, { headers });
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData && profileData.address) {
                setAddress(profileData.address);
              }
            }
          }
        } catch (profileError) {
          console.warn('Failed to load profile for address auto-completion:', profileError);
        }

      } catch (e: any) {
        console.error('Failed to fetch item detail:', e);
        setError(e.message || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItemDetailAndProfile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { quantity?: string; address?: string } = {};

    if (!quantity || quantity < 1) {
      errors.quantity = '数量は1以上の数値を入力してください';
    }
    if (!address.trim()) {
      errors.address = 'お届け先住所を入力してください';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    // 金額計算（元の OrderService.calculateTotal をフロントでトレース）
    const orderPrice = item!.price * quantity;        // 小計
    const shippingFee = orderPrice >= 3000 ? 0 : 500; // 3000円以上で送料無料
    const discount = 0;                               // ランク機能は未実装
    const totalPrice = orderPrice + shippingFee - discount;

    // Cognito sub を userId として取得
    const session = await fetchAuthSession();
    const userId = session.tokens?.idToken?.payload?.sub as string;

    // 確認ページへ遷移（state でデータを受け渡し）
    navigate('/order/confirm', {
      state: {
        userId,
        itemId: item!.id,
        itemName: item!.itemName,
        shopName: item!.shopName,
        price: item!.price,
        quantity,
        address,
        orderPrice,
        shippingFee,
        discount,
        totalPrice,
      },
    });
  };

  return (
    <>
      <Header showMyPage />

      <div className="container">
        {loading && <div>読み込み中...</div>}
        {error && (
          <div className="form-card" style={{ textAlign: 'center' }}>
            <p className="error-msg" style={{ fontSize: '18px', marginBottom: '20px' }}>{error}</p>
            <button className="btn-back" onClick={() => navigate('/')}>メニュー一覧へ戻る</button>
          </div>
        )}

        {!loading && !error && item && (
          <div className="form-card">
            <h2>注文情報の入力</h2>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                <img
                  src={`/images/${item.imagePath}`}
                  alt={item.itemName}
                  style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <div>
                  <div className="shop-name">{item.shopName}</div>
                  <h3 style={{ margin: '5px 0' }}>{item.itemName}</h3>
                  <div style={{ color: '#666', fontSize: '14px' }}>カテゴリ: {item.categoryName}</div>
                </div>
              </div>

              <div className="summary-box mb-20">
                <p><strong>注文商品：</strong> <span>{item.itemName}</span></p>
                <p><strong>単価：</strong> <span>{item.price.toLocaleString()}</span> 円</p>
                {quantity > 0 && (
                  <p style={{ marginTop: '10px', borderTop: '1px solid #ddd', paddingTop: '10px', fontWeight: 'bold' }}>
                    合計金額：<span style={{ color: '#e53935', fontSize: '18px' }}>{(item.price * quantity).toLocaleString()}</span> 円
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="quantity">数量 (個)</label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                />
                {formErrors.quantity && <span className="error-msg">{formErrors.quantity}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="address">お届け先住所</label>
                <input
                  type="text"
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="東京都板橋区..."
                />
                {formErrors.address && <span className="error-msg">{formErrors.address}</span>}
              </div>

              <button type="submit" className="btn-submit">確認画面へ</button>
              <button type="button" className="btn-back" onClick={() => navigate('/')}>メニュー一覧へ戻る</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default ItemDetailPage;