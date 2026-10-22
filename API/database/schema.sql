-- ============================================
-- Script de creación: Base de datos y tabla usuarios
-- ============================================

CREATE DATABASE IF NOT EXISTS usuarios_varios
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE usuarios_varios;

CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL,
    email       VARCHAR(100) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    rol         VARCHAR(50)  NOT NULL DEFAULT 'usuario_estandar',
    estado_id   INT          NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
