package com.example.demo.repository;

import com.example.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // Spring Boot จะรู้เองว่าต้องไปหา user จาก email หรือ username
    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);
    // เช็คว่ามี email หรือ ชื่อผู้ใช้นี้ในระบบแล้วหรือยัง (มีประโยชน์ตอนสมัครสมาชิก)
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
}