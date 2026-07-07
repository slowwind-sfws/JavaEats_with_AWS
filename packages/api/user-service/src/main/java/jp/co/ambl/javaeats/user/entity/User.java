package jp.co.ambl.javaeats.user.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    private String id;
    private String userName;
    private int rankCode;
    private String zipCode;
    private String address;
    private String phoneNumber;
}
