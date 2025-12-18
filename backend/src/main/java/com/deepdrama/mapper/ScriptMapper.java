package com.deepdrama.mapper;

import com.deepdrama.entity.Script;
import com.deepdrama.query.ScriptQuery;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 剧本Mapper接口
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
@Mapper
public interface ScriptMapper {
    
    /**
     * 查询剧本列表(带分页)
     */
    List<Script> selectList(@Param("query") ScriptQuery query);
    
    /**
     * 查询总数
     */
    Long selectCount(@Param("query") ScriptQuery query);
    
    /**
     * 根据ID查询
     */
    Script selectById(@Param("id") Long id);
    
    /**
     * 根据剧本编号查询
     */
    Script selectByScriptId(@Param("scriptId") String scriptId);
    
    /**
     * 插入剧本
     */
    int insert(@Param("script") Script script);
    
    /**
     * 更新剧本
     */
    int update(@Param("script") Script script);
    
    /**
     * 删除剧本
     */
    int deleteById(@Param("id") Long id);
    
    /**
     * 获取状态分布
     */
    List<Map<String, Object>> getStatusDistribution(@Param("startDate") String startDate, 
                                                     @Param("endDate") String endDate);
    
    /**
     * 获取来源分布
     */
    List<Map<String, Object>> getSourceDistribution(@Param("startDate") String startDate, 
                                                      @Param("endDate") String endDate);
    
    /**
     * 获取团队分布
     */
    List<Map<String, Object>> getTeamDistribution(@Param("startDate") String startDate, 
                                                    @Param("endDate") String endDate);
    
    /**
     * 获取内容团队列表
     */
    List<String> getContentTeamOptions();
    
    /**
     * 获取编剧列表
     */
    List<String> getWriterOptions();
    
    /**
     * 获取制片列表
     */
    List<String> getProducerOptions();
}
