import type { UserBalance } from './types';
import type { IBalanceTransactionRepository, IUserBalanceRepository } from '../../database/interfaces';
import { createServiceRoleSupabaseClient } from '../../database/supabase/serviceRoleSupabase';
import { SupabaseUserBalanceRepository } from '../../database/supabase/userBalanceRepository';
import type { UserBalance as DbUserBalance } from '../../database/schema';

export class BalanceService {
  constructor(
    private userBalanceRepository: IUserBalanceRepository,
    private balanceTransactionRepository: IBalanceTransactionRepository
  ) {}

  // Get user balance
  async getUserBalance(userId: string): Promise<UserBalance> {
    let balance = await this.userBalanceRepository.getByUserId(userId);
    
    if (!balance) {
      // Create new user with $10 free credit
      const dbBalance = await this.userBalanceRepository.createWithInitialBalance(userId, 10.00);
      return this.convertDbUserBalance(dbBalance);
    }
    
    return this.convertDbUserBalance(balance);
  }
  
  // Deduct cost from user balance with transactional integrity
  async deductCost(userId: string, cost: number, referenceId?: string): Promise<boolean> {
    try {
      const balance = await this.getUserBalance(userId);
      
      if (balance.balance < cost) {
        return false; // Insufficient balance
      }
      
      const newBalance = balance.balance - cost;
      
      // Update user balance
      await this.userBalanceRepository.updateBalance(userId, newBalance);
      
      // Record transaction
      await this.balanceTransactionRepository.create({
        userId,
        amount: (-cost).toString(),
        balanceBefore: balance.balance.toString(),
        balanceAfter: newBalance.toString(),
        transactionType: 'debit',
        description: `LLM usage cost`,
        referenceId
      });
      
      return true;
    } catch (error) {
      console.error('Error deducting cost from user balance:', error);
      throw error;
    }
  }
  
  // Add credit to user balance (e.g., when they purchase more)
  async addCredit(userId: string, amount: number, description?: string, referenceId?: string): Promise<void> {
    try {
      const balance = await this.getUserBalance(userId);
      const newBalance = balance.balance + amount;
      
      // Update user balance
      await this.userBalanceRepository.updateBalance(userId, newBalance);
      
      // Record transaction
      await this.balanceTransactionRepository.create({
        userId,
        amount: amount.toString(),
        balanceBefore: balance.balance.toString(),
        balanceAfter: newBalance.toString(),
        transactionType: 'credit',
        description: description || 'Credit added to account',
        referenceId
      });
    } catch (error) {
      console.error('Error adding credit to user balance:', error);
      throw error;
    }
  }
  
  // Check if user has sufficient balance
  async hasSufficientBalance(userId: string, estimatedCost: number): Promise<boolean> {
    const balance = await this.getUserBalance(userId);
    return balance.balance >= estimatedCost;
  }
  
  // Convert database UserBalance to application UserBalance
  private convertDbUserBalance(dbBalance: DbUserBalance): UserBalance {
    return {
      userId: dbBalance.userId,
      balance: typeof dbBalance.balance === 'string' ? parseFloat(dbBalance.balance) : dbBalance.balance,
      createdAt: dbBalance.createdAt,
      updatedAt: dbBalance.updatedAt
    };
  }
}