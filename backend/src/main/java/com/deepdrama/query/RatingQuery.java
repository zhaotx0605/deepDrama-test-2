package com.deepdrama.query;

import java.io.Serializable;

/**
 * 评分查询条件类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class RatingQuery implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 分页参数
    private Integer page = 1;
    private Integer limit = 10;
    
    // 筛选条件
    private Long scriptId;
    private Long userId;
    private String userRole;
    private String startDate;
    private String endDate;
    private Double minScore;
    private Double maxScore;
    
    // 排序参数
    private String sortBy;
    private String sortOrder = "desc";
    
    // 计算offset
    public Integer getOffset() {
        return (page - 1) * limit;
    }
    
    // Getter and Setter
    public Integer getPage() {
        return page;
    }
    
    public void setPage(Integer page) {
        if (page != null && page > 0) {
            this.page = page;
        }
    }
    
    public Integer getLimit() {
        return limit;
    }
    
    public void setLimit(Integer limit) {
        if (limit != null && limit > 0) {
            this.limit = limit;
        }
    }
    
    public Long getScriptId() {
        return scriptId;
    }
    
    public void setScriptId(Long scriptId) {
        this.scriptId = scriptId;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public String getUserRole() {
        return userRole;
    }
    
    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }
    
    public String getStartDate() {
        return startDate;
    }
    
    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }
    
    public String getEndDate() {
        return endDate;
    }
    
    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }
    
    public Double getMinScore() {
        return minScore;
    }
    
    public void setMinScore(Double minScore) {
        this.minScore = minScore;
    }
    
    public Double getMaxScore() {
        return maxScore;
    }
    
    public void setMaxScore(Double maxScore) {
        this.maxScore = maxScore;
    }
    
    public String getSortBy() {
        return sortBy;
    }
    
    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }
    
    public String getSortOrder() {
        return sortOrder;
    }
    
    public void setSortOrder(String sortOrder) {
        this.sortOrder = sortOrder;
    }
}
