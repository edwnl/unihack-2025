package com.edwn.poc.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")  // Match all paths
                        .allowedOrigins("*") // Allow all origins
                        .allowedMethods("*") // Allow all methods
                        .allowedHeaders("*") // Allow all headers
                        .allowCredentials(false); // Must be false when allowedOrigins contains "*"
            }
        };
    }
}