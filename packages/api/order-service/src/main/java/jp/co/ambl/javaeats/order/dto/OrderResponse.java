package jp.co.ambl.javaeats.order.dto;

import lombok.Data;

@Data
public class OrderResponse {
    private Integer id;
    // private Integer userId;
    // private Integer itemId;
    private String itemName;
    private Integer quantity;
    private Integer orderPrice;
    // private Integer shippingFee;
    // private Integer discount;
    private Integer totalPrice;
    private String orderDate;

    // findHistoryByUserId / getOrderSummary で追加される項目
    private String shopName;
    // private Integer orderId;
    private Integer totalCount;
    private Long totalAmount;
}
