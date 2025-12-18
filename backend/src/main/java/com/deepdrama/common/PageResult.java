package com.deepdrama.common;

import java.io.Serializable;
import java.util.List;

/**
 * 分页结果封装类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class PageResult<T> implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private Long total;
    private Integer page;
    private Integer limit;
    private List<T> list;
    
    public PageResult() {}
    
    public PageResult(Long total, Integer page, Integer limit, List<T> list) {
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.list = list;
    }
    
    public static <T> PageResult<T> of(Long total, Integer page, Integer limit, List<T> list) {
        return new PageResult<T>(total, page, limit, list);
    }
    
    // Getter and Setter
    public Long getTotal() {
        return total;
    }
    
    public void setTotal(Long total) {
        this.total = total;
    }
    
    public Integer getPage() {
        return page;
    }
    
    public void setPage(Integer page) {
        this.page = page;
    }
    
    public Integer getLimit() {
        return limit;
    }
    
    public void setLimit(Integer limit) {
        this.limit = limit;
    }
    
    public List<T> getList() {
        return list;
    }
    
    public void setList(List<T> list) {
        this.list = list;
    }
}
