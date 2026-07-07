package jp.co.ambl.javaeats.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {
    private String id;
    private String userName;
    private int rankCode;
    private String zipCode;
    private String address;
    private String phoneNumber;
}
