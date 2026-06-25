package jp.co.ambl.javaeats.form;

import lombok.Data;

@Data
public class ItemForm {
    // === 検索条件を受け取るフィールド ===
    private String keyword;
    private Integer categoryId;

    // === DBから取得した結果を画面に渡すフィールド ===
    private Integer id;
    private String itemName;
    private Integer price;
    private String imagePath;
    private String shopName;
    private String categoryName;
}
