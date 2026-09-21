"use client";

import {FormEvent, useState} from "react";
import {CreditCard, Landmark, Loader2, ShieldCheck, Smartphone} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {PaymentMethod, PaymentOrder, PaymentResult, processMockPayment} from "@/lib/payments";

type Props = {
  order: PaymentOrder | null;
  accessToken: string;
  onCancel(): void;
  onPaid(payment: PaymentResult): Promise<void>;
};

const methods = [
  ["upi", "UPI", Smartphone],
  ["card", "Card", CreditCard],
  ["netbanking", "Net banking", Landmark],
] as const;

export function MockPaymentGateway({order, accessToken, onCancel, onPaid}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      const payment = await processMockPayment(
        order.order_id,
        method,
        simulateFailure,
        accessToken,
      );
      await onPaid(payment);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Payment could not be completed.");
      setBusy(false);
    }
  }

  return <Dialog open={!!order} onOpenChange={open => !open && !busy && onCancel()}>
    <DialogContent className="mock-payment-modal">
      <DialogTitle>JunglePay Checkout</DialogTitle>
      <DialogDescription>Mock gateway · no real money or personal payment data is used.</DialogDescription>
      <div className="mock-payment-total">
        <span>Amount</span>
        <strong>₹{((order?.amount || 0) / 100).toLocaleString("en-IN")}</strong>
      </div>
      <div className="mock-payment-methods" role="tablist" aria-label="Payment method">
        {methods.map(([id, label, Icon]) => <button
          type="button"
          role="tab"
          aria-selected={method === id}
          className={method === id ? "selected" : ""}
          key={id}
          onClick={() => setMethod(id)}
        ><Icon/>{label}</button>)}
      </div>
      <form className="stack" onSubmit={submit}>
        {method === "upi" && <label className="field"><span>UPI ID</span><Input placeholder="name@bank" pattern="[^@\s]+@[^@\s]+" required/><small>Use any correctly formatted mock UPI ID.</small></label>}
        {method === "card" && <>
          <label className="field"><span>Card number</span><Input inputMode="numeric" placeholder="4111 1111 1111 1111" pattern="[0-9 ]{16,19}" required/></label>
          <div className="equal-col">
            <label className="field"><span>Expiry</span><Input placeholder="12/30" pattern="(0[1-9]|1[0-2])/[0-9]{2}" required/></label>
            <label className="field"><span>CVV</span><Input inputMode="numeric" type="password" placeholder="123" pattern="[0-9]{3}" maxLength={3} required/></label>
          </div>
        </>}
        {method === "netbanking" && <label className="field"><span>Bank</span><select required defaultValue=""><option value="" disabled>Select your bank</option><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Bank of Baroda</option></select></label>}
        <label className="mock-failure-toggle"><input type="checkbox" checked={simulateFailure} onChange={event => setSimulateFailure(event.target.checked)}/><span>Simulate a declined payment</span></label>
        {error && <div className="notice error" role="alert">{error}</div>}
        <Button className="jm-btn primary" type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin"/> : <ShieldCheck/>}
          {busy ? "Processing mock payment…" : `Pay ₹${((order?.amount || 0) / 100).toLocaleString("en-IN")}`}
        </Button>
        <small className="mock-security"><ShieldCheck/>256-bit-style demo flow · Signed server verification · No charge</small>
      </form>
    </DialogContent>
  </Dialog>;
}
