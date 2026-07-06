package jp.co.ambl.javaeats.order.service;

import jp.co.ambl.javaeats.order.dto.OrderRequest;
import jp.co.ambl.javaeats.order.dto.OrderResponse;
import jp.co.ambl.javaeats.order.mapper.OrderMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class OrderService {

    @Autowired
    private OrderMapper orderMapper;

    /**
     * ユーザーIDに紐づく注文履歴一覧を取得
     */
    public List<OrderResponse> getOrderHistory(String userId) {
        return orderMapper.findHistoryByUserId(userId);
    }

    /**
     * ユーザーIDに紐づく注文サマリー（合計件数・合計金額）を取得
     */
    public OrderResponse getOrderSummary(String userId) {
        return orderMapper.getOrderSummary(userId);
    }

    /**
     * 新規注文を登録する（ビジネスロジック・金額計算・日時設定を含む）
     */
    @Transactional
    public void createOrder(OrderRequest request) {
        // TODO: 商品マスターから単価を取得して金額を算出する
        // 現状は、MyBatisのSQL実行で PropertyNotFound エラーが出るのを防ぐために、
        // 必須の計算項目を仮値、日時は現在日時（String型）で補完して登録する
        
        if (request.getOrderPrice() == null) {
            request.setOrderPrice(1000 * request.getQuantity()); // 仮の計算: 単価1000円
        }
        if (request.getShippingFee() == null) {
            request.setShippingFee(350); // 仮の配送料
        }
        if (request.getDiscount() == null) {
            request.setDiscount(0); // 仮の割引
        }
        if (request.getTotalPrice() == null) {
            request.setTotalPrice(request.getOrderPrice() + request.getShippingFee() - request.getDiscount());
        }
        if (request.getOrderDate() == null) {
            request.setOrderDate(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }

        orderMapper.insert(request);
    }
}
