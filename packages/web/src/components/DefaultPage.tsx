import React, {useState, useEffect} from 'react'

type ItemResponse = {
  id: number;
  itemName: string;
  price: number;
  imagePath: string;
  shopName: string;
  categoryName: string;
};

function DefaultPage() {
  const [items, setItems] = useState<ItemResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.REACT_APP_API_BASE || '';

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(`${apiBase}/item/list`);
        const data: ItemResponse[] = await res.json();
        setItems(data);
      } catch (e) {
        console.error('Failed to fetch items:', e);
        setError('データの取得に失敗しました');
      }
    };
    fetchItems();
  }, [apiBase]);

  if (error) return <div>{error}</div>;
  if (items === null) return <div>Loading...</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>
          {item.itemName} - ¥{item.price}（{item.shopName} / {item.categoryName}）
        </li>
      ))}
    </ul>
  );
}

export default DefaultPage;
