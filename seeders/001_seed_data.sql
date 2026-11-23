BEGIN;

-- 1. Insertar Roles base
INSERT INTO roles (name, description) VALUES
    ('admin', 'Acceso total al sistema y gestión de usuarios'),
    ('moderator', 'Puede consultar y suspender usuarios, sin eliminar roles'),
    ('user', 'Usuario estándar con acceso únicamente a su propio perfil')
ON CONFLICT (name) DO NOTHING;

-- 2. Insertar Permisos granulares
INSERT INTO permissions (slug, description) VALUES
    ('users:read', 'Listar y consultar información de usuarios'),
    ('users:update', 'Actualizar datos de otros usuarios'),
    ('users:suspend', 'Suspender o reactivar cuentas de usuario'),
    ('roles:manage', 'Crear roles y asignar permisos')
ON CONFLICT (slug) DO NOTHING;

-- 3. Asignar todos los permisos al rol 'admin'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- 4. Asignar permisos limitados al rol 'moderator'
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.slug IN ('users:read', 'users:suspend')
WHERE r.name = 'moderator'
ON CONFLICT DO NOTHING;

-- 5. Usuario Administrador de prueba (contraseña ejemplo hasheada con bcrypt)
INSERT INTO users (full_name, email, password_hash, role_id, status)
VALUES (
    'Admin Principal',
    'admin@practica.local',
    '$2b$12$bG8TyE2lg3IPGJxK25STheaxYFgtiFDIVWjgzYGYsfW3q/ske8bi2',
    (SELECT id FROM roles WHERE name = 'admin'),
    'active'
)
ON CONFLICT (email) DO NOTHING;

COMMIT;