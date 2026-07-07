package jp.co.ambl.javaeats.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRegisterRequest {
    // 本番では UserFunctions が Cognito claims から上書きする。
    // SAM local（オーソライザーなし）時のフォールバック用にクライアントから受け取る。
    private String id;
    private String userName;
}
