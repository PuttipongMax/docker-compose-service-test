package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.JwtService; // <-- อย่าลืม import JwtService ที่เราสร้างไว้
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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

    @Autowired
    private JwtService jwtService; // <-- Inject JwtService เข้ามาใช้งาน

    // DTO สำหรับรับค่า Login
    public static class LoginRequest {
        public String username;
        public String password;
        // ถ้าระบบจริงมีการใช้ email ด้วย อย่าลืมเพิ่ม public String email; นะครับ
    }

    // DTO สำหรับรับค่า Register (เพิ่ม Email)
    public static class RegisterRequest {
        public String username;
        public String email;
        public String password;
    }

    // --- 2. ระบบ Verify (ตรวจสอบข้อมูลเฉยๆ ไม่แจก Token) ---
    @PostMapping("/verify")
    public ResponseEntity<?> verify(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(request.password, user.getPasswordHash())) {
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

    // --- 1. ระบบ Login (สร้างและแจก JWT Token) ---
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // ค้นหา User จาก Username
        Optional<User> userOpt = userRepository.findByUsername(request.username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // ตรวจสอบรหัสผ่านที่ส่งมา กับที่ Hash ไว้ในฐานข้อมูล
            if (passwordEncoder.matches(request.password, user.getPasswordHash())) {
                
                // 🔑 รหัสผ่านถูกต้อง! ให้ JwtService สร้าง Token
                String token = jwtService.generateToken(user);
                
                // ส่ง Token และข้อมูล User กลับไปให้ Frontend / Express
                return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "token", token,
                    "user", Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "email", user.getEmail(),
                        "role", user.getRole()
                    )
                ));
            }
        }
        
        // ถ้ารหัสผ่านผิดหรือไม่พบผู้ใช้ ให้ตอบกลับเป็น 401 Unauthorized
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid username or password"));
    }

    // --- 3. ระบบ Register (สร้าง User ใหม่) ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        // แนะนำให้เช็คก่อนว่ามี Username นี้ในระบบแล้วหรือยัง
        if (userRepository.findByUsername(request.username).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Username is already taken!"));
        }

        // ควรเช็ค Email ซ้ำด้วย (ถ้าในอนาคตมี Repository.findByEmail)
        /*
        if (userRepository.findByEmail(request.email).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email is already registered!"));
        }
        */

        User user = new User();
        user.setUsername(request.username);
        user.setEmail(request.email); // ⚠️ เพิ่มการรับ Email ก่อนเซฟลง DB
        
        // ⚠️ แก้ไขจุดที่ 1: เปลี่ยนมาใช้ setPasswordHash()
        user.setPasswordHash(passwordEncoder.encode(request.password)); 
        
        // ⚠️ แก้ไขจุดที่ 3: เอา user.setRole("user") ออก ให้ @PrePersist จัดการแทน
        
        userRepository.save(user);
        
        return ResponseEntity.ok(Map.of("message", "User created successfully"));
    }
}