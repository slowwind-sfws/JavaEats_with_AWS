package jp.co.ambl.javaeats.user;

import jp.co.ambl.javaeats.user.dto.UserRegisterRequest;
import jp.co.ambl.javaeats.user.dto.UserResponse;
import jp.co.ambl.javaeats.user.dto.UserUpdateRequest;
import jp.co.ambl.javaeats.user.entity.User;
import jp.co.ambl.javaeats.user.mapper.UserMapper;
import jp.co.ambl.javaeats.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional // テスト終了後にロールバックするため、DBを汚さない
class UserServiceApplicationTests {

    @Autowired
    private UserService userService;

    @Autowired
    private UserMapper userMapper;

    @Test
    void contextLoads() {
        // コンテキストの起動を確認
    }

    @Test
    void testRegisterUser_Success() {
        // 準備
        String testUserId = "junit-test-sub-101";
        UserRegisterRequest request = UserRegisterRequest.builder()
                .userName("テスト太郎")
                .build();

        // 実行
        UserResponse result = userService.registerUser(testUserId, request);

        // 検証 (戻り値)
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUserId);
        assertThat(result.getUserName()).isEqualTo("テスト太郎");
        assertThat(result.getRankCode()).isEqualTo(1); // 初期ランク1
        assertThat(result.getZipCode()).isNull();

        // データベースから再確認
        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser).isNotNull();
        assertThat(dbUser.getUserName()).isEqualTo("テスト太郎");
        assertThat(dbUser.getRankCode()).isEqualTo(1);
    }

    @Test
    void testRegisterUser_Duplicate_Id_Upsert() {
        // 準備：最初に1件登録しておく
        String testUserId = "junit-test-sub-102";
        UserRegisterRequest request1 = UserRegisterRequest.builder()
                .userName("テスト太郎")
                .build();
        userService.registerUser(testUserId, request1);

        // 実行：同一IDで、別の名前で再度登録リクエスト (UPSERT)
        UserRegisterRequest request2 = UserRegisterRequest.builder()
                .userName("テスト太郎(変更後)")
                .build();
        UserResponse result = userService.registerUser(testUserId, request2);

        // 検証：重複エラーにならず、名前が更新されること（べき等性の確認）
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUserId);
        assertThat(result.getUserName()).isEqualTo("テスト太郎(変更後)");

        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser).isNotNull();
        assertThat(dbUser.getUserName()).isEqualTo("テスト太郎(変更後)");
    }

    @Test
    void testRegisterUser_Upsert_PreservesExistingProfile() {
        // 準備：ユーザーを登録し、プロフィールを更新しておく
        String testUserId = "junit-test-sub-104";
        userService.registerUser(testUserId, UserRegisterRequest.builder().userName("テスト次郎").build());
        userService.updateUser(testUserId, UserUpdateRequest.builder()
                .userName("テスト次郎")
                .zipCode("150-0001")
                .address("東京都渋谷区神南1-1")
                .phoneNumber("080-1111-2222")
                .build());

        // 実行：同一IDで再度 registerUser（UPSERT）
        userService.registerUser(testUserId, UserRegisterRequest.builder().userName("テスト次郎(再登録)").build());

        // 検証：zipCode・address・phoneNumber は ON DUPLICATE KEY UPDATE の対象外のため保持される
        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser.getZipCode()).isEqualTo("150-0001");
        assertThat(dbUser.getAddress()).isEqualTo("東京都渋谷区神南1-1");
        assertThat(dbUser.getPhoneNumber()).isEqualTo("080-1111-2222");
        assertThat(dbUser.getRankCode()).isEqualTo(1);
    }

    @Test
    void testGetUser_Success() {
        // 田中 太郎 (data.sql に登録されているはずのユーザー)
        String userId = "00000000-0000-0000-0000-000000000001";

        // 実行
        UserResponse result = userService.getUser(userId);

        // 検証
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(userId);
        assertThat(result.getUserName()).isEqualTo("田中 太郎");
        assertThat(result.getZipCode()).isEqualTo("100-0001");
        assertThat(result.getAddress()).isEqualTo("東京都千代田区千代田1-1");
        assertThat(result.getPhoneNumber()).isEqualTo("03-1234-5678");
    }

    @Test
    void testGetUser_NotFound() {
        // 存在しないユーザーID
        String notExistId = "non-existent-sub-999";

        // 実行
        UserResponse result = userService.getUser(notExistId);

        // 検証
        assertThat(result).isNull();
    }

    @Test
    void testUpdateUser_Success() {
        // 準備：テストユーザーの仮登録
        String testUserId = "junit-test-sub-103";
        UserRegisterRequest registerRequest = UserRegisterRequest.builder()
                .userName("テスト花子")
                .build();
        userService.registerUser(testUserId, registerRequest);

        // 実行：プロフィールの更新
        UserUpdateRequest updateRequest = UserUpdateRequest.builder()
                .userName("テスト花子(更新)")
                .zipCode("123-4567")
                .address("愛知県名古屋市中村区")
                .phoneNumber("090-0000-0000")
                .build();
        UserResponse result = userService.updateUser(testUserId, updateRequest);

        // 検証 (戻り値)
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testUserId);
        assertThat(result.getUserName()).isEqualTo("テスト花子(更新)");
        assertThat(result.getZipCode()).isEqualTo("123-4567");
        assertThat(result.getAddress()).isEqualTo("愛知県名古屋市中村区");
        assertThat(result.getPhoneNumber()).isEqualTo("090-0000-0000");

        // DB直接検証
        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser).isNotNull();
        assertThat(dbUser.getUserName()).isEqualTo("テスト花子(更新)");
        assertThat(dbUser.getZipCode()).isEqualTo("123-4567");
        assertThat(dbUser.getAddress()).isEqualTo("愛知県名古屋市中村区");
        assertThat(dbUser.getPhoneNumber()).isEqualTo("090-0000-0000");
    }

    @Test
    void testUpdateUser_PreservesRankCode() {
        // 準備：ユーザー登録（rankCode=1 で初期化される）
        String testUserId = "junit-test-sub-105";
        userService.registerUser(testUserId, UserRegisterRequest.builder().userName("テスト三郎").build());

        // 実行：プロフィール更新（updateUser は rankCode を変更しない）
        userService.updateUser(testUserId, UserUpdateRequest.builder()
                .userName("テスト三郎(更新)")
                .zipCode("460-0001")
                .address("愛知県名古屋市中区三の丸1-1")
                .phoneNumber("052-0000-0000")
                .build());

        // 検証：rankCode が 1 のまま保持されていること
        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser.getRankCode()).isEqualTo(1);
    }

    @Test
    void testUpdateUser_NullFields_ClearsNullableValues() {
        // 準備：ユーザー登録後にプロフィールを設定
        String testUserId = "junit-test-sub-106";
        userService.registerUser(testUserId, UserRegisterRequest.builder().userName("テスト四郎").build());
        userService.updateUser(testUserId, UserUpdateRequest.builder()
                .userName("テスト四郎")
                .zipCode("530-0001")
                .address("大阪府大阪市北区梅田1-1")
                .phoneNumber("06-0000-0000")
                .build());

        // 実行：nullable フィールドを null で更新（PUT セマンティクス：null で上書き）
        UserResponse result = userService.updateUser(testUserId, UserUpdateRequest.builder()
                .userName("テスト四郎")
                .zipCode(null)
                .address(null)
                .phoneNumber(null)
                .build());

        // 検証：nullable フィールドは null に更新される（PUT の仕様）
        assertThat(result.getZipCode()).isNull();
        assertThat(result.getAddress()).isNull();
        assertThat(result.getPhoneNumber()).isNull();

        User dbUser = userMapper.getUserById(testUserId);
        assertThat(dbUser.getZipCode()).isNull();
        assertThat(dbUser.getAddress()).isNull();
        assertThat(dbUser.getPhoneNumber()).isNull();
    }

    @Test
    void testUpdateUser_UserNotFound_ThrowsException() {
        // 存在しないユーザーIDに対して更新を試みる
        String nonExistId = "non-existent-sub-999";
        UserUpdateRequest updateRequest = UserUpdateRequest.builder()
                .userName("だれか")
                .build();

        // 検証：例外が発生すること
        assertThatThrownBy(() -> userService.updateUser(nonExistId, updateRequest))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found with id");
    }
}
