/**
 * Layer 2 Phase 6 TypeScript Types: Module G (Commerce, Payments & Billing)
 */

export type OrderType =
  | 'NEW_MEMBERSHIP'
  | 'RENEWAL'
  | 'EXTENSION'
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'REJOIN'
  | 'CLASS_PURCHASE'
  | 'APPOINTMENT_PURCHASE'
  | 'OTHER';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentProvider =
  | 'RAZORPAY'
  | 'ICICI_POS'
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'STRIPE'
  | 'OTHER';

export type PaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type RefundStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface OrderItem {
  id: string;
  order: string;
  item_type: 'PACKAGE' | 'CLASS' | 'APPOINTMENT' | 'OTHER';
  package?: string;
  package_version?: string;
  package_price?: string;
  class_template?: string;
  class_price?: string;
  appointment_type?: string;
  item_name_snapshot: string;
  quantity: string | number;
  unit_price_snapshot: string | number;
  tax_percent_snapshot: string | number;
  discount_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  created_at?: string;
}

export interface PaymentTransaction {
  id: string;
  order: string;
  user_profile?: string;
  provider: PaymentProvider;
  payment_method?: string;
  provider_transaction_id?: string;
  idempotency_key?: string;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  paid_at?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Refund {
  id: string;
  payment_transaction: string;
  order: string;
  amount: string | number;
  reason_code?: string;
  reason_text?: string;
  provider_reference?: string;
  status: RefundStatus;
  requested_by_user?: string;
  approved_by_user?: string;
  created_at?: string;
}

export interface MemberInvoice {
  id: string;
  invoice_number: string;
  order: string;
  user_profile?: string;
  member_name?: string;
  branch: string;
  branch_name?: string;
  subtotal: string | number;
  discount_amount: string | number;
  reward_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  currency: string;
  status: InvoiceStatus;
  file?: string;
  issued_at?: string;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  lead?: string;
  lead_name?: string;
  user_profile?: string;
  member_name?: string;
  branch: string;
  branch_name?: string;
  sold_by_user?: string;
  order_type: OrderType;
  status: OrderStatus;
  subtotal: string | number;
  discount_amount: string | number;
  reward_amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  currency: string;
  source: string;
  notes?: string;
  items?: OrderItem[];
  payments?: PaymentTransaction[];
  invoices?: MemberInvoice[];
  created_at?: string;
  updated_at?: string;
}

export interface PaymentLink {
  id: string;
  lead?: string;
  user_profile?: string;
  order: string;
  provider: string;
  external_reference?: string;
  payment_url?: string;
  amount: string | number;
  currency: string;
  expires_at: string;
  status: 'CREATED' | 'SENT' | 'OPENED' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  created_by_user?: string;
  created_at?: string;
}
