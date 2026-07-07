package jp.co.ambl.javaeats.item;

import jp.co.ambl.javaeats.item.dto.ItemResponse;
import jp.co.ambl.javaeats.item.mapper.CategoryMapper;
import jp.co.ambl.javaeats.item.mapper.ItemMapper;
import jp.co.ambl.javaeats.shared.entity.Category;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional // テスト終了後に自動ロールバック（参照系のみだが安全のため付与）
class ItemServiceApplicationTests {

    @Autowired
    private ItemMapper itemMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Test
    void contextLoads() {
        // コンテキストの正常起動確認
    }

    @Test
    void testSearchItems_NoParams_ReturnsAllItems() {
        // 準備
        jp.co.ambl.javaeats.item.dto.ItemSearchRequest req = new jp.co.ambl.javaeats.item.dto.ItemSearchRequest();

        // 実行 (パラメータなし)
        List<ItemResponse> results = itemMapper.searchItems(req);

        // 検証 (data.sqlにより、10数件の商品が登録されていることを期待)
        assertThat(results).isNotEmpty();
        assertThat(results.size()).isGreaterThanOrEqualTo(10);

        // 各商品情報の確認
        ItemResponse item = results.get(0);
        assertThat(item.getId()).isNotNull();
        assertThat(item.getItemName()).isNotBlank();
        assertThat(item.getShopName()).isNotBlank();
        assertThat(item.getCategoryName()).isNotBlank();
    }

    @Test
    void testSearchItems_WithKeyword_FiltersItems() {
        // 準備
        jp.co.ambl.javaeats.item.dto.ItemSearchRequest req = new jp.co.ambl.javaeats.item.dto.ItemSearchRequest();
        req.setKeyword("バーガー");

        // 実行 (キーワード「バーガー」)
        List<ItemResponse> results = itemMapper.searchItems(req);

        // 検証 (とろけるチーズバーガーセット、またはburger.jpgなど、該当ありを期待)
        assertThat(results).isNotEmpty();
        for (ItemResponse item : results) {
            assertThat(item.getItemName()).contains("バーガー");
        }
    }

    @Test
    void testSearchItems_WithCategoryId_FiltersItems() {
        // 1 = 洋食
        Integer categoryId = 1;
        jp.co.ambl.javaeats.item.dto.ItemSearchRequest req = new jp.co.ambl.javaeats.item.dto.ItemSearchRequest();
        req.setCategoryId(categoryId);

        // 実行
        List<ItemResponse> results = itemMapper.searchItems(req);

        // 検証 (洋食カテゴリに属する商品。Java Burgerなど)
        assertThat(results).isNotEmpty();
        for (ItemResponse item : results) {
            assertThat(item.getCategoryName()).isEqualTo("洋食");
        }
    }

    @Test
    void testFindById_Success() {
        // 商品ID 1 = とろけるチーズバーガーセット (Java Burger、洋食)
        Integer itemId = 1;

        // 実行
        ItemResponse result = itemMapper.findById(itemId);

        // 検証
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(itemId);
        assertThat(result.getItemName()).isEqualTo("とろけるチーズバーガーセット");
        assertThat(result.getPrice()).isEqualTo(1200);
        assertThat(result.getShopName()).isEqualTo("Java Burger");
        assertThat(result.getCategoryName()).isEqualTo("洋食");
    }

    @Test
    void testFindById_NotFound() {
        // 存在しないID
        Integer itemId = 99999;

        // 実行
        ItemResponse result = itemMapper.findById(itemId);

        // 検証
        assertThat(result).isNull();
    }

    @Test
    void testListCategories_ReturnsAllCategories() {
        // 実行
        List<Category> results = categoryMapper.findAll();

        // 検証 (data.sqlにて、洋食、イタリアン、和食、中華、カフェなど計9つのカテゴリが登録されているはず)
        assertThat(results).isNotEmpty();
        assertThat(results.size()).isEqualTo(9);

        // 特定のカテゴリの存在確認
        boolean hasWestern = results.stream().anyMatch(c -> "洋食".equals(c.getCategoryName()));
        boolean hasJapanese = results.stream().anyMatch(c -> "和食".equals(c.getCategoryName()));
        assertThat(hasWestern).isTrue();
        assertThat(hasJapanese).isTrue();
    }

    @Test
    void testSearchItems_WithKeywordAndCategoryId_FiltersItems() {
        // キーワード「チーズ」+ カテゴリID=1（洋食）の複合条件
        jp.co.ambl.javaeats.item.dto.ItemSearchRequest req = new jp.co.ambl.javaeats.item.dto.ItemSearchRequest();
        req.setKeyword("チーズ");
        req.setCategoryId(1);

        // 実行
        List<ItemResponse> results = itemMapper.searchItems(req);

        // 検証：件数1件以上、全件が洋食かつ商品名にチーズを含む
        assertThat(results).isNotEmpty();
        for (ItemResponse item : results) {
            assertThat(item.getCategoryName()).isEqualTo("洋食");
            assertThat(item.getItemName()).contains("チーズ");
        }
    }

    @Test
    void testSearchItems_WithNonMatchingKeyword_ReturnsEmpty() {
        // 存在しないキーワードで検索
        jp.co.ambl.javaeats.item.dto.ItemSearchRequest req = new jp.co.ambl.javaeats.item.dto.ItemSearchRequest();
        req.setKeyword("存在しないメニューXYZ");

        // 実行
        List<ItemResponse> results = itemMapper.searchItems(req);

        // 検証：空リストが返ること（nullではない）
        assertThat(results).isNotNull();
        assertThat(results).isEmpty();
    }
}
