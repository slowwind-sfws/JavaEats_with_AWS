package jp.co.ambl.javaeats.user.function;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jp.co.ambl.javaeats.user.dto.UserRegisterRequest;
import jp.co.ambl.javaeats.user.dto.UserResponse;
import jp.co.ambl.javaeats.user.dto.UserUpdateRequest;
import jp.co.ambl.javaeats.user.service.UserService;
import jp.co.ambl.javaeats.shared.util.ResponseUtility;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;
import java.util.function.Function;

@Configuration
public class UserFunctions {

    @Autowired
    private UserService userService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> registerUser() {
        return request -> {
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> claims = (Map<String, String>) request.getRequestContext().getAuthorizer().get("claims");
                String userId = claims.get("sub");
                UserRegisterRequest registerRequest = objectMapper.readValue(request.getBody(), UserRegisterRequest.class);
                UserResponse response = userService.registerUser(userId, registerRequest);
                return ResponseUtility.ok(objectMapper.writeValueAsString(response));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> getUser() {
        return request -> {
            try {
                Map<String, String> pathParams = request.getPathParameters();
                String id = (pathParams != null) ? pathParams.get("id") : null;
                if (id == null || id.isBlank()) {
                    return ResponseUtility.error(400, "User ID is required");
                }
                UserResponse response = userService.getUser(id);
                if (response == null) {
                    return ResponseUtility.notFound();
                }
                return ResponseUtility.ok(objectMapper.writeValueAsString(response));
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }

    @Bean
    public Function<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> updateUser() {
        return request -> {
            try {
                Map<String, String> pathParams = request.getPathParameters();
                String id = (pathParams != null) ? pathParams.get("id") : null;
                if (id == null || id.isBlank()) {
                    return ResponseUtility.error(400, "User ID is required");
                }
                UserUpdateRequest updateRequest = objectMapper.readValue(request.getBody(), UserUpdateRequest.class);
                UserResponse response = userService.updateUser(id, updateRequest);
                return ResponseUtility.ok(objectMapper.writeValueAsString(response));
            } catch (IllegalArgumentException e) {
                return ResponseUtility.notFound();
            } catch (Exception e) {
                return ResponseUtility.error(500, e.getMessage());
            }
        };
    }
}
