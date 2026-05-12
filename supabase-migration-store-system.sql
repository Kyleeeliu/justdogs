-- Store System Migration
-- This creates tables for store items, shopping carts, orders, and order items

-- Store Items Table
CREATE TABLE IF NOT EXISTS store_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    tags TEXT[], -- Array of tags for categorization
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Shopping Cart Table (for temporary storage before checkout)
CREATE TABLE IF NOT EXISTS shopping_cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_item_id UUID REFERENCES store_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, store_item_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS store_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Human-readable order number
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'separate')),
    notes TEXT, -- Customer notes
    admin_notes TEXT, -- Admin internal notes
    collection_note TEXT, -- Custom collection note sent to parent
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id)
);

-- Order Items Table (items within each order)
CREATE TABLE IF NOT EXISTS store_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES store_orders(id) ON DELETE CASCADE,
    store_item_id UUID REFERENCES store_items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0), -- Price at time of order
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_items_active ON store_items(is_active);
CREATE INDEX IF NOT EXISTS idx_store_items_tags ON store_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_user ON store_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_created ON store_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON store_order_items(order_id);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    
    -- Get count of orders today + 1
    SELECT COUNT(*) + 1 INTO counter
    FROM store_orders 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Pad with zeros to make it 4 digits
    new_number := new_number || LPAD(counter::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON store_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_store_items_updated_at
    BEFORE UPDATE ON store_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_shopping_cart_updated_at
    BEFORE UPDATE ON shopping_cart
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_store_orders_updated_at
    BEFORE UPDATE ON store_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies

-- Store Items: Everyone can read active items, only admins can modify
ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active store items" ON store_items
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage store items" ON store_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Shopping Cart: Users can only access their own cart
ALTER TABLE shopping_cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart" ON shopping_cart
    FOR ALL USING (auth.uid() = user_id);

-- Store Orders: Users can view their own orders, admins can view all
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON store_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON store_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" ON store_orders
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND status = 'pending'
    );

CREATE POLICY "Admins can manage all orders" ON store_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Order Items: Inherit permissions from orders
ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items" ON store_order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM store_orders 
            WHERE store_orders.id = order_id 
            AND store_orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create order items for their orders" ON store_order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM store_orders 
            WHERE store_orders.id = order_id 
            AND store_orders.user_id = auth.uid()
            AND store_orders.status = 'pending'
        )
    );

CREATE POLICY "Admins can manage all order items" ON store_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert some sample store items for testing
INSERT INTO store_items (name, description, photo_url, tags, price, stock_quantity) VALUES
('Premium Dog Food - 15kg', 'High-quality dry dog food suitable for all breeds', '/images/dog-food-premium.jpg', ARRAY['food', 'premium', 'dry'], 89.99, 50),
('Dog Training Treats', 'Small training treats perfect for positive reinforcement', '/images/training-treats.jpg', ARRAY['treats', 'training'], 12.50, 100),
('Rope Toy', 'Durable rope toy for interactive play', '/images/rope-toy.jpg', ARRAY['toys', 'interactive'], 15.99, 25),
('Dog Collar - Medium', 'Adjustable collar for medium-sized dogs', '/images/collar-medium.jpg', ARRAY['accessories', 'collar'], 24.99, 30),
('Dog Shampoo', 'Gentle shampoo for sensitive skin', '/images/dog-shampoo.jpg', ARRAY['grooming', 'care'], 18.75, 40);

COMMENT ON TABLE store_items IS 'Store items that can be purchased by parents';
COMMENT ON TABLE shopping_cart IS 'Temporary storage for items before checkout';
COMMENT ON TABLE store_orders IS 'Customer orders with approval workflow';
COMMENT ON TABLE store_order_items IS 'Individual items within each order';