package jp.co.ambl.javaeats.user.service;

import jp.co.ambl.javaeats.user.dto.UserRegisterRequest;
import jp.co.ambl.javaeats.user.dto.UserResponse;
import jp.co.ambl.javaeats.user.dto.UserUpdateRequest;
import jp.co.ambl.javaeats.user.entity.User;
import jp.co.ambl.javaeats.user.mapper.UserMapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    /**
     * ユーザー新規登録 (べき等な登録処理)
     */
    @Transactional
    public UserResponse registerUser(String id, UserRegisterRequest request) {
        User user = User.builder()
                .id(id)
                .userName(request.getUserName())
                .rankCode(1) // 初期値: 1(一般)
                .build();

        userMapper.insertUser(user);

        // 登録・更新後の最新状態を取得して返却
        return getUser(id);
    }

    /**
     * ユーザー情報の取得
     */
    public UserResponse getUser(String id) {
        User user = userMapper.getUserById(id);
        if (user == null) {
            return null;
        }
        return convertToResponse(user);
    }

    /**
     * ユーザープロフィールの更新
     */
    @Transactional
    public UserResponse updateUser(String id, UserUpdateRequest request) {
        User user = userMapper.getUserById(id);
        if (user == null) {
            throw new IllegalArgumentException("User not found with id: " + id);
        }

        user.setUserName(request.getUserName());
        user.setZipCode(request.getZipCode());
        user.setAddress(request.getAddress());
        user.setPhoneNumber(request.getPhoneNumber());

        userMapper.updateUser(user);

        return convertToResponse(user);
    }

    private UserResponse convertToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .rankCode(user.getRankCode())
                .zipCode(user.getZipCode())
                .address(user.getAddress())
                .phoneNumber(user.getPhoneNumber())
                .build();
    }
}
