package com.deepdrama.entity;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 剧本实体类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class Script implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private Long id;
    private String scriptId;
    private String name;
    private String preview;
    private String fileUrl;
    private String tags;
    private String sourceType;
    private String team;
    private String status;
    private String genre;
    private String contentType;
    private Integer isProject;
    private String projectOwner;
    private String projectName;
    private String remarks;
    private String submitUser;
    private String writer;
    private String contentTeam;
    private String producer;
    private String producerTeam;
    private String feishuUrl;
    private String assignStatus;
    private Date submitDate;
    private BigDecimal avgScore;
    private Integer ratingCount;
    private Date createdAt;
    private Date updatedAt;
    
    // Getter and Setter
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getScriptId() {
        return scriptId;
    }
    
    public void setScriptId(String scriptId) {
        this.scriptId = scriptId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getPreview() {
        return preview;
    }
    
    public void setPreview(String preview) {
        this.preview = preview;
    }
    
    public String getFileUrl() {
        return fileUrl;
    }
    
    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }
    
    public String getTags() {
        return tags;
    }
    
    public void setTags(String tags) {
        this.tags = tags;
    }
    
    public String getSourceType() {
        return sourceType;
    }
    
    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }
    
    public String getTeam() {
        return team;
    }
    
    public void setTeam(String team) {
        this.team = team;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getGenre() {
        return genre;
    }
    
    public void setGenre(String genre) {
        this.genre = genre;
    }
    
    public String getContentType() {
        return contentType;
    }
    
    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
    
    public Integer getIsProject() {
        return isProject;
    }
    
    public void setIsProject(Integer isProject) {
        this.isProject = isProject;
    }
    
    public String getProjectOwner() {
        return projectOwner;
    }
    
    public void setProjectOwner(String projectOwner) {
        this.projectOwner = projectOwner;
    }
    
    public String getProjectName() {
        return projectName;
    }
    
    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }
    
    public String getRemarks() {
        return remarks;
    }
    
    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }
    
    public String getSubmitUser() {
        return submitUser;
    }
    
    public void setSubmitUser(String submitUser) {
        this.submitUser = submitUser;
    }
    
    public String getWriter() {
        return writer;
    }
    
    public void setWriter(String writer) {
        this.writer = writer;
    }
    
    public String getContentTeam() {
        return contentTeam;
    }
    
    public void setContentTeam(String contentTeam) {
        this.contentTeam = contentTeam;
    }
    
    public String getProducer() {
        return producer;
    }
    
    public void setProducer(String producer) {
        this.producer = producer;
    }
    
    public String getProducerTeam() {
        return producerTeam;
    }
    
    public void setProducerTeam(String producerTeam) {
        this.producerTeam = producerTeam;
    }
    
    public String getFeishuUrl() {
        return feishuUrl;
    }
    
    public void setFeishuUrl(String feishuUrl) {
        this.feishuUrl = feishuUrl;
    }
    
    public String getAssignStatus() {
        return assignStatus;
    }
    
    public void setAssignStatus(String assignStatus) {
        this.assignStatus = assignStatus;
    }
    
    public Date getSubmitDate() {
        return submitDate;
    }
    
    public void setSubmitDate(Date submitDate) {
        this.submitDate = submitDate;
    }
    
    public BigDecimal getAvgScore() {
        return avgScore;
    }
    
    public void setAvgScore(BigDecimal avgScore) {
        this.avgScore = avgScore;
    }
    
    public Integer getRatingCount() {
        return ratingCount;
    }
    
    public void setRatingCount(Integer ratingCount) {
        this.ratingCount = ratingCount;
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
}
