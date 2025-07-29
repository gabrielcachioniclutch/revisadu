-- Script de inicialização do banco de dados RevisadU!
-- Este script é executado automaticamente quando o container PostgreSQL é criado

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Definir timezone
SET timezone = 'America/Sao_Paulo';

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE '🚗 Inicializando banco de dados RevisadU!';
    RAISE NOTICE '📅 Timezone configurado: %', current_setting('timezone');
END $$;

-- Criar banco de dados (execute como superusuário)
-- CREATE DATABASE revisadu_db;

-- Conectar ao banco de dados
-- \c revisadu_db;

-- Executar o schema principal
\i schema.sql

-- Inserir dados de exemplo para desenvolvimento
INSERT INTO users (email, first_name, last_name, user_type, email_verified, password_hash) VALUES
('admin@revisadu.com', 'Admin', 'RevisadU', 'client', true, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uOeG'), -- senha: admin123
('mecanico@exemplo.com', 'João', 'Silva', 'mechanic', true, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uOeG'), -- senha: admin123
('cliente@exemplo.com', 'Maria', 'Santos', 'client', true, '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uOeG'); -- senha: admin123

-- Inserir perfil de mecânico de exemplo
INSERT INTO mechanic_profiles (user_id, business_name, cnpj, address, city, state, zip_code, phone, description, services_offered, is_verified) VALUES
((SELECT id FROM users WHERE email = 'mecanico@exemplo.com'), 'Oficina Silva', '12.345.678/0001-90', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', '(11) 99999-9999', 'Oficina especializada em manutenção preventiva e corretiva', ARRAY['Troca de óleo', 'Freios', 'Suspensão', 'Motor', 'Elétrica'], true);

-- Inserir veículos de exemplo
INSERT INTO vehicles (user_id, license_plate, brand, model, year, color, fuel_type, transmission, mileage) VALUES
((SELECT id FROM users WHERE email = 'cliente@exemplo.com'), 'ABC-1234', 'Honda', 'Civic', 2020, 'Prata', 'Flex', 'Automático', 45000),
((SELECT id FROM users WHERE email = 'cliente@exemplo.com'), 'XYZ-5678', 'Toyota', 'Corolla', 2019, 'Branco', 'Flex', 'Automático', 38000);

-- Inserir manutenção de exemplo
INSERT INTO maintenance_records (vehicle_id, mechanic_id, client_id, title, description, service_type, total_amount, maintenance_date, status) VALUES
((SELECT id FROM vehicles WHERE license_plate = 'ABC-1234'), (SELECT id FROM users WHERE email = 'mecanico@exemplo.com'), (SELECT id FROM users WHERE email = 'cliente@exemplo.com'), 'Troca de óleo e filtros - Honda Civic', 'Troca de óleo do motor, filtro de óleo e filtro de ar. Verificação geral do veículo.', 'Troca de óleo', 150.00, CURRENT_DATE, 'pending');

-- Mensagem de sucesso
SELECT 'Banco de dados RevisadU! inicializado com sucesso!' as status; 