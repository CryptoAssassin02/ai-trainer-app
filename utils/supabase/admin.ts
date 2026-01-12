import { createClient } from "@supabase/supabase-js"
import { toDateTime } from '@/utils/helpers';
import { stripe } from '@/utils/stripe/config';
import Stripe from 'stripe';
import type { Database, Tables, TablesInsert } from '@/types/database.types';

// This function seems generally useful for creating an admin client
export function createAdminClient() {
    const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    return supabase
}

// Remove invalid type aliases
// type Product = Tables<'products'>;
// type Price = Tables<'prices'>;

// Remove constant only used by removed functions
// const TRIAL_PERIOD_DAYS = 0;

// Note: supabaseAdmin uses the SERVICE_ROLE_KEY which you must only use in a secure server-side context
// as it has admin privileges and overwrites RLS policies!
// This admin client instance might still be useful elsewhere
export const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Remove functions interacting with non-existent tables: products, prices, customers, subscriptions
/*
const upsertProductRecord = async (product: Stripe.Product) => { ... };
const upsertPriceRecord = async (price: Stripe.Price, ...) => { ... };
const deleteProductRecord = async (product: Stripe.Product) => { ... };
const deletePriceRecord = async (price: Stripe.Price) => { ... };
const upsertCustomerToSupabase = async (uuid: string, customerId: string) => { ... };
const createCustomerInStripe = async (uuid: string, email: string, ...) => { ... }; // Keep this? It interacts only with Stripe API
const createOrRetrieveCustomer = async ({ email, uuid, referral }) => { ... };
const manageSubscriptionStatusChange = async (subscriptionId: string, customerId: string, ...) => { ... };
*/

// Keep createCustomerInStripe as it only interacts with the Stripe API directly
const createCustomerInStripe = async (uuid: string, email: string, referral?: string) => {
    const customerData: Stripe.CustomerCreateParams = { metadata: { supabaseUUID: uuid, referral: referral || null }, email: email };
    const newCustomer = await stripe.customers.create(customerData);
    if (!newCustomer) throw new Error('Stripe customer creation failed.');

    return newCustomer.id;
};

// Keep copyBillingDetailsToCustomer as it interacts with Stripe API
const copyBillingDetailsToCustomer = async (
    uuid: string,
    payment_method: Stripe.PaymentMethod
) => {
    //Todo: check this assertion
    const customer = payment_method.customer as string;
    const { name, phone, address } = payment_method.billing_details;
    if (!name || !phone || !address) return;
    //@ts-ignore
    await stripe.customers.update(customer, { name, phone, address });
};
