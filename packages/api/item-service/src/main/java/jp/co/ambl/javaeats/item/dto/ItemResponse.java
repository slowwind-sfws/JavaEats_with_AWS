package jp.co.ambl.javaeats.item.dto;

import lombok.Data;

@Data
public class ItemResponse {
    private Integer id;
    private String itemName;
    private Integer price;
    private String imagePath;
    private String shopName;
    private String categoryName;
}
