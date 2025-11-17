const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Initialize transaction
  async initializeTransaction(data) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack initialize error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to initialize transaction'
      };
    }
  }

  // Verify transaction
  async verifyTransaction(reference) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack verify error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to verify transaction'
      };
    }
  }

  // List transactions
  async listTransactions(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction?${queryString}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack list transactions error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to fetch transactions'
      };
    }
  }

  // Fetch transaction
  async fetchTransaction(id) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/${id}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack fetch transaction error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to fetch transaction'
      };
    }
  }

  // Create transfer recipient
  async createTransferRecipient(data) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack create recipient error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to create recipient'
      };
    }
  }

  // Initiate transfer
  async initiateTransfer(data) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        data,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack transfer error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to initiate transfer'
      };
    }
  }

  // Verify transfer
  async verifyTransfer(reference) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transfer/verify/${reference}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack verify transfer error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to verify transfer'
      };
    }
  }

  // Resolve account number
  async resolveAccountNumber(accountNumber, bankCode) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack resolve account error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to resolve account'
      };
    }
  }

  // List banks
  async listBanks() {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Paystack list banks error:', error.response?.data || error.message);
      return {
        status: false,
        message: error.response?.data?.message || 'Failed to fetch banks'
      };
    }
  }
}

module.exports = new PaystackService();