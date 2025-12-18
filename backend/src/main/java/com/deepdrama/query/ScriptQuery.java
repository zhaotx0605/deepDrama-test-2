package com.deepdrama.query;

import java.io.Serializable;
import java.util.List;

/**
 * 剧本查询条件类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class ScriptQuery implements Serializable {
    private static final long serialVersionUID = 1L;
    
    // 分页参数
    private Integer page = 1;
    private Integer limit = 10;
    
    // 筛选条件
    private String tab;  // pending(待评分), claimed(待认领), project(已立项), abandoned(已废弃)
    private Boolean unrated;
    private String assignStatus;
    private List<String> statuses;  // 多选:一卡初稿/改稿中/完整剧本/终稿/已废弃
    private String sourceType;      // 外部投稿/内部团队/合作剧组/版权购买
    private String genre;           // 男频/女频/皆可
    private String team;
    private String contentTeam;
    private String producerTeam;
    private Boolean isProject;
    private String keyword;         // 剧本名称或编号
    
    // 排序参数
    private String sortBy;
    private String sortOrder = "desc";
    
    // 日期范围
    private String startDate;
    private String endDate;
    
    // 评分范围
    private Double minScore;
    private Double maxScore;
    
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
    
    public String getTab() {
        return tab;
    }
    
    public void setTab(String tab) {
        this.tab = tab;
    }
    
    public Boolean getUnrated() {
        return unrated;
    }
    
    public void setUnrated(Boolean unrated) {
        this.unrated = unrated;
    }
    
    public String getAssignStatus() {
        return assignStatus;
    }
    
    public void setAssignStatus(String assignStatus) {
        this.assignStatus = assignStatus;
    }
    
    public List<String> getStatuses() {
        return statuses;
    }
    
    public void setStatuses(List<String> statuses) {
        this.statuses = statuses;
    }
    
    public String getSourceType() {
        return sourceType;
    }
    
    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }
    
    public String getGenre() {
        return genre;
    }
    
    public void setGenre(String genre) {
        this.genre = genre;
    }
    
    public String getTeam() {
        return team;
    }
    
    public void setTeam(String team) {
        this.team = team;
    }
    
    public String getContentTeam() {
        return contentTeam;
    }
    
    public void setContentTeam(String contentTeam) {
        this.contentTeam = contentTeam;
    }
    
    public String getProducerTeam() {
        return producerTeam;
    }
    
    public void setProducerTeam(String producerTeam) {
        this.producerTeam = producerTeam;
    }
    
    public Boolean getIsProject() {
        return isProject;
    }
    
    public void setIsProject(Boolean isProject) {
        this.isProject = isProject;
    }
    
    public String getKeyword() {
        return keyword;
    }
    
    public void setKeyword(String keyword) {
        this.keyword = keyword;
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
}
