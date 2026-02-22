package com.example.demo.model;

import jakarta.persistence.*; // Spring Boot 3 ต้องใช้ jakarta ไม่ใช่ javax
// import lombok.Data; // ถ้าไม่ได้ลง Lombok ให้สร้าง Getter/Setter เอง
import java.time.ZonedDateTime;

@Entity
@Table(name = "users") // ตั้งชื่อตารางใน DB ว่า users
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String role; // เช่น "USER" หรือ "ADMIN"

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    // ระบบจะใส่วันที่และเวลาให้ตอนสร้าง Record ใหม่โดยอัตโนมัติ
    @PrePersist
    protected void onCreate() {
        createdAt = ZonedDateTime.now();
        if (role == null) {
            role = "USER"; // ตั้งค่า Default Role
        }
    }

    // --- Getters & Setters ---
    // (ถ้าโปรเจกต์คุณใช้ Lombok สามารถลบ Getters/Setters ด้านล่างนี้ออก แล้วใส่ @Data หรือ @Getter @Setter ไว้บนคลาสแทนได้เลยครับ)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public ZonedDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(ZonedDateTime createdAt) { this.createdAt = createdAt; }
}