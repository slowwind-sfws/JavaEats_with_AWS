import React, { useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser, deleteUser } from 'aws-amplify/auth';
import Header from './Header';
import { apiBase } from '../config';

type UserProfile = {
  id: string;
  userName: string;
  rankCode: number;
  zipCode: string | null;
  address: string | null;
  phoneNumber: string | null;
};

type OrderHistory = {
  orderId: number;
  itemName: string;
  shopName: string;
  quantity: number;
  orderPrice: number;
  totalPrice: number;
  orderDate: string;
};

function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [historyList, setHistoryList] = useState<OrderHistory[]>([]);
  const [email, setEmail] = useState<string>('');
  
  // フォームステート
  const [userName, setUserName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


  const getAuthHeaders = async (): Promise<HeadersInit> => {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    return headers;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const user = await getCurrentUser();
        // Cognito のログインID（メールアドレス）を取得
        const userEmail = user.signInDetails?.loginId || '';
        setEmail(userEmail);

        const headers = await getAuthHeaders();

        // 1. プロフィール情報取得
        const profileRes = await fetch(`${apiBase}/user/${user.userId}`, { headers });
        if (profileRes.ok && (profileRes.headers.get('content-type') || '').includes('application/json')) {
          const profileData: UserProfile = await profileRes.json();
          setProfile(profileData);
          setUserName(profileData.userName || '');
          setZipCode(profileData.zipCode || '');
          setAddress(profileData.address || '');
          setPhoneNumber(profileData.phoneNumber || '');
        } else if (!profileRes.ok) {
          console.warn('Profile not found (status:', profileRes.status, ')');
        } else {
          console.error('Unexpected non-JSON response for profile. apiBase:', apiBase, 'URL:', profileRes.url);
          setErrorMsg('APIの設定に問題があります。管理者に連絡してください。');
        }

        // 2. 注文履歴取得 (Cognito sub をクエリパラメータ userId に渡す)
        const historyRes = await fetch(`${apiBase}/order/list?userId=${user.userId}`, { headers });
        if (historyRes.ok && (historyRes.headers.get('content-type') || '').includes('application/json')) {
          const historyData: OrderHistory[] = await historyRes.json();
          setHistoryList(Array.isArray(historyData) ? historyData : []);
        } else if (!historyRes.ok) {
          console.warn('Order history fetch failed (status:', historyRes.status, ')');
        }
      } catch (e: any) {
        console.error('Failed to load user profile or history:', e);
        setErrorMsg('アカウント情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const user = await getCurrentUser();
      const headers = await getAuthHeaders();

      const updateData = {
        userName,
        zipCode: zipCode || null,
        address: address || null,
        phoneNumber: phoneNumber || null
      };

      const res = await fetch(`${apiBase}/user/${user.userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        const updatedProfile: UserProfile = await res.json();
        setProfile(updatedProfile);
        setSuccessMsg('アカウント情報を更新しました。');
      } else {
        setErrorMsg('情報の更新に失敗しました。');
      }
    } catch (e) {
      console.error('Failed to update profile:', e);
      setErrorMsg('エラーが発生しました。時間を置いて再度お試しください。');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('本当に退会しますか？\nこの操作は取り消せません。')) {
      try {
        // Amplifyの標準機能でCognitoから物理削除 ＋ 自動サインアウト
        await deleteUser();
        alert('退会処理が完了しました。ご利用ありがとうございました。');
      } catch (e) {
        console.error('Failed to delete account:', e);
        alert('退会処理に失敗しました。時間をおいてもう一度お試しください。');
      }
    }
  };

  const getRankName = (code: number | undefined) => {
    switch (code) {
      case 2: return 'プレミアム';
      case 3: return 'VIP';
      default: return '一般';
    }
  };

  if (loading) {
    return <div className="container"><h2>Loading...</h2></div>;
  }

  return (
    <>
      <Header />

      <div className="container">
        {/* アカウント設定エリア */}
        <div className="form-card mb-30" style={{ maxWidth: '100%' }}>
          <h2>👤 アカウント情報設定</h2>

          <div className="current-rank-box">
            <span className="current-rank-label">現在の会員ランク：</span>
            <span className={`rank-badge rank-${profile?.rankCode || 1}`}>
              {getRankName(profile?.rankCode)}
            </span>
          </div>

          {successMsg && <p className="msg-success">{successMsg}</p>}
          {errorMsg && <p className="msg-error">{errorMsg}</p>}

          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>お名前</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                required
                maxLength={50}
              />
            </div>
            
            <div className="form-group">
              <label>メールアドレス (ログインID - 変更不可)</label>
              <input
                type="text"
                value={email}
                disabled
                style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label>郵便番号</label>
              <input
                type="text"
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                placeholder="例: 100-0001"
                maxLength={10}
              />
            </div>

            <div className="form-group">
              <label>お届け先住所</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="例: 東京都千代田区千代田1-1"
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label>電話番号</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="例: 03-1234-5678"
                maxLength={20}
              />
            </div>

            <button type="submit" className="btn-submit btn-auto">更新する</button>
          </form>
        </div>

        {/* 注文履歴エリア */}
        <div className="form-card card-full">
          <h2>📦 注文履歴</h2>
          
          {historyList.length === 0 ? (
            <p style={{ padding: '15px 0', color: '#666' }}>注文履歴はありません。</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr className="table-header">
                  <th className="th-left">注文日時</th>
                  <th className="th-left">店舗名</th>
                  <th className="th-left">商品名</th>
                  <th className="th-right">単価×数量</th>
                  <th className="th-right">支払合計</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((history, idx) => (
                  <tr key={history.orderId || idx} className="table-row">
                    <td className="td-base">{history.orderDate}</td>
                    <td className="td-base">{history.shopName}</td>
                    <td className="td-base">{history.itemName}</td>
                    <td className="td-right">
                      {history.orderPrice.toLocaleString()}円 × {history.quantity}
                    </td>
                    <td className="td-right-bold" style={{ fontWeight: 'bold' }}>
                      {history.totalPrice.toLocaleString()}円
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 危険ゾーン：退会エリア */}
        <div className="form-card card-danger">
          <h3 className="danger-title">⚠️ 退会（アカウント削除）</h3>
          <p className="danger-text">
            退会すると、お客様のアカウント情報およびこれまでの注文履歴は見られなくなります。<br />
            この操作は取り消すことができません。
          </p>
          <button type="button" className="btn-danger" onClick={handleDeleteAccount}>
            退会する
          </button>
        </div>

        <div className="link-back">
          <a href="/" className="btn-back btn-auto" style={{ display: 'inline-block' }}>商品一覧に戻る</a>
        </div>
      </div>
    </>
  );
}

export default UserProfilePage;
