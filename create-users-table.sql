-- ============================================================================
-- Tabla de Usuarios con Roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- En producción usar bcrypt
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('administrador', 'usuario')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuarios de ejemplo
-- Contraseña: admin123 (en producción debería estar hasheada)
INSERT INTO users (username, password, full_name, role) VALUES
('admin', 'admin123', 'Administrador del Sistema', 'administrador'),
('usuario1', 'user123', 'Usuario Regular', 'usuario')
ON CONFLICT (username) DO NOTHING;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comentarios
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema con roles';
COMMENT ON COLUMN users.role IS 'Rol del usuario: administrador o usuario';
