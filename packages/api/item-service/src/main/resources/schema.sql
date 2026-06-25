-- 既存のテーブルがあれば削除（依存関係を考慮した順序）
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ==========================================
-- 1. ユーザーテーブル (ランクはJavaで計算するため数値のみ保持)
-- ==========================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    rank_code INT NOT NULL -- 1:一般, 2:プレミアム, 3:VIP
);

-- ==========================================
-- 2. カテゴリテーブル (正規化により独立)
-- ==========================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL
);

-- ==========================================
-- 3. 店舗テーブル (category_idでカテゴリと紐付け)
-- ==========================================
CREATE TABLE shops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_name VARCHAR(100) NOT NULL,
    category_id INT NOT NULL
);

-- ==========================================
-- 4. 商品テーブル (shop_idで店舗と紐付け)
-- ==========================================
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    image_path VARCHAR(200) NOT NULL
);

-- ==========================================
-- 5. 注文履歴テーブル (当時の単価を記録する実務設計)
-- ==========================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    order_price INT NOT NULL,
    shipping_fee INT NOT NULL,
    discount INT NOT NULL,
    total_price INT NOT NULL,
    order_date DATETIME NOT NULL
);