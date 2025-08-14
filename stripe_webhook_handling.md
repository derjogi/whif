# Stripe Webhook Handling

## 1. Overview

Stripe webhooks are used to receive real-time notifications about events that happen in a Stripe account. The webhook handler will process these events to update payment transactions and user balances accordingly.

## 2. Webhook Event Types

### 2.1 Payment Intent Events

- `payment_intent.created`: A PaymentIntent has been created
- `payment_intent.succeeded`: A PaymentIntent has been successfully charged
- `payment_intent.payment_failed`: A PaymentIntent has failed to charge
- `payment_intent.canceled`: A PaymentIntent has been canceled

### 2.2 Charge Events

- `charge.succeeded`: A charge has been successfully created
- `charge.failed`: A charge has failed
- `charge.refunded`: A charge has been refunded
- `charge.dispute.created`: A charge has been disputed

### 2.3 Customer Events

- `customer.created`: A customer has been created
- `customer.updated`: A customer has been updated

## 3. Webhook Handler Implementation

### 3.1 Webhook Endpoint

```typescript
// src/routes/api/stripe/webhook/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { getStripeWebhookHandler } from '../../../../lib/server/stripe/webhookHandler';
import Stripe from 'stripe';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Get the webhook secret from environment variables
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return json({ error: 'Webhook configuration error' }, { status: 500 });
    }
    
    // Get the request body and headers
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }
    
    // Construct the Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
    
    // Verify the webhook signature
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }
    
    // Process the event
    const webhookHandler = getStripeWebhookHandler();
    await webhookHandler.handleWebhookEvent(event);
    
    // Return a 200 response to acknowledge receipt of the event
    return json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
};
```

### 3.2 Webhook Handler Service

```typescript
// src/lib/server/stripe/webhookHandler.ts
import type Stripe from 'stripe';
import type { IPaymentTransactionRepository } from '../database/interfaces';
import type { BalanceService } from '../llm/costTracking/balanceService';

export class StripeWebhookHandler {
  constructor(
    private paymentTransactionRepository: IPaymentTransactionRepository,
    private balanceService: BalanceService
  ) {}

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;
          
        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event);
          break;
          
        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;
          
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error handling webhook event ${event.type}:`, error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Find the payment transaction by Stripe payment intent ID
    const paymentTransaction = await this.paymentTransactionRepository.getByStripePaymentIntentId(
      paymentIntent.id
    );
    
    if (!paymentTransaction) {
      console.warn(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment transaction status
    await this.paymentTransactionRepository.updateStatus(paymentTransaction.id, 'succeeded');
    
    // Add credits to user balance
    await this.balanceService.addCredit(
      paymentTransaction.userId,
      parseFloat(paymentTransaction.creditAmount.toString()),
      `Credit purchase (${paymentTransaction.description})`,
      paymentTransaction.id
    );
    
    console.log(`Successfully processed payment intent: ${paymentIntent.id}`);
  }

  private async handlePaymentIntentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Find the payment transaction by Stripe payment intent ID
    const paymentTransaction = await this.paymentTransactionRepository.getByStripePaymentIntentId(
      paymentIntent.id
    );
    
    if (!paymentTransaction) {
      console.warn(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment transaction status
    await this.paymentTransactionRepository.updateStatus(paymentTransaction.id, 'failed');
    
    console.log(`Processed failed payment intent: ${paymentIntent.id}`);
  }

  private async handlePaymentIntentCanceled(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Find the payment transaction by Stripe payment intent ID
    const paymentTransaction = await this.paymentTransactionRepository.getByStripePaymentIntentId(
      paymentIntent.id
    );
    
    if (!paymentTransaction) {
      console.warn(`Payment transaction not found for payment intent: ${paymentIntent.id}`);
      return;
    }
    
    // Update payment transaction status
    await this.paymentTransactionRepository.updateStatus(paymentTransaction.id, 'canceled');
    
    console.log(`Processed canceled payment intent: ${paymentIntent.id}`);
  }

  private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge;
    
    console.log(`Processed refunded charge: ${charge.id}`);
    // Additional logic for handling refunds could be implemented here
  }

  private async handleDisputeCreated(event: Stripe.Event): Promise<void> {
    const dispute = event.data.object as Stripe.Dispute;
    
    console.log(`Processed dispute created: ${dispute.id}`);
    // Additional logic for handling disputes could be implemented here
  }
}
```

## 4. Security Considerations

### 4.1 Webhook Signature Verification

All webhook requests must be verified using the webhook secret:

1. Extract the `Stripe-Signature` header from the request
2. Use `stripe.webhooks.constructEvent()` to verify the signature
3. Reject requests with invalid signatures

### 4.2 Idempotency

To prevent duplicate processing of events:

1. Each webhook event has a unique ID
2. Store processed event IDs with timestamps
3. Check if an event has already been processed before handling it
4. Expire stored event IDs after a reasonable period (e.g., 3 days)

```typescript
// Example implementation of idempotency check
private async isEventProcessed(eventId: string): Promise<boolean> {
  // Check if event ID exists in processed_events table or cache
  // Implementation depends on chosen storage mechanism
  return false;
}

private async markEventAsProcessed(eventId: string): Promise<void> {
  // Store event ID with timestamp
  // Implementation depends on chosen storage mechanism
}
```

## 5. Error Handling

### 5.1 Retry Logic

Stripe will retry webhook delivery if a non-2xx response is received:

1. Implement exponential backoff for internal errors
2. Return appropriate HTTP status codes:
   - 200: Successfully processed
   - 400: Invalid request data (won't retry)
   - 500: Internal server error (will retry)

### 5.2 Logging

All webhook events should be logged:

1. Log event type and ID
2. Log processing results
3. Log errors with full context
4. Include correlation IDs for tracing

## 6. Testing

### 6.1 Unit Tests

Test each event handler method with mock data:

1. Test successful payment processing
2. Test failed payment handling
3. Test edge cases (missing transactions, etc.)
4. Test error conditions

### 6.2 Integration Tests

Test the full webhook flow:

1. Send test events to the webhook endpoint
2. Verify database updates
3. Verify balance changes
4. Verify proper HTTP responses