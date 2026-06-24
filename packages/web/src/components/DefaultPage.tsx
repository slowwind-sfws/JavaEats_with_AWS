import React, {useState, useEffect} from 'react'

// 型定義セクション
type MessageResponse = {
  fullname: string;
};

function DefaultPage() {
  // 状態管理セクション
  const [message, setDefaultMessage] = useState<string>('');
  const apiBase = process.env.REACT_APP_API_BASE || '';

  const send = { sei: "FURUTA", mei: "Seiichi"};

  // 副作用処理セクション
  useEffect(() => {
    const fetchDefaultMessage = async () => {
      try {
        const res = await fetch(`${apiBase}/uppercase`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(send)
        });
        const data: MessageResponse = await res.json();
        setDefaultMessage(data.fullname);
      } catch (error) {
        console.error('Failed to fetch default message:', error);
        setDefaultMessage('Error loading default message');
      }
    };
    fetchDefaultMessage();
  }, [apiBase]);

  // JSX構築セクション
  if (message.length === 0) {
    return <div>Loading...</div>;
  }

  return (
  <p>{message}</p>
  );
}

export default DefaultPage;