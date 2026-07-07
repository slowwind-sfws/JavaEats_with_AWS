-- 既存のテーブルがあれば削除（依存関係を考慮した順序）
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ==========================================
-- 1. ユーザーテーブル (認証情報はCognitoで管理するため、DBにはプロフィール情報のみ保持)
-- ==========================================
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,   -- Cognito sub をそのまま格納
    user_name VARCHAR(50) NOT NULL,
    rank_code INT NOT NULL,       -- 1:一般, 2:プレミアム, 3:VIP
    zip_code VARCHAR(10),
    address VARCHAR(200),
    phone_number VARCHAR(20)
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
    user_id VARCHAR(50) NOT NULL,  -- Cognito sub
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    order_price INT NOT NULL,
    shipping_fee INT NOT NULL,
    discount INT NOT NULL,
    total_price INT NOT NULL,
    order_date DATETIME NOT NULL
);
