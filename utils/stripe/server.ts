'use server';

import Stripe from 'stripe';
import { stripe } from '@/utils/stripe/config';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/utils/supabase/admin';
import {
    getURL,
    getErrorRedirect,
    calculateTrialEndUnixTimestamp
} from '@/utils/helpers';

// Remove invalid type aliases
// type Product = Tables<'products'>;
// type Price = Tables<'prices'>;

// Remove the checkoutWithStripe function as it depends on the obsolete Price type
/* ... */

// Remove createStripePortal as it depends on the removed createOrRetrieveCustomer function
/*
export async function createStripePortal(currentPath: string) {
    // ... implementation removed ...
}
*/

// Remove createBillingPortalSession as it depends on the obsolete customers table
/* ... */

// Keep createCustomerInStripe if needed - interacts only with Stripe API
/* ... */

// Keep copyBillingDetailsToCustomer if needed - interacts only with Stripe API
/* ... */