package jp.co.ambl.javaeats.order;

import jp.co.ambl.javaeats.order.dto.OrderRequest;
import jp.co.ambl.javaeats.order.dto.OrderResponse;
import jp.co.ambl.javaeats.order.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional // テスト終了後に自動ロールバックし、DBを汚さない
class OrderServiceApplicationTests {

	@Autowired
	private OrderService orderService;

	@Test
	void contextLoads() {
		// コンテキストの正常起動確認
	}

	@Test
	void testCreateOrder_Success_WithDefaultCompletion() {
		// 準備 (送料、合計金額、日付などを省略したリクエスト)
		String testUserId = "junit-order-test-user-111";
		OrderRequest request = new OrderRequest();
		request.setUserId(testUserId);
		request.setItemId(1); // とろけるチーズバーガーセット
		request.setQuantity(2);

		// 実行 (内部で金額計算や日付の補完が行われてインサートされる)
		orderService.createOrder(request);

		// 検証：履歴を取得してデータが入っていることを確認
		List<OrderResponse> history = orderService.getOrderHistory(testUserId);
		assertThat(history).isNotEmpty();
		assertThat(history.size()).isEqualTo(1);

		OrderResponse order = history.get(0);
		assertThat(order.getItemName()).isEqualTo("とろけるチーズバーガーセット");
		assertThat(order.getShopName()).isEqualTo("Java Burger");
		assertThat(order.getQuantity()).isEqualTo(2);

		// デフォルト補完値の検証
		// OrderServiceで単価は仮で 1000 * 数量 = 2000、送料=350、合計=2350、日付=現在日時、割引=0 が補完される仕様
		assertThat(order.getOrderPrice()).isEqualTo(2000);
		assertThat(order.getTotalPrice()).isEqualTo(2350);
		assertThat(order.getOrderDate()).isNotNull().isNotBlank();
	}

	@Test
	void testGetOrderHistory_Success() {
		// 伊藤 健太 (data.sql で 5 件の注文が入っているテスト用ユーザー)
		String targetUserId = "00000000-0000-0000-0000-000000000005";

		// 実行
		List<OrderResponse> history = orderService.getOrderHistory(targetUserId);

		// 検証
		assertThat(history).isNotNull();
		assertThat(history.size()).isEqualTo(5);

		// 降順ソートの検証 (order_date が新しい順になっているか)
		OrderResponse latest = history.get(0);
		OrderResponse oldest = history.get(4);
		assertThat(latest.getOrderDate()).isGreaterThan(oldest.getOrderDate());
	}

	@Test
	void testGetOrderSummary_Success() {
		// 伊藤 健太 (data.sql で 5 件の注文が入っているテスト用ユーザー)
		String targetUserId = "00000000-0000-0000-0000-000000000005";

		// 実行
		OrderResponse summary = orderService.getOrderSummary(targetUserId);

		// 検証
		assertThat(summary).isNotNull();
		// MyBatisのサマリーSQL：COUNT(id) AS totalCount, SUM(total_price) AS totalAmount を返す
		assertThat(summary.getTotalCount()).isEqualTo(5);
		// 合計金額：3000 + 2400 + 2400 + 3000 + 1700 = 12500
		assertThat(summary.getTotalAmount()).isEqualTo(12500);
	}

	@Test
	void testGetOrderSummary_NoOrders_ReturnsZero() {
		// 注文履歴がない新規ユーザーID
		String noOrderUserId = "user-without-orders-xyz";

		// 実行
		OrderResponse summary = orderService.getOrderSummary(noOrderUserId);

		// 検証 (NULLにならず、COALESCEにより0として取得できること)
		assertThat(summary).isNotNull();
		assertThat(summary.getTotalCount()).isEqualTo(0);
		assertThat(summary.getTotalAmount()).isEqualTo(0);
	}

	@Test
	void testGetOrderHistory_NoOrders_ReturnsEmptyList() {
		// 注文履歴がない新規ユーザーID
		String noOrderUserId = "user-without-orders-xyz";

		// 実行
		List<OrderResponse> history = orderService.getOrderHistory(noOrderUserId);

		// 検証：null ではなく空リストが返ること
		assertThat(history).isNotNull();
		assertThat(history).isEmpty();
	}
}
