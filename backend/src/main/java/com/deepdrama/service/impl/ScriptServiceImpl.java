package com.deepdrama.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.deepdrama.common.PageResult;
import com.deepdrama.entity.Script;
import com.deepdrama.mapper.ScriptMapper;
import com.deepdrama.query.ScriptQuery;
import com.deepdrama.service.ScriptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * 剧本服务实现类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
@Service
public class ScriptServiceImpl implements ScriptService {
    
    @Autowired
    private ScriptMapper scriptMapper;
    
    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");
    
    @Override
    public PageResult<Script> getScriptList(ScriptQuery query) {
        // 查询列表
        List<Script> list = scriptMapper.selectList(query);
        
        // 查询总数
        Long total = scriptMapper.selectCount(query);
        
        return PageResult.of(total, query.getPage(), query.getLimit(), list);
    }
    
    @Override
    public Script getScriptById(Long id) {
        return scriptMapper.selectById(id);
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Script createScript(JSONObject params) {
        Script script = new Script();
        
        // 使用FastJSON解析参数
        script.setScriptId(params.getString("scriptId"));
        script.setName(params.getString("name"));
        script.setPreview(params.getString("preview"));
        script.setFileUrl(params.getString("fileUrl"));
        script.setTags(params.getString("tags"));
        script.setSourceType(params.getString("sourceType"));
        script.setTeam(params.getString("team"));
        script.setStatus(params.getString("status"));
        script.setGenre(params.getString("genre"));
        script.setContentType(params.getString("contentType"));
        script.setIsProject(params.getInteger("isProject"));
        script.setProjectOwner(params.getString("projectOwner"));
        script.setProjectName(params.getString("projectName"));
        script.setRemarks(params.getString("remarks"));
        script.setSubmitUser(params.getString("submitUser"));
        script.setWriter(params.getString("writer"));
        script.setContentTeam(params.getString("contentTeam"));
        script.setProducer(params.getString("producer"));
        script.setProducerTeam(params.getString("producerTeam"));
        script.setFeishuUrl(params.getString("feishuUrl"));
        script.setAssignStatus(params.getString("assignStatus"));
        
        // 日期处理
        String submitDateStr = params.getString("submitDate");
        if (submitDateStr != null && !submitDateStr.isEmpty()) {
            try {
                script.setSubmitDate(DATE_FORMAT.parse(submitDateStr));
            } catch (Exception e) {
                script.setSubmitDate(new Date());
            }
        } else {
            script.setSubmitDate(new Date());
        }
        
        // 初始化评分字段
        script.setAvgScore(BigDecimal.ZERO);
        script.setRatingCount(0);
        
        // 插入数据库
        scriptMapper.insert(script);
        
        return script;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Script updateScript(Long id, JSONObject params) {
        Script script = scriptMapper.selectById(id);
        if (script == null) {
            return null;
        }
        
        // 使用FastJSON更新字段
        if (params.containsKey("name")) {
            script.setName(params.getString("name"));
        }
        if (params.containsKey("preview")) {
            script.setPreview(params.getString("preview"));
        }
        if (params.containsKey("fileUrl")) {
            script.setFileUrl(params.getString("fileUrl"));
        }
        if (params.containsKey("tags")) {
            script.setTags(params.getString("tags"));
        }
        if (params.containsKey("sourceType")) {
            script.setSourceType(params.getString("sourceType"));
        }
        if (params.containsKey("team")) {
            script.setTeam(params.getString("team"));
        }
        if (params.containsKey("status")) {
            script.setStatus(params.getString("status"));
        }
        if (params.containsKey("genre")) {
            script.setGenre(params.getString("genre"));
        }
        if (params.containsKey("contentType")) {
            script.setContentType(params.getString("contentType"));
        }
        if (params.containsKey("isProject")) {
            script.setIsProject(params.getInteger("isProject"));
        }
        if (params.containsKey("projectOwner")) {
            script.setProjectOwner(params.getString("projectOwner"));
        }
        if (params.containsKey("projectName")) {
            script.setProjectName(params.getString("projectName"));
        }
        if (params.containsKey("remarks")) {
            script.setRemarks(params.getString("remarks"));
        }
        if (params.containsKey("submitUser")) {
            script.setSubmitUser(params.getString("submitUser"));
        }
        if (params.containsKey("writer")) {
            script.setWriter(params.getString("writer"));
        }
        if (params.containsKey("contentTeam")) {
            script.setContentTeam(params.getString("contentTeam"));
        }
        if (params.containsKey("producer")) {
            script.setProducer(params.getString("producer"));
        }
        if (params.containsKey("producerTeam")) {
            script.setProducerTeam(params.getString("producerTeam"));
        }
        if (params.containsKey("feishuUrl")) {
            script.setFeishuUrl(params.getString("feishuUrl"));
        }
        if (params.containsKey("assignStatus")) {
            script.setAssignStatus(params.getString("assignStatus"));
        }
        if (params.containsKey("submitDate")) {
            String submitDateStr = params.getString("submitDate");
            try {
                script.setSubmitDate(DATE_FORMAT.parse(submitDateStr));
            } catch (Exception ignored) {}
        }
        
        // 更新数据库
        scriptMapper.update(script);
        
        return script;
    }
    
    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteScript(Long id) {
        Script script = scriptMapper.selectById(id);
        if (script == null) {
            return false;
        }
        
        int rows = scriptMapper.deleteById(id);
        return rows > 0;
    }
    
    @Override
    public List<Script> getRankings(Integer limit) {
        ScriptQuery query = new ScriptQuery();
        query.setSortBy("avgScore");
        query.setSortOrder("desc");
        query.setPage(1);
        query.setLimit(limit);
        
        return scriptMapper.selectList(query);
    }
    
    @Override
    public Map<String, List<String>> getOptions() {
        Map<String, List<String>> options = new HashMap<String, List<String>>();
        
        options.put("contentTeams", scriptMapper.getContentTeamOptions());
        options.put("writers", scriptMapper.getWriterOptions());
        options.put("producers", scriptMapper.getProducerOptions());
        
        return options;
    }
    
    @Override
    public List<Map<String, Object>> getStatusDistribution(String startDate, String endDate) {
        return scriptMapper.getStatusDistribution(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> getSourceDistribution(String startDate, String endDate) {
        return scriptMapper.getSourceDistribution(startDate, endDate);
    }
    
    @Override
    public List<Map<String, Object>> getTeamDistribution(String startDate, String endDate) {
        return scriptMapper.getTeamDistribution(startDate, endDate);
    }
}
