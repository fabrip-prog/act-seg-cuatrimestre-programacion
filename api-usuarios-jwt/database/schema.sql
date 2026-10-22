CREATE DATABASE IF NOT EXISTS sistema_web_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sistema_web_db;

CREATE TABLE IF NOT EXISTS estados_usuario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  descripcion VARCHAR(50) NOT NULL UNIQUE
) ENGINE = InnoDB;

INSERT IGNORE INTO estados_usuario (id, descripcion) VALUES
  (1, 'Activo'),
  (2, 'Inactivo'),
  (3, 'Suspendido');

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,
  rol           VARCHAR(50)  NOT NULL DEFAULT 'usuario_estandar',
  estado_id     INT          NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_usuario_estado
    FOREIGN KEY (estado_id)
    REFERENCES estados_usuario(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE = InnoDB;
