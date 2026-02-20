package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/internal/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // DTO สำหรับรับค่า Login
    public static class LoginRequest {
        public String username;
        public String password;
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(request.password, user.getPassword())) {
                return ResponseEntity.ok(Map.of(
                    "isValid", true,
                    "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "role", user.getRole()
                    )
                ));
            }
        }
        return ResponseEntity.ok(Map.of("isValid", false));
    }

    // สร้าง User ใหม่ (สำหรับทดสอบ)
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest request) {
        User user = new User();
        user.setUsername(request.username);
        user.setPassword(passwordEncoder.encode(request.password));
        user.setRole("user");
        userRepository.save(user);
        return ResponseEntity.ok("User created");
    }
}