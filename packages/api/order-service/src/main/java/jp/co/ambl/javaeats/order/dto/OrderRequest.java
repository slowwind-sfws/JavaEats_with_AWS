package jp.co.ambl.javaeats.order.dto;

import lombok.Data;

@Data
public class OrderRequest {
    private Integer id; // MyBatisの useGeneratedKeys="true" keyProperty="id" に対応するために追加
    private Integer userId;
    private Integer itemId;
    private Integer quantity;

    // ビジネスロジック/インサート用に追加する項目
    private Integer orderPrice;
    private Integer shippingFee;
    private Integer discount;
    private Integer totalPrice;
    private String orderDate;
}
