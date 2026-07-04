import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

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
  const { signOut } = useAuthenticator();

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
    const fetchItemDetail = async () => {
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
      } catch (e: any) {
        console.error('Failed to fetch item detail:', e);
        setError(e.message || 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchItemDetail();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, apiBase]);

  const handleSubmit = (e: React.FormEvent) => {
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
    // 注文機能はまだ未実装のため、アラートで確認できるようにします
    alert(`注文入力が確認されました！\n商品名: ${item?.itemName}\n数量: ${quantity}個\nお届け先: ${address}\n\n※この機能は確認画面へのモックアップです。`);
    console.log('Order simulation submitted:', {
      itemId: item?.id,
      itemName: item?.itemName,
      price: item?.price,
      quantity,
      address,
    });
  };

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <h1 className="site-title"><a href="/">🍔 JavaEats</a></h1>
          <button className="btn-logout" onClick={signOut}>ログアウト</button>
        </div>
      </header>

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