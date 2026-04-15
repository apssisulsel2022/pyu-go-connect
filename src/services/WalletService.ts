/**
 * Wallet Service - Financial Operations
 * PHASE 1 CRITICAL FIX #4: Uses atomic RPC function for race condition safety
 * 
 * Purpose: Handle all wallet balance operations safely and atomically
 * Security: All balance updates go through update_wallet_balance() RPC
 */

import { supabase } from '@/integrations/supabase/client';
import { log_security_event } from '@/middleware/auditLogger';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarnings: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'debit' | 'credit' | 'balance_update';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  relatedId?: string; // Booking ID, Withdrawal ID, etc.
  createdAt: string;
}

export interface WalletOperationResult {
  success: boolean;
  error?: string;
  newBalance?: number;
  transactionId?: string;
  message?: string;
}

/**
 * Wallet Service - All operations use atomic RPC functions
 * CRITICAL: Never use direct UPDATE statements on wallet balance
 */
export class WalletService {
  /**
   * Get current wallet balance for user
   */
  static async getWallet(userId: string): Promise<Wallet | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        balance: parseFloat(data.balance),
        totalEarnings: parseFloat(data.total_earnings || 0),
        totalSpent: parseFloat(data.total_spent || 0),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (err) {
      console.error('Wallet fetch failed:', err);
      return null;
    }
  }

  /**
   * Deduct balance from wallet (e.g., for booking)
   * ATOMIC: Uses database-level locking via RPC
   */
  static async deductBalance(
    userId: string,
    amount: number,
    description?: string,
    transactionId?: string
  ): Promise<WalletOperationResult> {
    try {
      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      // Log the operation attempt
      await log_security_event(
        'wallet_deduction',
        'wallet',
        'deduct_balance',
        'processing',
        { user_id: userId, amount, description }
      );

      // Call atomic RPC function
      const { data, error } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: -amount,
        p_transaction_id: transactionId
      });

      if (error) {
        await log_security_event(
          'wallet_deduction',
          'wallet',
          'deduct_balance',
          'failed',
          { user_id: userId, amount, error: error.message }
        );
        return { success: false, error: error.message };
      }

      if (data.error) {
        await log_security_event(
          'wallet_deduction',
          'wallet',
          'deduct_balance',
          'failed',
          { user_id: userId, amount, error: data.error }
        );
        return { success: false, error: data.error };
      }

      await log_security_event(
        'wallet_deduction',
        'wallet',
        'deduct_balance',
        'success',
        { user_id: userId, amount, new_balance: data.new_balance }
      );

      return {
        success: true,
        newBalance: parseFloat(data.new_balance),
        transactionId: data.transaction_id,
        message: `Deducted ${amount} from wallet`
      };
    } catch (err: any) {
      await log_security_event(
        'wallet_deduction',
        'wallet',
        'deduct_balance',
        'failed',
        { user_id: userId, amount, error: err.message }
      );
      return { success: false, error: err.message };
    }
  }

  /**
   * Add balance to wallet (e.g., for earnings or refunds)
   * ATOMIC: Uses database-level locking via RPC
   */
  static async addBalance(
    userId: string,
    amount: number,
    description?: string,
    transactionId?: string
  ): Promise<WalletOperationResult> {
    try {
      if (amount <= 0) {
        return { success: false, error: 'Amount must be greater than 0' };
      }

      await log_security_event(
        'wallet_addition',
        'wallet',
        'add_balance',
        'processing',
        { user_id: userId, amount, description }
      );

      // Call atomic RPC function (amount is positive for additions)
      const { data, error } = await supabase.rpc('update_wallet_balance', {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_id: transactionId
      });

      if (error) {
        await log_security_event(
          'wallet_addition',
          'wallet',
          'add_balance',
          'failed',
          { user_id: userId, amount, error: error.message }
        );
        return { success: false, error: error.message };
      }

      if (data.error) {
        await log_security_event(
          'wallet_addition',
          'wallet',
          'add_balance',
          'failed',
          { user_id: userId, amount, error: data.error }
        );
        return { success: false, error: data.error };
      }

      await log_security_event(
        'wallet_addition',
        'wallet',
        'add_balance',
        'success',
        { user_id: userId, amount, new_balance: data.new_balance }
      );

      return {
        success: true,
        newBalance: parseFloat(data.new_balance),
        transactionId: data.transaction_id,
        message: `Added ${amount} to wallet`
      };
    } catch (err: any) {
      await log_security_event(
        'wallet_addition',
        'wallet',
        'add_balance',
        'failed',
        { user_id: userId, amount, error: err.message }
      );
      return { success: false, error: err.message };
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        amount: parseFloat(t.amount),
        type: t.type,
        status: t.status,
        description: t.description,
        relatedId: t.related_id,
        createdAt: t.created_at
      }));
    } catch (err) {
      console.error('Transaction history fetch failed:', err);
      return [];
    }
  }

  /**
   * Check if user has sufficient balance
   */
  static async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      const wallet = await this.getWallet(userId);
      if (!wallet) return false;
      return wallet.balance >= amount;
    } catch (err) {
      console.error('Balance check failed:', err);
      return false;
    }
  }

  /**
   * Get wallet summary (earnings, spent, balance)
   */
  static async getWalletSummary(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select(
          `
          id,
          balance,
          total_earnings,
          total_spent,
          updated_at
        `
        )
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching wallet summary:', error);
        return null;
      }

      return {
        balance: parseFloat(data.balance),
        earnings: parseFloat(data.total_earnings),
        spent: parseFloat(data.total_spent),
        lastUpdated: data.updated_at
      };
    } catch (err) {
      console.error('Wallet summary fetch failed:', err);
      return null;
    }
  }
}

export default WalletService;
