package jp.co.ambl.javaeats.item.function;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.co.ambl.javaeats.item.dto.ItemSearchRequest;
import jp.co.ambl.javaeats.item.dto.ItemResponse;
import jp.co.ambl.javaeats.item.entity.Category;
import jp.co.ambl.javaeats.item.mapper.CategoryMapper;
import jp.co.ambl.javaeats.item.mapper.ItemMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;

@Configuration
public class ItemFunctions {

    @Autowired
    private ItemMapper itemMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> listItems() {
        return event -> {
            try {
                ItemSearchRequest request = new ItemSearchRequest();
                Map<String, String> params = event.getQueryStringParameters();
                if (params != null) {
                    request.setKeyword(params.get("keyword"));
                    String categoryId = params.get("categoryId");
                    if (categoryId != null) {
                        request.setCategoryId(Integer.valueOf(categoryId));
                    }
                }
                List<ItemResponse> items = itemMapper.searchItems(request);
                return ok(objectMapper.writeValueAsString(items));
            } catch (Exception e) {
                return error(e.getMessage());
            }
        };
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> getItem() {
        return event -> {
            try {
                String idStr = event.getPathParameters().get("id");
                ItemResponse item = itemMapper.findById(Integer.valueOf(idStr));
                if (item == null) {
                    return notFound();
                }
                return ok(objectMapper.writeValueAsString(item));
            } catch (Exception e) {
                return error(e.getMessage());
            }
        };
    }

    @Bean
    public Supplier<List<Category>> listCategories() {
        return () -> categoryMapper.findAll();
    }

    private APIGatewayProxyResponseEvent ok(String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(headers)
                .withBody(body);
    }

    private APIGatewayProxyResponseEvent notFound() {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(404)
                .withBody("{\"message\":\"Not found\"}");
    }

    private APIGatewayProxyResponseEvent error(String message) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(500)
                .withBody("{\"message\":\"" + message + "\"}");
    }
}
