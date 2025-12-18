package com.deepdrama;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 短剧评分系统启动类
 * 
 * @author DeepDrama Team
 * @date 2025-12-17
 */
@SpringBootApplication
@MapperScan("com.deepdrama.mapper")
public class ScoreSystemApplication {
    public static void main(String[] args) {
        SpringApplication.run(ScoreSystemApplication.class, args);
    }
}
