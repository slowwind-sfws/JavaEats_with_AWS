package jp.co.ambl.javaeats.item.function;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.co.ambl.javaeats.item.dto.ItemSearchRequest;
import jp.co.ambl.javaeats.item.dto.ItemResponse;
import jp.co.ambl.javaeats.shared.entity.Category;
import jp.co.ambl.javaeats.shared.util.ResponseUtility;
import jp.co.ambl.javaeats.item.mapper.CategoryMapper;
import jp.co.ambl.javaeats.item.mapper.ItemMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
                // // リクエスト内のAuthorizationヘッダーを取得してデバッグ出力するコード例
                // String authHeader = event.getHeaders().get("Authorization");
                // if (authHeader != null && authHeader.startsWith("Bearer ")) {
                //     String jwtToken = authHeader.substring(7);
                //     System.out.println("Received Cognito JWT Token: " + jwtToken);

                //     // (検証実験時) ローカルなので、一旦JWTライブラリ等でデコードして、
                //     // クレーム（ユーザーIDやメールアドレスなど）を表示し、正しく認証連携できていることを確認
                // }

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
                return ResponseUtility.ok(objectMapper.writeValueAsString(items));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
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
                    return ResponseUtility.notFound();
                }
                return ResponseUtility.ok(objectMapper.writeValueAsString(item));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }

    @Bean
    public Supplier<List<Category>> listCategories() {
        return () -> categoryMapper.findAll();
    }
}
