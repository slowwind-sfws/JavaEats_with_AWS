package jp.co.ambl.javaeats.user.mapper;

import jp.co.ambl.javaeats.user.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    void insertUser(User user);
    User getUserById(String id);
    void updateUser(User user);
}
