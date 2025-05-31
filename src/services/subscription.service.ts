/**
 * SubscriptionService - A dedicated service for handling subscription-related operations
 * This is a clean implementation that uses the fetch API directly to avoid any issues
 * with axios or other libraries.
 */

import { getBasePacksUrl } from '../config/api.config';

// Define the base URL for the API
const API_URL = getBasePacksUrl();
const SUBSCRIPTION_API_URL = API_URL.replace('/basepacks', '/subscription');

// Response interfaces
export interface Subscription {
  id: string;
  customerId: string;
  type: 'DAILY' | 'ALTERNATE';
  selectedDays: string[];
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'INACTIVE';
  basePackId: string;
  basePackDetails?: {
    name: string;
    description: string;
    imageUrl?: string;
    contents: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
  };
  deliveryAddress?: {
    id: string;
    houseNo: string;
    streetName: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    phoneNumber: string;
    societyName?: string;
    district?: string;
    isDefault: boolean;
  };
  amount?: number;
  createdAt: Date;
}

export interface SubscriptionInitiateResponse {
  success: boolean;
  message: string;
  subscriptionId?: string;
  amount?: number;
  details?: {
    id: string;
    type: 'DAILY' | 'ALTERNATE';
    startDate: string;
    status: string;
  };
  nextStep?: string;
  error?: string;
}

export interface SubscriptionConfirmResponse {
  success: boolean;
  message?: string;
  subscription?: any;
  error?: string;
}

// Input interfaces
export interface SubscriptionInitiateRequest {
  basePackId: string;
  type: 'Daily' | 'Alternate' | 'DAILY' | 'ALTERNATE';
  startDate: Date;
  days: number;
}

export interface SubscriptionConfirmRequest {
  basePackId: string;
  deliveryAddressId: string;
  type: 'Daily' | 'Alternate' | 'DAILY' | 'ALTERNATE';
  startDate: Date;
  selectedDays: string[];
}

class SubscriptionService {
  /**
   * Get authorization headers for API requests
   */
  private getHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return {
      'Authorization': token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Normalize subscription type to uppercase
   */
  private normalizeType(type: string): 'DAILY' | 'ALTERNATE' {
    if (!type) {
      throw new Error('Subscription type is required');
    }
    const normalized = type.toUpperCase();
    if (normalized !== 'DAILY' && normalized !== 'ALTERNATE') {
      throw new Error('Invalid subscription type. Must be either Daily or Alternate');
    }
    return normalized;
  }

  /**
   * Validate subscription data
   */
  private validateSubscriptionData(data: SubscriptionInitiateRequest) {
    if (!data.basePackId) {
      throw new Error('basePackId is required');
    }
    if (!data.type) {
      throw new Error('type is required');
    }
    if (!data.startDate) {
      throw new Error('startDate is required');
    }
    if (!data.days || data.days <= 0) {
      throw new Error('days must be a positive number');
    }
  }

  /**
   * Initiate a subscription
   */
  async initiateSubscription(data: SubscriptionInitiateRequest): Promise<SubscriptionInitiateResponse> {
    try {
      // Validate input data
      this.validateSubscriptionData(data);

      const headers = this.getHeaders();
      const normalizedType = this.normalizeType(data.type);
      
      console.log('Processing subscription initiation:', {
        inputData: data,
        normalizedType,
        headers
      });
      
      const payload = {
        id: String(data.basePackId).trim(),
        type: normalizedType,
        startDate: data.startDate.toISOString(),
        days: data.days
      };
      
      console.log('Sending payload to server:', payload);
      
      const response = await fetch(`${SUBSCRIPTION_API_URL}/initiate`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      console.log('Server response:', {
        status: response.status,
        ok: response.ok,
        data: responseData
      });
      
      if (!response.ok) {
        if (responseData.error === 'Insufficient wallet balance') {
          return {
            success: false,
            message: 'Insufficient wallet balance',
            error: 'Insufficient wallet balance',
            ...responseData
          };
        }
        
        throw new Error(responseData.error || `Request failed with status ${response.status}`);
      }
      
      return responseData;
    } catch (error: any) {
      console.error('Subscription initiation error:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Confirm a subscription with delivery address
   */
  async confirmSubscription(data: SubscriptionConfirmRequest): Promise<SubscriptionConfirmResponse> {
    try {
      const headers = this.getHeaders();
      const normalizedType = this.normalizeType(data.type);
      
      const payload = {
        basePackId: data.basePackId,
        deliveryAddressId: data.deliveryAddressId,
        type: normalizedType,
        startDate: data.startDate.toISOString(),
        selectedDays: data.selectedDays
      };
      
      const response = await fetch(`${SUBSCRIPTION_API_URL}/confirm`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        if (responseData.error === 'Customer already has an active subscription at this address') {
          return {
            success: false,
            error: responseData.error,
            ...responseData
          };
        }
        
        throw new Error(responseData.error || `Request failed with status ${response.status}`);
      }
      
      return responseData;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get customer subscriptions
   */
  async getCustomerSubscriptions(): Promise<Subscription[]> {
    try {
      const headers = this.getHeaders();
      const response = await fetch(`${SUBSCRIPTION_API_URL}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Toggle subscription status (pause/resume)
   */
  async toggleSubscriptionStatus(subscriptionId: string, resumeDate?: Date) {
    try {
      const headers = this.getHeaders();
      const payload = resumeDate ? { resumeDate: resumeDate.toISOString() } : {};
      
      const response = await fetch(`${SUBSCRIPTION_API_URL}/${subscriptionId}/toggle-status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle subscription status: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const headers = this.getHeaders();
      const response = await fetch(`${SUBSCRIPTION_API_URL}/${subscriptionId}/cancel`, {
        method: 'PATCH',
        headers
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pause a subscription for a specified number of days
   */
  async pauseSubscription(subscriptionId: string, pauseDays: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Calculate resume date based on pause days
      const resumeDate = new Date();
      resumeDate.setDate(resumeDate.getDate() + pauseDays);
      
      // Use the existing toggleSubscriptionStatus method with the resume date
      await this.toggleSubscriptionStatus(subscriptionId, resumeDate);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Error pausing subscription:', error);
      return {
        success: false,
        error: error.message || 'An unknown error occurred'
      };
    }
  }
}

export const subscriptionService = new SubscriptionService(); 