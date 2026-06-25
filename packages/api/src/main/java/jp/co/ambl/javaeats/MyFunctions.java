package jp.co.ambl.javaeats;

import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jp.co.ambl.javaeats.entity.Category;
import jp.co.ambl.javaeats.form.ItemForm;
import jp.co.ambl.javaeats.mapper.CategoryMapper;
import jp.co.ambl.javaeats.mapper.ItemMapper;

@Configuration
public class MyFunctions {
    @Autowired
    private ItemMapper itemMapper;

    @Autowired
    private CategoryMapper categoryMapper;

    @Bean
    public Function<ItemForm, List<ItemForm>> list() {
        return input -> itemMapper.searchItems(input);
    }

    @Bean
    public Supplier<List<Category>> category() {
        return () -> categoryMapper.findAll();
    }
}