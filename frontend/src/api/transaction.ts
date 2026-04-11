import apiClient from './client'
import type { Transaction, CreateTransactionInput, TransactionSummary, Period } from '@/types/api'

export const transactionApi = {
  /**
   * Create a new transaction
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const response = await apiClient.post<Transaction>('/transactions/', input)
    return response.data
  },

  /**
   * Get all transactions or summary by period
   */
  async getTransactions(period?: Period): Promise<Transaction[] | TransactionSummary> {
    if (period) {
      const response = await apiClient.get<TransactionSummary>('/transactions/', {
        params: { period },
      })
      return response.data
    }
    const response = await apiClient.get<Transaction[]>('/transactions/')
    return response.data
  },

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: number): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`)
    return response.data
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: number): Promise<void> {
    await apiClient.delete(`/transactions/${id}`)
  },
}
