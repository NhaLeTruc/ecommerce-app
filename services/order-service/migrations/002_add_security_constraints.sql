-- Add CHECK constraints for security and data integrity
-- Migration: 002_add_security_constraints.sql
-- Created: 2025-11-15

-- Add constraints to orders table
ALTER TABLE orders
    -- Ensure all monetary amounts are non-negative
    ADD CONSTRAINT chk_orders_subtotal_positive CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_orders_tax_amount_non_negative CHECK (tax_amount >= 0),
    ADD CONSTRAINT chk_orders_shipping_amount_non_negative CHECK (shipping_amount >= 0),
    ADD CONSTRAINT chk_orders_discount_amount_non_negative CHECK (discount_amount >= 0),
    ADD CONSTRAINT chk_orders_total_amount_positive CHECK (total_amount >= 0),

    -- Ensure reasonable maximum values (prevent overflow/abuse)
    ADD CONSTRAINT chk_orders_subtotal_max CHECK (subtotal <= 999999.99),
    ADD CONSTRAINT chk_orders_total_amount_max CHECK (total_amount <= 999999.99),

    -- Constrain status to valid values
    ADD CONSTRAINT chk_orders_status CHECK (status IN (
        'pending',
        'payment_pending',
        'payment_failed',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
    )),

    -- Constrain payment_status to valid values
    ADD CONSTRAINT chk_orders_payment_status CHECK (payment_status IN (
        'pending',
        'captured',
        'failed',
        'refunded',
        'partially_refunded'
    )),

    -- Constrain payment_method to valid values
    ADD CONSTRAINT chk_orders_payment_method CHECK (payment_method IN (
        'credit_card',
        'debit_card',
        'paypal',
        'stripe'
    )),

    -- Ensure logical timestamp ordering
    ADD CONSTRAINT chk_orders_paid_at_after_created CHECK (paid_at IS NULL OR paid_at >= created_at),
    ADD CONSTRAINT chk_orders_shipped_at_after_created CHECK (shipped_at IS NULL OR shipped_at >= created_at),
    ADD CONSTRAINT chk_orders_delivered_at_after_shipped CHECK (delivered_at IS NULL OR shipped_at IS NULL OR delivered_at >= shipped_at),
    ADD CONSTRAINT chk_orders_cancelled_at_after_created CHECK (cancelled_at IS NULL OR cancelled_at >= created_at);

-- Add constraints to order_items table
ALTER TABLE order_items
    -- Ensure prices and quantities are valid
    ADD CONSTRAINT chk_order_items_price_non_negative CHECK (price >= 0),
    ADD CONSTRAINT chk_order_items_price_max CHECK (price <= 999999.99),
    ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0),
    ADD CONSTRAINT chk_order_items_quantity_max CHECK (quantity <= 1000),
    ADD CONSTRAINT chk_order_items_subtotal_non_negative CHECK (subtotal >= 0),
    ADD CONSTRAINT chk_order_items_subtotal_max CHECK (subtotal <= 999999.99),

    -- Ensure subtotal matches price * quantity (with small tolerance for rounding)
    ADD CONSTRAINT chk_order_items_subtotal_matches CHECK (
        ABS(subtotal - (price * quantity)) < 0.01
    );

-- Add constraints to order_history table
ALTER TABLE order_history
    -- Constrain status to valid values (same as orders)
    ADD CONSTRAINT chk_order_history_status CHECK (status IN (
        'pending',
        'payment_pending',
        'payment_failed',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
    ));

-- Add comments for documentation
COMMENT ON CONSTRAINT chk_orders_status ON orders IS
    'Ensures order status is one of the valid enum values';

COMMENT ON CONSTRAINT chk_orders_payment_status ON orders IS
    'Ensures payment status is one of the valid enum values';

COMMENT ON CONSTRAINT chk_orders_subtotal_positive ON orders IS
    'Prevents negative order subtotals for security';

COMMENT ON CONSTRAINT chk_order_items_subtotal_matches ON order_items IS
    'Ensures item subtotal equals price * quantity (prevents price manipulation)';

-- Create function to validate total amount matches subtotal + tax + shipping - discount
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that total_amount = subtotal + tax_amount + shipping_amount - discount_amount
    IF ABS(NEW.total_amount - (NEW.subtotal + NEW.tax_amount + NEW.shipping_amount - NEW.discount_amount)) > 0.01 THEN
        RAISE EXCEPTION 'Order total amount does not match calculated total (subtotal + tax + shipping - discount)';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate order total on insert/update
CREATE TRIGGER validate_orders_total BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION validate_order_total();

COMMENT ON FUNCTION validate_order_total() IS
    'Validates that order total matches subtotal + tax + shipping - discount to prevent price manipulation';
