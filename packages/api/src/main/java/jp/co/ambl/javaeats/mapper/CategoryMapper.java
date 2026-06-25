package jp.co.ambl.javaeats.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import jp.co.ambl.javaeats.entity.Category;

@Mapper
public interface CategoryMapper {
    // 全カテゴリを取得する
    List<Category> findAll();
}