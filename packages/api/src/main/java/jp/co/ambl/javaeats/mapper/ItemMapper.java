package jp.co.ambl.javaeats.mapper;

import jp.co.ambl.javaeats.form.ItemForm;
import org.apache.ibatis.annotations.Mapper;
import java.util.List;

@Mapper
public interface ItemMapper {
    // 検索条件をもとに商品一覧を取得
    List<ItemForm> searchItems(ItemForm form);
    
    // IDをキーに商品1件を取得（注文画面用）
    ItemForm findById(Integer id);
}
