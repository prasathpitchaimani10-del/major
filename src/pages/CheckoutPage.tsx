import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  Truck,
  CreditCard,
  ShieldCheck,
  FileCheck,
  Plus,
  Lock,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatINR } from '../services/api';
import { PaymentMethod, Order } from '../types';
import { EmptyState, ResilientImage } from '../components/CommonUI';

const STEPS = [
  { num: 1, label: 'Address' },
  { num: 2, label: 'Delivery Method' },
  { num: 3, label: 'Payment' },
  { num: 4, label: 'Order Review' },
  { num: 5, label: 'Confirmation' },
];

export const CheckoutPage: React.FC = () => {
  const { user, refreshProfile, refreshCart, showToast } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Optional direct Buy Now payload passed via router state
  const buyNowItem = (location.state as any)?.buyNowItem || null;

  const [step, setStep] = useState<number>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<
    'Standard' | 'Express' | 'WhiteGlove'
  >('Standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [couponCode, setCouponCode] = useState<string>('');
  const [calculation, setCalculation] = useState<any>(null);
  const [loadingCalc, setLoadingCalc] = useState<boolean>(true);

  // Quick Add Address modal form inside Step 1
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    name: '',
    phone: '',
    houseFlat: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'Home',
  });

  // Payment & Order Creation state
  const [placingOrder, setPlacingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [gatewaySession, setGatewaySession] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [idempotencyKey] = useState(() => `idem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    if (user && user.addresses.length > 0 && !selectedAddressId) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [user, selectedAddressId]);

  const fetchServerCalculation = useCallback(async () => {
    if (!user) return;
    setLoadingCalc(true);
    try {
      const res = await apiRequest('/checkout/calculate', {
        method: 'POST',
        body: JSON.stringify({
          buyNowItem,
          deliveryMethod,
          couponCode: couponCode || undefined,
        }),
      });
      setCalculation(res.data.calculation);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingCalc(false);
    }
  }, [user, buyNowItem, deliveryMethod, couponCode, showToast]);

  useEffect(() => {
    fetchServerCalculation();
  }, [fetchServerCalculation]);

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In Required for Checkout"
          description="Please sign in to verify your delivery address and complete your order."
          actionLabel="Sign In"
          actionTo="/login"
        />
      </div>
    );
  }

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...addrForm, isDefault: true }),
      });
      await refreshProfile();
      setSelectedAddressId(res.data.address.id);
      setShowAddressForm(false);
      showToast('Delivery address added.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedAddressId) {
      showToast('Please select a delivery address first.', 'error');
      setStep(1);
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await apiRequest('/checkout/create-order', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          deliveryMethod,
          paymentMethod,
          couponCode: calculation?.couponCode || undefined,
          buyNowItem,
          idempotencyKey,
        }),
      });

      const order: Order = res.data.order;
      const session = res.data.paymentSession;
      setCreatedOrder(order);
      setGatewaySession(session);

      if (paymentMethod === 'COD') {
        await refreshCart();
        setStep(5);
        showToast('Cash on Delivery order confirmed!', 'success');
      } else {
        // Open Sandbox Payment Verification Modal
        setVerifyingPayment(true);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleCompleteSandboxPayment = async (simulateFailure = false) => {
    if (!createdOrder || !gatewaySession) return;
    try {
      const res = await apiRequest('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: createdOrder.id,
          gatewayOrderId: gatewaySession.gatewayOrderId,
          gatewayPaymentId: `pay_krn_${Date.now()}`,
          gatewaySignature: gatewaySession.sandboxSignatureToken,
          simulateFailure,
        }),
      });
      setCreatedOrder(res.data.order);
      setVerifyingPayment(false);
      await refreshCart();
      setStep(5);
      showToast('Online payment verified on backend!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
      setVerifyingPayment(false);
      navigate(`/orders/${createdOrder.id}`);
    }
  };

  const selectedAddressObj = user.addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-8">
      {/* 5-Step Checkout Stepper */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {STEPS.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                    isCompleted
                      ? 'bg-emerald-700 text-white'
                      : isCurrent
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-zinc-900' : 'text-zinc-500'
                  }`}
                >
                  {s.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block w-10 h-[1px] bg-zinc-200 ml-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 5: Order Confirmation View */}
      {step === 5 && createdOrder ? (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <p className="text-xs font-mono uppercase tracking-wider">
                Order #{createdOrder.orderNumber} Confirmed
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900">
                Thank You for Your Order, {createdOrder.customerName}
              </h1>
            </div>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed">
            Your order has been logged with tax invoice{' '}
            <span className="font-mono font-semibold text-zinc-900">
              {createdOrder.invoiceNumber}
            </span>
            . Historical item pricing and 18% GST calculations have been locked in your
            order snapshot.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 text-xs">
            <div>
              <p className="font-semibold text-zinc-900 mb-1">Delivery Destination</p>
              <p className="text-zinc-700">{createdOrder.addressSnapshot.name}</p>
              <p className="text-zinc-600">
                {createdOrder.addressSnapshot.houseFlat},{' '}
                {createdOrder.addressSnapshot.street}
              </p>
              <p className="text-zinc-600">
                {createdOrder.addressSnapshot.city}, {createdOrder.addressSnapshot.state}{' '}
                — {createdOrder.addressSnapshot.pincode}
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">Payment &amp; Fulfillment</p>
              <p className="text-zinc-700">
                Method: <span className="font-semibold">{createdOrder.paymentMethod}</span>{' '}
                ({createdOrder.paymentStatus})
              </p>
              <p className="text-zinc-700">
                Delivery Tier: {createdOrder.pricing.deliveryMethod}
              </p>
              <p className="font-mono font-bold text-zinc-900 text-sm mt-1">
                Total: {formatINR(createdOrder.pricing.finalTotal)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={`/orders/${createdOrder.id}`}
              className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              Track Order &amp; Download Invoice
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 text-xs font-medium bg-zinc-100 text-zinc-800 rounded-lg hover:bg-zinc-200"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Step Controls */}
          <div className="lg:col-span-8 space-y-6">
            {/* STEP 1: ADDRESS SELECTION */}
            {step === 1 && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-900" />
                    <h2 className="text-base font-semibold text-zinc-900">
                      Step 1: Select Delivery Address
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm((p) => !p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-amber-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {showAddressForm && (
                  <form
                    onSubmit={handleAddNewAddress}
                    className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-4"
                  >
                    <h3 className="text-xs font-semibold text-zinc-900">
                      New Delivery Address
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Recipient Full Name"
                        value={addrForm.name}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, name: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="10-Digit Mobile Number"
                        value={addrForm.phone}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, phone: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="House / Flat / Suite No."
                        value={addrForm.houseFlat}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, houseFlat: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Street / Road"
                        value={addrForm.street}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, street: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Area / Locality"
                        value={addrForm.area}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, area: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={addrForm.city}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, city: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={addrForm.state}
                        onChange={(e) =>
                          setAddrForm({ ...addrForm, state: e.target.value })
                        }
                        className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-Digit Pincode"
                        value={addrForm.pincode}
                        onChange={(e) =>
                          setAddrForm({
                            ...addrForm,
                            pincode: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        className="px-3 py-2 text-xs font-mono bg-white border border-zinc-200 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-3 py-1.5 text-xs text-zinc-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg"
                      >
                        Save &amp; Select
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.addresses.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAddressId(a.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressId === a.id
                          ? 'border-zinc-900 bg-zinc-900/3 ring-1 ring-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                        <span className="font-semibold text-zinc-900">{a.name}</span>
                        <span>{a.addressType}</span>
                      </div>
                      <p className="text-xs text-zinc-600">
                        {a.houseFlat}, {a.street}, {a.area}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {a.city}, {a.state} —{' '}
                        <span className="font-mono">{a.pincode}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Phone: {a.phone}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!selectedAddressId}
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-40"
                  >
                    Continue to Delivery Method
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DELIVERY METHOD */}
            {step === 2 && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <Truck className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-base font-semibold text-zinc-900">
                    Step 2: Choose Delivery Tier
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      id: 'Standard',
                      title: 'Standard Insured Ground / Air (3–5 Days)',
                      desc: 'Complimentary on orders above ₹10,000, otherwise ₹250.',
                      feeLabel:
                        (calculation?.sellingSubtotal || 0) >= 10000 ? 'Free' : '₹250',
                    },
                    {
                      id: 'Express',
                      title: 'BlueDart Express Air Priority (24–48 Hours)',
                      desc: 'Complimentary on orders above ₹50,000, otherwise ₹450.',
                      feeLabel:
                        (calculation?.sellingSubtotal || 0) >= 50000 ? 'Free' : '₹450',
                    },
                    {
                      id: 'WhiteGlove',
                      title: 'Atelier White-Glove Specialist Delivery',
                      desc: 'Scheduled doorstep calibration & acoustic setup in hard flight case.',
                      feeLabel: '₹1,200',
                    },
                  ].map((tier) => (
                    <div
                      key={tier.id}
                      onClick={() => setDeliveryMethod(tier.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between ${
                        deliveryMethod === tier.id
                          ? 'border-zinc-900 bg-zinc-900/3 ring-1 ring-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{tier.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{tier.desc}</p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-zinc-900">
                        {tier.feeLabel}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Back to Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    Continue to Payment Method
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PAYMENT METHOD */}
            {step === 3 && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <CreditCard className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-base font-semibold text-zinc-900">
                    Step 3: Select Payment Method
                  </h2>
                </div>

                <div className="space-y-3">
                  {(
                    [
                      [
                        'UPI',
                        'UPI Instant Pay (GPay, PhonePe, BHIM)',
                        'Zero-fee instant cryptographic VPA verification.',
                      ],
                      [
                        'Card',
                        'Credit / Debit Cards (Visa, Mastercard, RuPay, Amex)',
                        'Tokenized 3D-Secure gateway processing; raw card numbers are never stored.',
                      ],
                      [
                        'NetBanking',
                        'Net Banking (HDFC, ICICI, SBI, Axis)',
                        'Direct corporate and retail bank portal authorization.',
                      ],
                      [
                        'Wallet',
                        'Digital Wallets (Amazon Pay, Paytm)',
                        'Instant wallet settlement.',
                      ],
                      [
                        'COD',
                        'Cash on Delivery / Pay on Doorstep',
                        'Pay via cash or UPI QR code to the courier upon physical verification.',
                      ],
                    ] as const
                  ).map(([methodKey, title, desc]) => (
                    <div
                      key={methodKey}
                      onClick={() => setPaymentMethod(methodKey)}
                      className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between ${
                        paymentMethod === methodKey
                          ? 'border-zinc-900 bg-zinc-900/3 ring-1 ring-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{methodKey}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Back to Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    Review Final Order
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: ORDER REVIEW & SERVER REVALIDATION */}
            {step === 4 && calculation && (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <FileCheck className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-base font-semibold text-zinc-900">
                    Step 4: Final Order Verification
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-xl text-xs">
                  <div>
                    <p className="font-semibold text-zinc-900 mb-1">Shipping To</p>
                    {selectedAddressObj && (
                      <>
                        <p className="text-zinc-700">{selectedAddressObj.name}</p>
                        <p className="text-zinc-600">
                          {selectedAddressObj.houseFlat}, {selectedAddressObj.street}
                        </p>
                        <p className="text-zinc-600">
                          {selectedAddressObj.city}, {selectedAddressObj.state} —{' '}
                          {selectedAddressObj.pincode}
                        </p>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 mb-1">
                      Payment &amp; Logistics
                    </p>
                    <p className="text-zinc-700">Payment Mode: {paymentMethod}</p>
                    <p className="text-zinc-700">Delivery Tier: {deliveryMethod}</p>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100">
                  {calculation.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="py-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                          <ResilientImage
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900">{item.productName}</p>
                          <p className="text-zinc-500">
                            {item.variantLabel} · Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-zinc-900">
                        {formatINR(item.itemSubtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    Back to Payment
                  </button>
                  <button
                    type="button"
                    disabled={placingOrder}
                    onClick={handleCreateOrder}
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {placingOrder
                        ? 'Verifying Stock & Pricing...'
                        : paymentMethod === 'COD'
                        ? `Confirm COD Order (${formatINR(calculation.finalTotal)})`
                        : `Authorize ${paymentMethod} Payment (${formatINR(
                            calculation.finalTotal
                          )})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Server-Authoritative Calculation Breakdown */}
          <div className="lg:col-span-4 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
              Server-Validated Price Breakdown
            </h3>

            {loadingCalc || !calculation ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Recalculating totals on server...
              </div>
            ) : (
              <>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-zinc-600">
                    <dt>Original MRP Subtotal</dt>
                    <dd className="font-mono">{formatINR(calculation.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <dt>Product Discount</dt>
                    <dd className="font-mono">
                      −{formatINR(calculation.productDiscount)}
                    </dd>
                  </div>
                  {calculation.couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <dt>Coupon ({calculation.couponCode})</dt>
                      <dd className="font-mono">
                        −{formatINR(calculation.couponDiscount)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600">
                    <dt>Taxable Net Value</dt>
                    <dd className="font-mono">{formatINR(calculation.taxableAmount)}</dd>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <dt>GST (18% Integrated Tax)</dt>
                    <dd className="font-mono">+{formatINR(calculation.gstTaxAmount)}</dd>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <dt>Delivery ({calculation.deliveryMethod})</dt>
                    <dd className="font-mono">
                      {calculation.deliveryFee === 0
                        ? 'Complimentary'
                        : formatINR(calculation.deliveryFee)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200 pt-3">
                    <dt>Final Order Total</dt>
                    <dd className="font-mono">{formatINR(calculation.finalTotal)}</dd>
                  </div>
                </dl>

                <div className="pt-2 border-t border-zinc-100 flex items-center gap-2 text-[11px] text-zinc-500">
                  <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0" />
                  <span>
                    Backend revalidates SKU stock, coupon limits, and GST before committing
                    your order.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sandbox Online Payment Verification Modal */}
      {verifyingPayment && createdOrder && gatewaySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <p className="text-[11px] font-mono uppercase text-amber-700 font-semibold">
                  Sandbox Payment Gateway
                </p>
                <h3 className="text-base font-bold text-zinc-900">
                  Authorize {paymentMethod} Transaction
                </h3>
              </div>
              <span className="font-mono text-sm font-bold text-zinc-900">
                {formatINR(gatewaySession.amount)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1 font-mono">
              <p>Order Ref: {createdOrder.orderNumber}</p>
              <p>Gateway Order ID: {gatewaySession.gatewayOrderId}</p>
              <p className="truncate">
                HMAC Token: {gatewaySession.sandboxSignatureToken.slice(0, 24)}...
              </p>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              In Test/Sandbox mode, choose whether to complete HMAC-SHA256 verified payment
              authorization or simulate a bank failure to test error handling.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleCompleteSandboxPayment(false)}
                className="w-full py-3 text-xs font-semibold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Authorize &amp; Verify Signature (Success)
              </button>
              <button
                type="button"
                onClick={() => handleCompleteSandboxPayment(true)}
                className="w-full py-2.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              >
                Simulate Payment Decline / Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
