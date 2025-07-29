-- RevisadU! Database Schema
-- Criado em: 2024

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum para tipos de usuário
CREATE TYPE user_type AS ENUM ('client', 'mechanic');

-- Enum para status de manutenção
CREATE TYPE maintenance_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Enum para status de pagamento
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'cancelled');

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    user_type user_type NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    google_id VARCHAR(255),
    facebook_id VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perfis de mecânicos/oficinas
CREATE TABLE mechanic_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    website VARCHAR(255),
    description TEXT,
    working_hours JSONB,
    services_offered TEXT[], -- Array de serviços oferecidos
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    total_services INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de veículos
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(10) NOT NULL,
    renavam VARCHAR(20),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    vin VARCHAR(17),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    mileage INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, license_plate)
);

-- Tabela de manutenções
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    maintenance_date DATE NOT NULL,
    status maintenance_status DEFAULT 'pending',
    client_notes TEXT,
    mechanic_notes TEXT,
    approval_date TIMESTAMP,
    rejection_date TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de evidências (fotos, documentos)
CREATE TABLE maintenance_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de avaliações
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de notificações
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id UUID, -- ID relacionado (manutenção, avaliação, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de sessões (para OAuth)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar dados da FIPE
CREATE TABLE fipe_brands (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fipe_models (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES fipe_brands(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    nome VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, codigo)
);

CREATE TABLE fipe_years (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES fipe_models(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    nome VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, codigo)
);

CREATE TABLE fipe_values (
    id SERIAL PRIMARY KEY,
    year_id INTEGER REFERENCES fipe_years(id) ON DELETE CASCADE,
    valor VARCHAR(50) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(200) NOT NULL,
    ano_modelo INTEGER NOT NULL,
    combustivel VARCHAR(50) NOT NULL,
    codigo_fipe VARCHAR(20) NOT NULL,
    mes_referencia VARCHAR(50) NOT NULL,
    tipo_veiculo INTEGER NOT NULL,
    sigla_combustivel VARCHAR(5) NOT NULL,
    data_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year_id)
);

-- Tabela para controle de atualizações
CREATE TABLE fipe_updates (
    id SERIAL PRIMARY KEY,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    total_brands INTEGER DEFAULT 0,
    total_models INTEGER DEFAULT 0,
    total_years INTEGER DEFAULT 0,
    total_values INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_maintenance_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_mechanic_id ON maintenance_records(mechanic_id);
CREATE INDEX idx_maintenance_client_id ON maintenance_records(client_id);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);
CREATE INDEX idx_maintenance_date ON maintenance_records(maintenance_date);
CREATE INDEX idx_reviews_mechanic_id ON reviews(mechanic_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Índices para performance
CREATE INDEX idx_fipe_brands_codigo ON fipe_brands(codigo);
CREATE INDEX idx_fipe_models_brand_id ON fipe_models(brand_id);
CREATE INDEX idx_fipe_models_codigo ON fipe_models(codigo);
CREATE INDEX idx_fipe_years_model_id ON fipe_years(model_id);
CREATE INDEX idx_fipe_values_year_id ON fipe_values(year_id);
CREATE INDEX idx_fipe_updates_last_update ON fipe_updates(last_update);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mechanic_profiles_updated_at BEFORE UPDATE ON mechanic_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fipe_brands_updated_at BEFORE UPDATE ON fipe_brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fipe_models_updated_at BEFORE UPDATE ON fipe_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fipe_years_updated_at BEFORE UPDATE ON fipe_years FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fipe_values_updated_at BEFORE UPDATE ON fipe_values FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular a média de avaliações do mecânico
CREATE OR REPLACE FUNCTION update_mechanic_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE mechanic_profiles 
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews r
            WHERE r.mechanic_id = NEW.mechanic_id AND r.is_public = TRUE
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM reviews r
            WHERE r.mechanic_id = NEW.mechanic_id AND r.is_public = TRUE
        )
    WHERE user_id = NEW.mechanic_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar rating do mecânico quando uma avaliação é inserida/atualizada
CREATE TRIGGER update_mechanic_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_mechanic_rating();

-- Inserir dados de exemplo (opcional para desenvolvimento)
INSERT INTO users (email, first_name, last_name, user_type, email_verified) VALUES
('admin@revisadu.com', 'Admin', 'RevisadU', 'client', true),
('mecanico@exemplo.com', 'João', 'Silva', 'mechanic', true),
('cliente@exemplo.com', 'Maria', 'Santos', 'client', true);

-- Comentários para documentação
COMMENT ON TABLE users IS 'Tabela principal de usuários do sistema';
COMMENT ON TABLE mechanic_profiles IS 'Perfis detalhados de mecânicos e oficinas';
COMMENT ON TABLE vehicles IS 'Veículos cadastrados pelos clientes';
COMMENT ON TABLE maintenance_records IS 'Registros de manutenções realizadas';
COMMENT ON TABLE maintenance_evidence IS 'Evidências (fotos/documentos) das manutenções';
COMMENT ON TABLE reviews IS 'Avaliações dos clientes sobre os mecânicos';
COMMENT ON TABLE notifications IS 'Notificações do sistema para os usuários'; 