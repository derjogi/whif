# Stripe Integration API Endpoints

## 1. Overview

The API endpoints will provide the interface for frontend applications to interact with the Stripe payment system. All endpoints will require authentication and will be protected by the existing Supabase authentication system.

## 2. Endpoint Design

### 2.1 Get Credit Packages

**Endpoint:** `GET /api/stripe/credit-packages`

**Description:** Retrieve all available credit packages for purchase

**Authentication:** Required (authenticated user)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "package-uuid",
      "name": "Small Package",
      "description": "Perfect for light usage",
      "amount": 5.00,
      "creditAmount": 5.00,
      "isActive": true
    }
  ]
}
```

### 2.2 Create Payment Intent

**Endpoint:** `POST /api/stripe/create-payment-intent`

**Description:** Create a Stripe PaymentIntent for a credit package purchase

**Authentication:** Required (authenticated user)

**Request Body:**
```json
{
  "creditPackageId": "package-uuid",
  "paymentMethodId": "pm_card_visa" // Optional, can be added later
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_123456789_secret_abcdef",
    "paymentIntentId": "pi_123456789"
  }
}
```

### 2.3 Get Payment History

**Endpoint:** `GET /api/stripe/payment-history`

**Description:** Retrieve payment history for the authenticated user

**Authentication:** Required (authenticated user)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-uuid",
      "amount": 15.00,
      "creditAmount": 15.00,
      "status": "succeeded",
      "createdAt": "2023-01-01T00:00:00Z",
      "description": "Medium Package purchase"
    }
  ]
}
```

### 2.4 Get User Balance

**Endpoint:** `GET /api/stripe/balance`

**Description:** Retrieve the current credit balance for the authenticated user

**Authentication:** Required (authenticated user)

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 25.50,
    "currency": "usd"
  }
}
```

### 2.5 Webhook Endpoint

**Endpoint:** `POST /api/stripe/webhook`

**Description:** Handle Stripe webhook events

**Authentication:** Stripe signature verification (no user auth)

**Request Headers:**
- `Stripe-Signature`: Signature for webhook validation

**Response:**
```json
{
  "success": true
}
```

## 3. Implementation Structure

### 3.1 Server Routes

```
src/routes/
├── api/
│   ├── stripe/
│   │   ├── credit-packages/
│   │   │   └── +server.ts
│   │   ├── create-payment-intent/
│   │   │   └── +server.ts
│   │   ├── payment-history/
│   │   │   └── +server.ts
│   │   ├── balance/
│   │   │   └── +server.ts
│   │   └── webhook/
│   │       └── +server.ts
```

### 3.2 Example Implementation

#### Get Credit Packages Endpoint
```typescript
// src/routes/api/stripe/credit-packages/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { getStripeService } from '../../../../lib/server/stripe/stripeService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const stripeService = getStripeService();
    const packages = await stripeService.getCreditPackages();
    
    return json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Error fetching credit packages:', error);
    return json({
      success: false,
      error: 'Failed to fetch credit packages'
    }, { status: 500 });
  }
};
```

#### Create Payment Intent Endpoint
```typescript
// src/routes/api/stripe/create-payment-intent/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { getStripeService } from '../../../../lib/server/stripe/stripeService';

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { creditPackageId, paymentMethodId } = await request.json();
    
    if (!creditPackageId) {
      return json({
        success: false,
        error: 'Credit package ID is required'
      }, { status: 400 });
    }
    
    const userId = locals.user?.id;
    if (!userId) {
      return json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }
    
    const stripeService = getStripeService();
    const paymentIntent = await stripeService.createPaymentIntent(
      userId,
      creditPackageId,
      paymentMethodId
    );
    
    return json({
      success: true,
      data: paymentIntent
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return json({
      success: false,
      error: 'Failed to create payment intent'
    }, { status: 500 });
  }
};
```

## 4. Error Handling

All endpoints will follow consistent error handling patterns:

- 200 OK: Successful request
- 400 Bad Request: Invalid request data
- 401 Unauthorized: User not authenticated
- 403 Forbidden: User not authorized for action
- 500 Internal Server Error: Unexpected server error

Error responses will follow this format:
```json
{
  "success": false,
  "error": "Error message"
}