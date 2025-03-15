// backend/src/main/java/com/edwn/unihack/controller/HelloController.java
package com.edwn.unihack.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "Hello World from Spring Boot :)";
    }
}