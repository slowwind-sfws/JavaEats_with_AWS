package jp.co.ambl.javaeats.shared.util;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;

import java.util.Map;

public class ResponseUtility {

    public static APIGatewayProxyResponseEvent ok(String body) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(200)
                .withHeaders(Map.of("Content-Type", "application/json"))
                .withBody(body);
    }

    public static APIGatewayProxyResponseEvent notFound() {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(404)
                .withHeaders(Map.of("Content-Type", "application/json"))
                .withBody("{\"message\":\"Not found\"}");
    }

    public static APIGatewayProxyResponseEvent error(int statusCode, String message) {
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(Map.of("Content-Type", "application/json"))
                .withBody("{\"message\":\"" + message + "\"}");
    }
}
