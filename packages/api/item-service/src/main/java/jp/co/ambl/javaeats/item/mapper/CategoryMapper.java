package jp.co.ambl.javaeats.item.mapper;

import jp.co.ambl.javaeats.shared.entity.Category;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface CategoryMapper {
    List<Category> findAll();
}
