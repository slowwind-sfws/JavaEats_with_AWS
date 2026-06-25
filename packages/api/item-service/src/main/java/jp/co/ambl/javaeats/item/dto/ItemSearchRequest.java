package jp.co.ambl.javaeats.item.dto;

import lombok.Data;

@Data
public class ItemSearchRequest {
    private String keyword;
    private Integer categoryId;
}
