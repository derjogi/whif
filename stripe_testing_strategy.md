# Stripe Integration Testing Strategy

## 1. Overview

This document outlines the comprehensive testing strategy for the Stripe integration, covering unit tests, integration tests, end-to-end tests, and other specialized testing approaches.

## 2. Unit Testing

### 2.1 Stripe Service Unit Tests

Test the core functionality of the Stripe service:

```typescript
// tests/unit/stripeService.test.ts
import { StripeService } from '../../src/lib/server/stripe/stripeService';
import { mockPaymentTransactionRepository, mockCreditPackageRepository, mockBalanceService } from '../mocks';

describe('StripeService', () => {
  let stripeService: StripeService;
  
  beforeEach(() => {
    stripeService = new StripeService(
      mockPaymentTransactionRepository,
      mockCreditPackageRepository,
      mockBalanceService
    );
  });
  
  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const creditPackageId = 'package-456';
      const mockCreditPackage = {
        id: creditPackageId,
        name: 'Test Package',
        amount: 10.00,
        creditAmount: 10.00
      };
      
      mockCreditPackageRepository.getById.mockResolvedValue(mockCreditPackage);
      
      // Act
      const result = await stripeService.createPaymentIntent(userId, creditPackageId);
      
      // Assert
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('paymentIntentId');
      expect(mockPaymentTransactionRepository.create).toHaveBeenCalled();
    });
    
    it('should throw error for invalid credit package', async () => {
      // Arrange
      mockCreditPackageRepository.getById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(stripeService.createPaymentIntent('user-123', 'invalid-package'))
        .rejects.toThrow('Credit package not found');
    });
    
    it('should handle Stripe card errors', async () => {
      // Arrange
      const mockCreditPackage = {
        id: 'package-456',
        name: 'Test Package',
        amount: 10.00,
        creditAmount: 10.00
      };
      
      mockCreditPackageRepository.getById.mockResolvedValue(mockCreditPackage);
      // Mock Stripe to throw a card error
      
      // Act & Assert
      await expect(stripeService.createPaymentIntent('user-123', 'package-456'))
        .rejects.toThrow(PaymentError);
    });
  });
  
  describe('getCreditPackages', () => {
    it('should return active credit packages', async () => {
      // Arrange
      const mockPackages = [
        { id: '1', name: 'Package 1', amount: 5.00, creditAmount: 5.00, isActive: true },
        { id: '2', name: 'Package 2', amount: 10.00, creditAmount: 10.00, isActive: true }
      ];
      
      mockCreditPackageRepository.getActivePackages.mockResolvedValue(mockPackages);
      
      // Act
      const result = await stripeService.getCreditPackages();
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Package 1');
    });
  });
});
```

### 2.2 Webhook Handler Unit Tests

Test the webhook handler functionality:

```typescript
// tests/unit/webhookHandler.test.ts
import { StripeWebhookHandler } from '../../src/lib/server/stripe/webhookHandler';
import { mockPaymentTransactionRepository, mockBalanceService } from '../mocks';
import Stripe from 'stripe';

describe('StripeWebhookHandler', () => {
  let webhookHandler: StripeWebhookHandler;
  
  beforeEach(() => {
    webhookHandler = new StripeWebhookHandler(
      mockPaymentTransactionRepository,
      mockBalanceService
    );
  });
  
  describe('handlePaymentIntentSucceeded', () => {
    it('should update transaction status and add credits', async () => {
      // Arrange
      const mockPaymentIntent = {
        id: 'pi_123',
        object: 'payment_intent',
        status: 'succeeded'
      } as Stripe.PaymentIntent;
      
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: mockPaymentIntent
        }
      } as Stripe.Event;
      
      const mockTransaction = {
        id: 'transaction-123',
        userId: 'user-456',
        creditAmount: '10.00'
      };
      
      mockPaymentTransactionRepository.getByStripePaymentIntentId.mockResolvedValue(mockTransaction);
      
      // Act
      await webhookHandler.handleWebhookEvent(mockEvent);
      
      // Assert
      expect(mockPaymentTransactionRepository.updateStatus).toHaveBeenCalledWith(
        'transaction-123',
        'succeeded'
      );
      expect(mockBalanceService.addCredit).toHaveBeenCalledWith(
        'user-456',
        10.00,
        expect.any(String),
        'transaction-123'
      );
    });
    
    it('should handle missing payment transaction gracefully', async () => {
      // Arrange
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_123' }
        }
      } as Stripe.Event;
      
      mockPaymentTransactionRepository.getByStripePaymentIntentId.mockResolvedValue(null);
      
      // Act & Assert
      await expect(webhookHandler.handleWebhookEvent(mockEvent)).resolves.not.toThrow();
      expect(mockPaymentTransactionRepository.updateStatus).not.toHaveBeenCalled();
    });
  });
});
```

### 2.3 Balance Service Unit Tests

Test integration with the existing balance service:

```typescript
// tests/unit/balanceService.test.ts
import { BalanceService } from '../../src/lib/server/llm/costTracking/balanceService';
import { mockUserBalanceRepository, mockBalanceTransactionRepository } from '../mocks';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  
  beforeEach(() => {
    balanceService = new BalanceService(
      mockUserBalanceRepository,
      mockBalanceTransactionRepository
    );
  });
  
  describe('addCredit', () => {
    it('should add credit to existing user balance', async () => {
      // Arrange
      const userId = 'user-123';
      const amount = 5.00;
      const mockBalance = {
        userId,
        balance: 10.00
      };
      
      mockUserBalanceRepository.getByUserId.mockResolvedValue(mockBalance);
      
      // Act
      await balanceService.addCredit(userId, amount, 'Test credit');
      
      // Assert
      expect(mockUserBalanceRepository.updateBalance).toHaveBeenCalledWith(userId, 15.00);
      expect(mockBalanceTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: '5',
          transactionType: 'credit',
          description: 'Test credit'
        })
      );
    });
    
    it('should create new balance for new user', async () => {
      // Arrange
      const userId = 'new-user-123';
      const amount = 5.00;
      
      mockUserBalanceRepository.getByUserId.mockResolvedValue(null);
      
      // Act
      await balanceService.addCredit(userId, amount, 'Initial credit');
      
      // Assert
      expect(mockUserBalanceRepository.createWithInitialBalance).toHaveBeenCalledWith(userId, 5.00);
    });
  });
});
```

## 3. Integration Testing

### 3.1 API Endpoint Integration Tests

Test the API endpoints with mocked services:

```typescript
// tests/integration/apiEndpoints.test.ts
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { createApiTestServer } from '../testUtils';
import { mockStripeService } from '../mocks';

describe('Stripe API Endpoints', () => {
  let server: any;
  
  beforeEach(() => {
    server = createApiTestServer();
    // Mock the Stripe service
    vi.mock('../../src/lib/server/stripe/stripeService', () => ({
      getStripeService: () => mockStripeService
    }));
  });
  
  afterEach(() => {
    server.close();
  });
  
  describe('GET /api/stripe/credit-packages', () => {
    it('should return credit packages for authenticated user', async () => {
      // Arrange
      const mockPackages = [
        { id: '1', name: 'Small Package', amount: 5.00, creditAmount: 5.00 }
      ];
      
      mockStripeService.getCreditPackages.mockResolvedValue(mockPackages);
      
      // Act
      const response = await server.get('/api/stripe/credit-packages')
        .set('Authorization', 'Bearer valid-token');
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Small Package');
    });
    
    it('should return 401 for unauthenticated requests', async () => {
      // Act
      const response = await server.get('/api/stripe/credit-packages');
      
      // Assert
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/stripe/create-payment-intent', () => {
    it('should create payment intent successfully', async () => {
      // Arrange
      const requestBody = {
        creditPackageId: 'package-123'
      };
      
      const mockPaymentIntent = {
        clientSecret: 'pi_secret_123',
        paymentIntentId: 'pi_123'
      };
      
      mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);
      
      // Act
      const response = await server.post('/api/stripe/create-payment-intent')
        .set('Authorization', 'Bearer valid-token')
        .send(requestBody);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.clientSecret).toBe('pi_secret_123');
    });
    
    it('should return 400 for missing credit package ID', async () => {
      // Act
      const response = await server.post('/api/stripe/create-payment-intent')
        .set('Authorization', 'Bearer valid-token')
        .send({});
      
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
```

### 3.2 Database Integration Tests

Test database operations with a test database:

```typescript
// tests/integration/database.test.ts
import { describe, it, beforeEach, expect } from 'vitest';
import { createTestDatabase, destroyTestDatabase } from '../testUtils';
import { SupabasePaymentTransactionRepository } from '../../src/lib/server/database/supabase/paymentTransactionRepository';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Database Integration', () => {
  let db: SupabaseClient;
  let paymentTransactionRepository: SupabasePaymentTransactionRepository;
  
  beforeEach(async () => {
    db = await createTestDatabase();
    paymentTransactionRepository = new SupabasePaymentTransactionRepository(db);
  });
  
  afterEach(async () => {
    await destroyTestDatabase(db);
  });
  
  describe('PaymentTransactionRepository', () => {
    it('should create and retrieve payment transaction', async () => {
      // Arrange
      const newTransaction = {
        userId: 'user-123',
        stripePaymentIntentId: 'pi_123',
        amount: '10.00',
        creditAmount: '10.00',
        status: 'pending',
        description: 'Test purchase'
      };
      
      // Act
      const created = await paymentTransactionRepository.create(newTransaction);
      const retrieved = await paymentTransactionRepository.getById(created.id);
      
      // Assert
      expect(created).toBeDefined();
      expect(retrieved).toBeDefined();
      expect(retrieved?.stripePaymentIntentId).toBe('pi_123');
      expect(retrieved?.status).toBe('pending');
    });
    
    it('should update payment transaction status', async () => {
      // Arrange
      const newTransaction = {
        userId: 'user-123',
        stripePaymentIntentId: 'pi_456',
        amount: '15.00',
        creditAmount: '15.00',
        status: 'pending',
        description: 'Test purchase'
      };
      
      const created = await paymentTransactionRepository.create(newTransaction);
      
      // Act
      const updated = await paymentTransactionRepository.updateStatus(created.id, 'succeeded');
      
      // Assert
      expect(updated.status).toBe('succeeded');
    });
  });
});
```

## 4. End-to-End Testing

### 4.1 Payment Flow Testing

Test the complete payment flow from frontend to backend:

```typescript
// tests/e2e/paymentFlow.test.ts
import { describe, it, beforeEach, expect } from 'vitest';
import { createTestApp, destroyTestApp } from '../testUtils';
import { TestUser, createTestUser } from '../testUsers';
import Stripe from 'stripe';

describe('Payment Flow End-to-End', () => {
  let app: any;
  let testUser: TestUser;
  let stripe: Stripe;
  
  beforeEach(async () => {
    app = await createTestApp();
    testUser = await createTestUser();
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
  });
  
  afterEach(async () => {
    await destroyTestApp(app);
  });
  
  it('should complete a full payment flow', async () => {
    // Step 1: Get credit packages
    const packagesResponse = await app.get('/api/stripe/credit-packages')
      .set('Authorization', `Bearer ${testUser.token}`);
    
    expect(packagesResponse.status).toBe(200);
    expect(packagesResponse.body.data).toHaveLength(3);
    
    // Step 2: Create payment intent
    const paymentIntentResponse = await app.post('/api/stripe/create-payment-intent')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        creditPackageId: packagesResponse.body.data[0].id
      });
    
    expect(paymentIntentResponse.status).toBe(200);
    expect(paymentIntentResponse.body.data).toHaveProperty('clientSecret');
    expect(paymentIntentResponse.body.data).toHaveProperty('paymentIntentId');
    
    // Step 3: Confirm payment with Stripe (using test card)
    const paymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentResponse.body.data.paymentIntentId,
      {
        payment_method: 'pm_card_visa' // Test card
      }
    );
    
    expect(paymentIntent.status).toBe('succeeded');
    
    // Step 4: Wait for webhook processing (in real tests, we might need to trigger this manually)
    // For this test, we'll directly check the database
    
    // Step 5: Verify user balance was updated
    const balanceResponse = await app.get('/api/stripe/balance')
      .set('Authorization', `Bearer ${testUser.token}`);
    
    expect(balanceResponse.status).toBe(200);
    expect(parseFloat(balanceResponse.body.data.balance)).toBeGreaterThan(0);
  });
});
```

### 4.2 Webhook Processing Testing

Test webhook processing with real Stripe events:

```typescript
// tests/e2e/webhookProcessing.test.ts
import { describe, it, beforeEach, expect } from 'vitest';
import { createTestApp, destroyTestApp } from '../testUtils';
import Stripe from 'stripe';

describe('Webhook Processing End-to-End', () => {
  let app: any;
  let stripe: Stripe;
  
  beforeEach(async () => {
    app = await createTestApp();
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
  });
  
  afterEach(async () => {
    await destroyTestApp(app);
  });
  
  it('should process payment_intent.succeeded webhook', async () => {
    // This test would require setting up a real Stripe event or using Stripe's test utilities
    // For now, we'll simulate the webhook call
    
    // Create a test event payload
    const eventPayload = {
      id: 'evt_test_123',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          object: 'payment_intent',
          amount: 1000,
          currency: 'usd',
          status: 'succeeded'
        }
      }
    };
    
    // Sign the event payload
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: JSON.stringify(eventPayload),
      secret: process.env.STRIPE_WEBHOOK_SECRET || ''
    });
    
    // Send the webhook to our endpoint
    const webhookResponse = await app.post('/api/stripe/webhook')
      .set('Stripe-Signature', signature)
      .send(eventPayload);
    
    expect(webhookResponse.status).toBe(200);
  });
});
```

## 5. Specialized Testing

### 5.1 Security Testing

Test security aspects of the integration:

```typescript
// tests/security/security.test.ts
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../testUtils';

describe('Security Testing', () => {
  let app: any;
  
  beforeEach(async () => {
    app = await createTestApp();
  });
  
  it('should reject unauthorized access to payment endpoints', async () => {
    const response = await app.get('/api/stripe/credit-packages');
    expect(response.status).toBe(401);
  });
  
  it('should reject invalid webhook signatures', async () => {
    const response = await app.post('/api/stripe/webhook')
      .set('Stripe-Signature', 'invalid-signature')
      .send({});
    
    expect(response.status).toBe(400);
  });
  
  it('should not expose sensitive information in error responses', async () => {
    // Test that error responses don't leak internal details
    const response = await app.post('/api/stripe/create-payment-intent')
      .set('Authorization', 'Bearer invalid-token')
      .send({});
    
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body.error).not.toContain('database');
    expect(response.body.error).not.toContain('stripe');
  });
});
```

### 5.2 Performance Testing

Test performance under load:

```typescript
// tests/performance/performance.test.ts
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../testUtils';
import { loadTest } from 'artillery';

describe('Performance Testing', () => {
  it('should handle concurrent requests to credit packages endpoint', async () => {
    // This would typically be run with a load testing tool like Artillery
    // Example test scenario:
    /*
    config:
      target: "http://localhost:3000"
      phases:
        - duration: 60
          arrivalRate: 10
    scenarios:
      - flow:
        - get:
            url: "/api/stripe/credit-packages"
            headers:
              Authorization: "Bearer {{ auth_token }}"
    */
  });
  
  it('should maintain response times under load', async () => {
    // Test that API response times stay within acceptable limits
    // under various load conditions
  });
});
```

### 5.3 Edge Case Testing

Test edge cases and error conditions:

```typescript
// tests/edgeCases/edgeCases.test.ts
import { describe, it, expect } from 'vitest';
import { createTestApp } from '../testUtils';

describe('Edge Case Testing', () => {
  let app: any;
  
  beforeEach(async () => {
    app = await createTestApp();
  });
  
  it('should handle very small payment amounts', async () => {
    // Test payments for very small amounts (e.g., $0.01)
  });
  
  it('should handle very large payment amounts', async () => {
    // Test payments for large amounts within system limits
  });
  
  it('should handle duplicate payment intent creation', async () => {
    // Test what happens when the same payment intent is created twice
  });
  
  it('should handle webhook retries gracefully', async () => {
    // Test that duplicate webhook events don't cause issues
  });
  
  it('should handle database connection failures gracefully', async () => {
    // Test how the system behaves when database is temporarily unavailable
  });
});
```

## 6. Test Environment Setup

### 6.1 Test Database

Use a separate test database with the same schema:

```sql
-- tests/setup/test-database.sql
-- Create test database with same schema as production
-- but with test data and isolated environment
```

### 6.2 Stripe Test Environment

Use Stripe's test mode with test API keys and test cards:

- Test API keys: `pk_test_*` and `sk_test_*`
- Test cards: `4242 4242 4242 4242` (Visa), `4000 0566 5566 5556` (Visa debit), etc.

### 6.3 Mock Services

Use mocks for external services during unit testing:

```typescript
// tests/mocks/index.ts
export const mockStripeService = {
  createPaymentIntent: vi.fn(),
  getCreditPackages: vi.fn(),
  handleSuccessfulPayment: vi.fn()
};

export const mockPaymentTransactionRepository = {
  create: vi.fn(),
  getById: vi.fn(),
  getByStripePaymentIntentId: vi.fn(),
  updateStatus: vi.fn()
};

// ... other mocks
```

## 7. Test Execution Strategy

### 7.1 CI/CD Integration

Run tests automatically in CI/CD pipeline:

1. Unit tests on every commit
2. Integration tests on pull requests
3. End-to-end tests on deployment to staging
4. Security tests periodically

### 7.2 Test Coverage

Aim for comprehensive test coverage:

- Unit tests: 80%+ coverage
- Integration tests: Cover all API endpoints
- End-to-end tests: Cover critical user flows
- Security tests: Cover all security-sensitive areas

### 7.3 Test Data Management

- Use factories for test data generation
- Clean up test data after each test
- Use database transactions for test isolation
- Maintain separate test datasets for different test types