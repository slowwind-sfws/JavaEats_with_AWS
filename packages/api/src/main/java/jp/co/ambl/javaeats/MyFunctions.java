package jp.co.ambl.javaeats;

import java.util.function.Function;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;

@Configuration
public class MyFunctions {
    // これがLambdaのロジックになる
    @Bean
    public Function<MyRequest, MyResponse> uppercase() {
        return input -> new MyResponse((input.getSei()+input.getMei()).toUpperCase());
    }

    @Bean
    public Function<MyRequest, MyResponse> lowercase() {
        return input -> new MyResponse((input.getSei()+input.getMei()).toLowerCase());
    }
}

@Data
class MyRequest {
    String sei;
    String mei;
}

@Data
@AllArgsConstructor(access = AccessLevel.PACKAGE)
class MyResponse {
    String fullname = "HOGEhoge";
}