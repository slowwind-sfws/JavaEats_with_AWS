import React, { useState, useEffect } from 'react';

type ItemResponse = {
  id: number;
  itemName: string;
  price: number;
  imagePath: string;
  shopName: string;
  categoryName: string;
};

type Category = {
  id: number;
  categoryName: string;
};

function DefaultPage() {
  const [items, setItems] = useState<ItemResponse[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.REACT_APP_API_BASE || '';

  const fetchItems = async (kw: string, catId: string, signal?: AbortSignal) => {
    setItems(null);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (kw) params.set('keyword', kw);
      if (catId) params.set('categoryId', catId);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${apiBase}/item/list${query}`, { signal });
      const data: ItemResponse[] = await res.json();
      setItems(data);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('Failed to fetch items:', e);
      setError('データの取得に失敗しました');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const init = async () => {
      try {
        const catRes = await fetch(`${apiBase}/item/category`, { signal });
        const catData: Category[] = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('Failed to fetch categories:', e);
      }
      await fetchItems('', '', signal);
    };
    init();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(keyword, categoryId);
  };

  return (
    <>
      <header className="site-header">
        <div className="header-container">
          <h1 className="site-title"><a href="/">🍔 JavaEats</a></h1>
        </div>
      </header>

      <div className="container">
        <div className="search-box">
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="料理名で検索"
            />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">すべてのカテゴリ</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
              ))}
            </select>
            <button type="submit" className="btn-search">検索する</button>
          </form>
        </div>

        {error && <div>{error}</div>}

        {items === null && !error && <div>Loading...</div>}

        {items !== null && (
          <div className="item-grid">
            {items.map(item => (
              <div className="item-card" key={item.id}>
                <img
                  src={`/images/${item.imagePath}`}
                  className="item-image"
                  alt={item.itemName}
                  loading="lazy"
                />
                <div className="item-content">
                  <div className="shop-name">{item.shopName}</div>
                  <h3 className="item-name">{item.itemName}</h3>
                  <div className="item-price">{item.price.toLocaleString()}円</div>
                  <a href={`/order/input/${item.id}`} className="btn-order">注文する</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default DefaultPage;
