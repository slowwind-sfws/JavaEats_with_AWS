package jp.co.ambl.javaeats.order.mapper;

import jp.co.ambl.javaeats.order.dto.OrderRequest;
import jp.co.ambl.javaeats.order.dto.OrderResponse;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface OrderMapper {
    void insert(OrderRequest request);
    List<OrderResponse> findHistoryByUserId(Integer userId);
    OrderResponse getOrderSummary(Integer userId);
}
