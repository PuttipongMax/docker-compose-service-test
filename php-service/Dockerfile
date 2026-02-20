FROM php:8.1-apache

# 1. ติดตั้ง Library ของระบบที่จำเป็นสำหรับ Postgres (libpq-dev)
RUN apt-get update && apt-get install -y libpq-dev

# 2. สั่งติดตั้ง Extension ทั้ง MySQL และ PostgreSQL
RUN docker-php-ext-install mysqli pdo pdo_mysql pgsql pdo_pgsql

# (บรรทัด COPY src ไม่จำเป็นต้องใส่ถ้าใช้ Volumes แล้ว แต่ใส่ไว้ก็ไม่เสียหายครับ)
COPY ./src /var/www/html