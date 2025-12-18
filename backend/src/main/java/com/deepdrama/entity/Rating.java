package com.deepdrama.entity;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 评分记录实体类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class Rating implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private Long id;
    private Long scriptId;
    private Long userId;
    private String userRole;
    private BigDecimal contentScore;
    private BigDecimal marketScore;
    private BigDecimal complianceScore;
    private BigDecimal commercialScore;
    private BigDecimal totalScore;
    private String comments;
    private Date ratingDate;
    private Date createdAt;
    private Date updatedAt;
    
    // 关联字段(非表字段)
    private String scriptName;
    private String userName;
    
    // Getter and Setter
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
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
    
    public BigDecimal getContentScore() {
        return contentScore;
    }
    
    public void setContentScore(BigDecimal contentScore) {
        this.contentScore = contentScore;
    }
    
    public BigDecimal getMarketScore() {
        return marketScore;
    }
    
    public void setMarketScore(BigDecimal marketScore) {
        this.marketScore = marketScore;
    }
    
    public BigDecimal getComplianceScore() {
        return complianceScore;
    }
    
    public void setComplianceScore(BigDecimal complianceScore) {
        this.complianceScore = complianceScore;
    }
    
    public BigDecimal getCommercialScore() {
        return commercialScore;
    }
    
    public void setCommercialScore(BigDecimal commercialScore) {
        this.commercialScore = commercialScore;
    }
    
    public BigDecimal getTotalScore() {
        return totalScore;
    }
    
    public void setTotalScore(BigDecimal totalScore) {
        this.totalScore = totalScore;
    }
    
    public String getComments() {
        return comments;
    }
    
    public void setComments(String comments) {
        this.comments = comments;
    }
    
    public Date getRatingDate() {
        return ratingDate;
    }
    
    public void setRatingDate(Date ratingDate) {
        this.ratingDate = ratingDate;
    }
    
    public Date getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
    
    public Date getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getScriptName() {
        return scriptName;
    }
    
    public void setScriptName(String scriptName) {
        this.scriptName = scriptName;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
}
