package jp.co.ambl.javaeats.order.function;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.co.ambl.javaeats.order.dto.OrderRequest;
import jp.co.ambl.javaeats.order.dto.OrderResponse;
import jp.co.ambl.javaeats.order.service.OrderService;
import jp.co.ambl.javaeats.shared.util.ResponseUtility;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Configuration
public class OrderFunctions {

    @Autowired
    private OrderService orderService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> createOrder() {
        return request -> {
            try {
                OrderRequest orderRequest = objectMapper.readValue(request.getBody(), OrderRequest.class);
                orderService.createOrder(orderRequest);
                return ResponseUtility.ok("{\"message\":\"Order created\"}");
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> listOrders() {
        return request -> {
            try {
                Map<String, String> params = request.getQueryStringParameters();
                String userId = (params != null) ? params.get("userId") : null;
                if (userId == null || userId.isBlank()) {
                    return ResponseUtility.error(400, "userId is required");
                }
                List<OrderResponse> orders = orderService.getOrderHistory(userId);
                if (orders == null) {
                    return ResponseUtility.notFound();
                }
                return ResponseUtility.ok(objectMapper.writeValueAsString(orders));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> getOrder() {
        return request -> {
            try {
                Map<String, String> pathParams = request.getPathParameters();
                String id = pathParams.get("id");
                OrderResponse order = orderService.getOrderSummary(id);
                if (order == null) {
                    return ResponseUtility.notFound();
                }
                return ResponseUtility.ok(objectMapper.writeValueAsString(order));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }
}
