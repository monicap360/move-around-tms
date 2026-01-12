// Fuel Card Integration Layer
// This module provides integration points for Comdata, WEX, and other fuel card providers.
// It exposes functions to fetch fuel transactions and purchase data.

export interface FuelCardProvider {
  name: string;
  fetchTransactions(startDate: string, endDate: string): Promise<any[]>;
  getAccountBalance(): Promise<number>;
  getFleetCards(): Promise<any[]>;
}

export interface FuelPurchase {
  id: string;
  transaction_id: string;
  card_number: string;
  driver_id?: string;
  truck_id?: string;
  location: string;
  gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  fuel_type: string; // Diesel, Gasoline, etc.
  transaction_date: string;
  odometer?: number;
  provider: string;
}

export interface FuelCardConfig {
  provider: 'comdata' | 'wex' | 'fleetcor' | 'manual';
  account_id: string;
  api_key?: string;
  api_secret?: string;
  organization_id: string;
}

// Comdata Integration
export const comdata: FuelCardProvider = {
  name: "Comdata",
  
  async fetchTransactions(startDate: string, endDate: string) {
    const apiKey = process.env.COMDATA_API_KEY;
    const apiSecret = process.env.COMDATA_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error(
        "Comdata integration not configured. Please add COMDATA_API_KEY and COMDATA_API_SECRET environment variables."
      );
    }

    try {
      // Transform to Comdata API format
      // Note: Actual API calls would require Comdata API credentials and proper authentication
      // This is a stub structure - implement actual Comdata API calls
      
      console.log("Comdata fetch transactions (stub):", startDate, "to", endDate);
      
      // Stub response structure
      // In production, call Comdata API: https://api.comdata.com/v1/transactions
      return [];
    } catch (err: any) {
      console.error("Comdata fetch transactions error:", err);
      throw new Error(`Comdata fetch failed: ${err.message}`);
    }
  },

  async getAccountBalance() {
    const apiKey = process.env.COMDATA_API_KEY;
    
    if (!apiKey) {
      throw new Error("Comdata integration not configured.");
    }

    try {
      // Fetch account balance from Comdata API
      // Stub - implement actual API call
      return 0;
    } catch (err: any) {
      console.error("Comdata get account balance error:", err);
      throw new Error(`Comdata balance fetch failed: ${err.message}`);
    }
  },

  async getFleetCards() {
    const apiKey = process.env.COMDATA_API_KEY;
    
    if (!apiKey) {
      throw new Error("Comdata integration not configured.");
    }

    try {
      // Fetch fleet cards from Comdata API
      // Stub - implement actual API call
      return [];
    } catch (err: any) {
      console.error("Comdata get fleet cards error:", err);
      throw new Error(`Comdata fleet cards fetch failed: ${err.message}`);
    }
  },
};

// WEX Integration
export const wex: FuelCardProvider = {
  name: "WEX",
  
  async fetchTransactions(startDate: string, endDate: string) {
    const apiKey = process.env.WEX_API_KEY;
    const apiSecret = process.env.WEX_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error(
        "WEX integration not configured. Please add WEX_API_KEY and WEX_API_SECRET environment variables."
      );
    }

    try {
      // Transform to WEX API format
      // Note: Actual API calls would require WEX API credentials
      // This is a stub structure - implement actual WEX API calls
      
      console.log("WEX fetch transactions (stub):", startDate, "to", endDate);
      
      // Stub response structure
      // In production, call WEX API
      return [];
    } catch (err: any) {
      console.error("WEX fetch transactions error:", err);
      throw new Error(`WEX fetch failed: ${err.message}`);
    }
  },

  async getAccountBalance() {
    const apiKey = process.env.WEX_API_KEY;
    
    if (!apiKey) {
      throw new Error("WEX integration not configured.");
    }

    try {
      // Fetch account balance from WEX API
      // Stub - implement actual API call
      return 0;
    } catch (err: any) {
      console.error("WEX get account balance error:", err);
      throw new Error(`WEX balance fetch failed: ${err.message}`);
    }
  },

  async getFleetCards() {
    const apiKey = process.env.WEX_API_KEY;
    
    if (!apiKey) {
      throw new Error("WEX integration not configured.");
    }

    try {
      // Fetch fleet cards from WEX API
      // Stub - implement actual API call
      return [];
    } catch (err: any) {
      console.error("WEX get fleet cards error:", err);
      throw new Error(`WEX fleet cards fetch failed: ${err.message}`);
    }
  },
};

// Manual Entry Provider (for fuel purchases entered manually)
export const manual: FuelCardProvider = {
  name: "Manual Entry",
  
  async fetchTransactions(startDate: string, endDate: string) {
    // Manual entries are stored in database, not fetched from API
    // This is just for interface compatibility
    return [];
  },

  async getAccountBalance() {
    // Manual entries don't have account balances
    return 0;
  },

  async getFleetCards() {
    // Manual entries don't have fleet cards
    return [];
  },
};

export const fuelCardProviders: Record<string, FuelCardProvider> = {
  comdata,
  wex,
  manual,
};
