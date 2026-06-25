package jp.co.ambl.javaeats.item.mapper;

import jp.co.ambl.javaeats.item.dto.ItemSearchRequest;
import jp.co.ambl.javaeats.item.dto.ItemResponse;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ItemMapper {
    List<ItemResponse> searchItems(ItemSearchRequest request);
    ItemResponse findById(Integer id);
}
