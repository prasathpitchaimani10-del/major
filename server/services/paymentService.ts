import crypto from 'crypto';
import dotenv from 'dotenv';
import { PaymentMethodType } from '../models/types';

dotenv.config();

const PROVIDER_KEY = process.env.PAYMENT_PROVIDER_KEY || 'rzp_test_krono_sandbox_key';
const PROVIDER_SECRET = process.env.PAYMENT_PROVIDER_SECRET || 'rzp_test_krono_sandbox_secret';

export interface GatewayOrderSession {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  providerKey: string;
  method: PaymentMethodType;
  sandboxSignatureToken: string;
}

export class PaymentGatewayService {
  /**
   * Creates a provider-isolated sandbox payment order on the server.
   */
  static createPaymentOrder(
    orderNumber: string,
    amountInRupees: number,
    method: PaymentMethodType
  ): GatewayOrderSession {
    const randomHex = crypto.randomBytes(6).toString('hex');
    const gatewayOrderId = `order_krn_${randomHex}`;

    // Generate deterministic HMAC-SHA256 token for sandbox verification
    const expectedPaymentToken = this.generateSandboxSignature(gatewayOrderId, orderNumber);

    return {
      gatewayOrderId,
      amount: amountInRupees,
      currency: 'INR',
      providerKey: PROVIDER_KEY,
      method,
      sandboxSignatureToken: expectedPaymentToken,
    };
  }

  /**
   * Generates or verifies HMAC-SHA256 payment signature on the backend.
   */
  static generateSandboxSignature(gatewayOrderId: string, referenceId: string): string {
    return crypto
      .createHmac('sha256', PROVIDER_SECRET)
      .update(`${gatewayOrderId}|${referenceId}`)
      .digest('hex');
  }

  static verifyPaymentSignature(
    gatewayOrderId: string,
    referenceId: string,
    providedSignature: string
  ): boolean {
    if (!gatewayOrderId || !referenceId || !providedSignature) {
      return false;
    }
    const expected = this.generateSandboxSignature(gatewayOrderId, referenceId);
    return expected === providedSignature;
  }

  /**
   * Executes a refund on the payment gateway in sandbox mode.
   */
  static initiateGatewayRefund(gatewayPaymentId: string, amount: number): {
    refundReference: string;
    status: 'Processed';
    amount: number;
    timestamp: string;
  } {
    const refundHex = crypto.randomBytes(5).toString('hex');
    return {
      refundReference: `rfnd_krn_${refundHex}`,
      status: 'Processed',
      amount,
      timestamp: new Date().toISOString(),
    };
  }
}
