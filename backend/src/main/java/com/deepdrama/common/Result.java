package com.deepdrama.common;

import java.io.Serializable;

/**
 * 统一响应结果封装类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
public class Result<T> implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private Boolean success;
    private Integer code;
    private String message;
    private T data;
    
    public Result() {}
    
    public Result(Boolean success, Integer code, String message, T data) {
        this.success = success;
        this.code = code;
        this.message = message;
        this.data = data;
    }
    
    /**
     * 成功响应(无数据)
     */
    public static <T> Result<T> success() {
        return new Result<T>(true, 200, "操作成功", null);
    }
    
    /**
     * 成功响应(带数据)
     */
    public static <T> Result<T> success(T data) {
        return new Result<T>(true, 200, "操作成功", data);
    }
    
    /**
     * 成功响应(带消息和数据)
     */
    public static <T> Result<T> success(String message, T data) {
        return new Result<T>(true, 200, message, data);
    }
    
    /**
     * 失败响应
     */
    public static <T> Result<T> error(String message) {
        return new Result<T>(false, 500, message, null);
    }
    
    /**
     * 失败响应(带错误码)
     */
    public static <T> Result<T> error(Integer code, String message) {
        return new Result<T>(false, code, message, null);
    }
    
    // Getter and Setter
    public Boolean getSuccess() {
        return success;
    }
    
    public void setSuccess(Boolean success) {
        this.success = success;
    }
    
    public Integer getCode() {
        return code;
    }
    
    public void setCode(Integer code) {
        this.code = code;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public T getData() {
        return data;
    }
    
    public void setData(T data) {
        this.data = data;
    }
}
