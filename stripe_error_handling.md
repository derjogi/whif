# Stripe Integration Error Handling and Edge Cases

## 1. Overview

This document outlines the error handling strategies and edge cases that need to be considered for the Stripe integration to ensure a robust and reliable payment system.

## 2. Stripe API Error Handling

### 2.1 Common Stripe Errors

- **Card errors**: `card_declined`, `expired_card`, `incorrect_cvc`, etc.
- **Invalid request errors**: Missing or invalid parameters
- **Authentication errors**: Invalid API keys
- **Rate limit errors**: Too many requests in a short period
- **General errors**: Unexpected server errors

### 2.2 Error Response Handling

```typescript
// src/lib/server/stripe/stripeService.ts
import Stripe from 'stripe';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
  }

  async createPaymentIntent(
    userId: string,
    creditPackageId: string,
    paymentMethodId?: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // Get credit package details
      const creditPackage = await this.creditPackageRepository.getById(creditPackageId);
      if (!creditPackage) {
        throw new Error('Credit package not found');
      }

      // Create Stripe customer if needed
      let customer = await this.getOrCreateCustomer(userId);

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(creditPackage.amount.toString()) * 100), // Convert to cents
        currency: 'usd',
        customer: customer.id,
        payment_method: paymentMethodId,
        automatic_payment_methods: paymentMethodId ? undefined : {
          enabled: true,
        },
        metadata: {
          userId,
          creditPackageId,
          creditAmount: creditPackage.creditAmount.toString()
        }
      });

      // Record payment transaction
      await this.paymentTransactionRepository.create({
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: creditPackage.amount,
        creditAmount: creditPackage.creditAmount,
        status: paymentIntent.status,
        description: `${creditPackage.name} purchase`,
        stripeCustomerId: customer.id
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        switch (error.type) {
          case 'card_error':
            throw new PaymentError(`Card error: ${error.message}`, 'card_error');
          case 'invalid_request_error':
            throw new PaymentError(`Invalid request: ${error.message}`, 'invalid_request');
          case 'authentication_error':
            throw new PaymentError('Authentication failed with Stripe', 'authentication_error');
          case 'rate_limit_error':
            throw new PaymentError('Too many requests to Stripe', 'rate_limit');
          default:
            throw new PaymentError(`Stripe error: ${error.message}`, 'stripe_error');
        }
      }
      
      // Handle other errors
      throw new PaymentError(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`, 'internal_error');
    }
  }
}

// Custom error classes
export class PaymentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PaymentError';
  }
}
```

## 3. Database Error Handling

### 3.1 Transaction Rollbacks

```typescript
// Example of handling database errors with transaction rollback
async handleSuccessfulPayment(paymentIntentId: string): Promise<void> {
  // Use database transaction to ensure atomicity
  await this.unitOfWork.beginTransaction();
  
  try {
    // Get payment transaction
    const paymentTransaction = await this.paymentTransactionRepository.getByStripePaymentIntentId(paymentIntentId);
    if (!paymentTransaction) {
      throw new Error(`Payment transaction not found for payment intent: ${paymentIntentId}`);
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

    // Commit transaction
    await this.unitOfWork.commit();
  } catch (error) {
    // Rollback transaction on error
    await this.unitOfWork.rollback();
    
    // Log error for investigation
    console.error('Error handling successful payment:', error);
    
    // Re-throw error for upstream handling
    throw error;
  }
}
```

### 3.2 Retry Logic

```typescript
// Database operation with retry logic
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error instanceof PaymentError && 
          (error.code === 'card_error' || error.code === 'invalid_request')) {
        throw error;
      }
      
      // Wait with exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
}
```

## 4. Concurrent Access Issues

### 4.1 Race Conditions

When multiple requests try to modify the same user balance simultaneously:

```typescript
// In the balance service, use database-level locking
async addCredit(userId: string, amount: number, description?: string, referenceId?: string): Promise<void> {
  await this.unitOfWork.beginTransaction();
  
  try {
    // Use SELECT FOR UPDATE to lock the row during the transaction
    const balance = await this.userBalanceRepository.getByUserIdWithLock(userId);
    
    if (!balance) {
      // Create new balance with initial amount
      await this.userBalanceRepository.create({
        userId,
        balance: amount
      });
    } else {
      // Update existing balance
      const newBalance = balance.balance + amount;
      await this.userBalanceRepository.updateBalance(userId, newBalance);
    }
    
    // Record transaction
    await this.balanceTransactionRepository.create({
      userId,
      amount: amount.toString(),
      balanceBefore: balance?.balance.toString() || '0',
      balanceAfter: (balance ? balance.balance + amount : amount).toString(),
      transactionType: 'credit',
      description: description || 'Credit added to account',
      referenceId
    });
    
    await this.unitOfWork.commit();
  } catch (error) {
    await this.unitOfWork.rollback();
    throw error;
  }
}
```

## 5. Partial Failures

### 5.1 Handling Incomplete Operations

When part of a multi-step process fails:

```typescript
// Handle partial failures in payment processing
async processPayment(userId: string, creditPackageId: string): Promise<PaymentResult> {
  let paymentIntentId: string | null = null;
  
  try {
    // Step 1: Create payment intent
    const paymentIntent = await this.createPaymentIntent(userId, creditPackageId);
    paymentIntentId = paymentIntent.paymentIntentId;
    
    // Step 2: Wait for payment confirmation (this would typically be async)
    // For synchronous processing, we'd need to handle this differently
    
    return {
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId
    };
  } catch (error) {
    // If we created a payment intent but failed later, we should handle cleanup
    if (paymentIntentId) {
      try {
        // Attempt to cancel the payment intent
        await this.stripe.paymentIntents.cancel(paymentIntentId);
      } catch (cancelError) {
        console.warn('Failed to cancel payment intent during cleanup:', cancelError);
      }
      
      // Attempt to delete the payment transaction record
      try {
        const transaction = await this.paymentTransactionRepository.getByStripePaymentIntentId(paymentIntentId);
        if (transaction) {
          await this.paymentTransactionRepository.delete(transaction.id);
        }
      } catch (deleteError) {
        console.warn('Failed to delete payment transaction during cleanup:', deleteError);
      }
    }
    
    throw error;
  }
}
```

## 6. Timeout Scenarios

### 6.1 Handling API Timeouts

```typescript
// Stripe API call with timeout
async createPaymentIntentWithTimeout(
  userId: string,
  creditPackageId: string,
  timeoutMs: number = 10000
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  // Create a promise that rejects after timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new PaymentError('Stripe API timeout', 'timeout')), timeoutMs);
  });
  
  // Race the API call against the timeout
  try {
    const result = await Promise.race([
      this.createPaymentIntent(userId, creditPackageId),
      timeoutPromise
    ]);
    
    return result;
  } catch (error) {
    if (error instanceof PaymentError && error.code === 'timeout') {
      // Log timeout for monitoring
      console.warn('Stripe API timeout for user:', userId);
    }
    
    throw error;
  }
}
```

## 7. User Experience During Errors

### 7.1 Graceful Error Messages

```typescript
// Frontend error handling
async function handlePaymentError(error: any): Promise<string> {
  if (error instanceof PaymentError) {
    switch (error.code) {
      case 'card_error':
        return 'There was a problem with your card. Please check your card details and try again.';
      case 'invalid_request':
        return 'There was an error with your request. Please try again.';
      case 'authentication_error':
        return 'There was an authentication error. Please contact support.';
      case 'rate_limit':
        return 'Too many requests. Please wait a moment and try again.';
      case 'timeout':
        return 'The payment service is temporarily unavailable. Please try again in a few minutes.';
      default:
        return 'There was an error processing your payment. Please try again.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
}
```

## 8. Edge Cases

### 8.1 Duplicate Payment Processing

```typescript
// Prevent duplicate processing of the same payment intent
async handleWebhookEvent(event: Stripe.Event): Promise<void> {
  // Check if event has already been processed
  if (await this.isEventProcessed(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }
  
  try {
    // Process event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;
      // ... other cases
    }
    
    // Mark event as processed
    await this.markEventAsProcessed(event.id);
  } catch (error) {
    // Log error but don't mark as processed so it can be retried
    console.error(`Error processing event ${event.id}:`, error);
    throw error;
  }
}
```

### 8.2 Partial Refunds

```typescript
// Handle partial refunds
private async handleChargeRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  
  if (charge.refunded) {
    // Full refund
    console.log(`Full refund processed for charge: ${charge.id}`);
    // Deduct credits from user balance
  } else if (charge.amount_refunded > 0) {
    // Partial refund
    console.log(`Partial refund of ${charge.amount_refunded} processed for charge: ${charge.id}`);
    // Calculate and deduct partial credits
  }
}
```

### 8.3 Network Partitions

```typescript
// Handle network issues with graceful degradation
async getCreditPackages(): Promise<CreditPackage[]> {
  try {
    return await this.creditPackageRepository.getActivePackages();
  } catch (error) {
    console.error('Failed to fetch credit packages from database:', error);
    
    // Return cached packages if available
    const cachedPackages = await this.getCachedCreditPackages();
    if (cachedPackages) {
      console.log('Returning cached credit packages due to database error');
      return cachedPackages;
    }
    
    // Re-throw error if no cache available
    throw error;
  }
}
```

## 9. Monitoring and Alerting

### 9.1 Error Metrics

Track key error metrics:
- Payment failure rates
- API error rates
- Database error rates
- Webhook processing failures

### 9.2 Alerting Thresholds

Set up alerts for:
- Sudden increases in payment failures
- Database connection issues
- Webhook delivery failures
- High error rates across services

## 10. Recovery Procedures

### 10.1 Manual Intervention

Document procedures for:
- Handling failed payments that need manual review
- Reconciling discrepancies between Stripe and local records
- Processing refunds outside the normal flow
- Recovering from database corruption