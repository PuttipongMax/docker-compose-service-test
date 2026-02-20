package com.example.demo.model;

import jakarta.persistence.*; // Spring Boot 3 ต้องใช้ jakarta ไม่ใช่ javax
import lombok.Data; // ถ้าไม่ได้ลง Lombok ให้สร้าง Getter/Setter เอง

@Entity
@Table(name = "users") // ตั้งชื่อตารางใน DB ว่า users
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String role; // เช่น admin, user

    // Getter & Setter (เผื่อไม่ได้ใช้ Lombok)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}