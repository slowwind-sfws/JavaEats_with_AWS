package jp.co.ambl.javaeats;

import java.util.function.Function;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
	}

	// これがLambdaのロジックになる
    @Bean
    public Function<String, String> uppercase() {
        return input -> input.toUpperCase();
    }

}
