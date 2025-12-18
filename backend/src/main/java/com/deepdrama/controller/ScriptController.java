package com.deepdrama.controller;

import com.alibaba.fastjson.JSONObject;
import com.deepdrama.common.PageResult;
import com.deepdrama.common.Result;
import com.deepdrama.entity.Script;
import com.deepdrama.query.ScriptQuery;
import com.deepdrama.service.ScriptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 剧本管理Controller
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
@RestController
@RequestMapping("/scripts")
@CrossOrigin(origins = "*")
public class ScriptController {
    
    @Autowired
    private ScriptService scriptService;
    
    /**
     * 获取剧本列表(带分页和筛选)
     * POST /api/scripts
     */
    @PostMapping
    public Result<PageResult<Script>> getScripts(@RequestBody ScriptQuery query) {
        try {
            PageResult<Script> result = scriptService.getScriptList(query);
            return Result.success(result);
        } catch (Exception e) {
            return Result.error("查询剧本列表失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取剧本详情
     * GET /api/scripts/{id}
     */
    @GetMapping("/{id}")
    public Result<Script> getScriptById(@PathVariable Long id) {
        try {
            Script script = scriptService.getScriptById(id);
            if (script == null) {
                return Result.error(404, "剧本不存在");
            }
            return Result.success(script);
        } catch (Exception e) {
            return Result.error("查询剧本详情失败: " + e.getMessage());
        }
    }
    
    /**
     * 创建剧本
     * POST /api/scripts/create
     */
    @PostMapping("/create")
    public Result<Script> createScript(@RequestBody JSONObject params) {
        try {
            Script script = scriptService.createScript(params);
            return Result.success("创建成功", script);
        } catch (Exception e) {
            return Result.error("创建剧本失败: " + e.getMessage());
        }
    }
    
    /**
     * 更新剧本
     * PUT /api/scripts/{id}
     */
    @PutMapping("/{id}")
    public Result<Script> updateScript(@PathVariable Long id, @RequestBody JSONObject params) {
        try {
            Script script = scriptService.updateScript(id, params);
            if (script == null) {
                return Result.error(404, "剧本不存在");
            }
            return Result.success("更新成功", script);
        } catch (Exception e) {
            return Result.error("更新剧本失败: " + e.getMessage());
        }
    }
    
    /**
     * 删除剧本
     * DELETE /api/scripts/{id}
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteScript(@PathVariable Long id) {
        try {
            boolean success = scriptService.deleteScript(id);
            if (!success) {
                return Result.error(404, "剧本不存在");
            }
            return Result.success("删除成功", null);
        } catch (Exception e) {
            return Result.error("删除剧本失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取剧本排行榜
     * GET /api/scripts/rankings
     */
    @GetMapping("/rankings")
    public Result<List<Script>> getRankings(@RequestParam(defaultValue = "50") Integer limit) {
        try {
            List<Script> rankings = scriptService.getRankings(limit);
            return Result.success(rankings);
        } catch (Exception e) {
            return Result.error("查询排行榜失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取筛选选项
     * GET /api/scripts/options
     */
    @GetMapping("/options")
    public Result<Map<String, List<String>>> getOptions() {
        try {
            Map<String, List<String>> options = scriptService.getOptions();
            return Result.success(options);
        } catch (Exception e) {
            return Result.error("查询选项失败: " + e.getMessage());
        }
    }
}
