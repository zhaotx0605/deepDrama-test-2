package com.deepdrama.service;

import com.alibaba.fastjson.JSONObject;
import com.deepdrama.common.PageResult;
import com.deepdrama.entity.Script;
import com.deepdrama.query.ScriptQuery;

import java.util.List;
import java.util.Map;

/**
 * 剧本服务接口
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public interface ScriptService {
    
    /**
     * 获取剧本列表(带分页)
     */
    PageResult<Script> getScriptList(ScriptQuery query);
    
    /**
     * 根据ID获取剧本详情
     */
    Script getScriptById(Long id);
    
    /**
     * 创建剧本
     */
    Script createScript(JSONObject params);
    
    /**
     * 更新剧本
     */
    Script updateScript(Long id, JSONObject params);
    
    /**
     * 删除剧本
     */
    boolean deleteScript(Long id);
    
    /**
     * 获取排行榜
     */
    List<Script> getRankings(Integer limit);
    
    /**
     * 获取筛选选项
     */
    Map<String, List<String>> getOptions();
    
    /**
     * 获取状态分布
     */
    List<Map<String, Object>> getStatusDistribution(String startDate, String endDate);
    
    /**
     * 获取来源分布
     */
    List<Map<String, Object>> getSourceDistribution(String startDate, String endDate);
    
    /**
     * 获取团队分布
     */
    List<Map<String, Object>> getTeamDistribution(String startDate, String endDate);
}
