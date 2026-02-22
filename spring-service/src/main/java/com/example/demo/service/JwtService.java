package com.example.demo.service;
// package com.example.demo.service;

import com.example.demo.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {
 // ดึง Secret Key มาจากไฟล์ application.properties
 // ตัวอย่างใน properties: jwt.secret=my-32-character-ultra-secure-and-ultra-long-secret
 @Value("${jwt.secret}")
 private String secretKey;

 // ระยะเวลาหมดอายุของ Token (เช่น 1 วัน = 1000 * 60 * 60 * 24)
 @Value("${jwt.expiration}")
 private long jwtExpiration;

 public String generateToken(User user){
  Map<String, Object> claims = new HashMap<>();
  // ใส่ข้อมูลที่เราอยากให้ Express.js แกะไปใช้งานได้
  claims.put("userId", user.getId());
  claims.put("role", user.getRole());

  return Jwts.builder()
          .setClaims(claims)
          .setSubject(user.getUsername()) // ใส่ username เป็น subject ของ token
          .setIssuedAt(new Date(System.currentTimeMillis())) // เวลาที่สร้าง token
          .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration)) // เวลาหมดอายุของ token
          .signWith(getSignInKey(), SignatureAlgorithm.HS256) // เซ็นด้วย secret key
          .compact();
 }

 private Key getSignInKey(){
  byte[] keyBytes = secretKey.getBytes();
  return Keys.hmacShaKeyFor(keyBytes);
 }
 
}
