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

    // public String getSei() {
    //     return this.sei;
    // }

    // public String getMei() {
    //     return this.mei;
    // }
}

@Data
@AllArgsConstructor(access = AccessLevel.PACKAGE)
class MyResponse {
    String fullname = "HOGEhoge";

    // public MyResponse(String out) {
    //     this.fullname = out;
    // }

    // public String getFullname() {
    //     return this.fullname;
    // }
}