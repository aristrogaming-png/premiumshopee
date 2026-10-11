// Server-side integration adapter only. There is intentionally no public HTTP endpoint.
// Call after validating a payment-provider signature AND looking up the paid order in your database.
// The current WhatsApp flow supplies neither a verified payment nor consented GA client ID.
function purchasePayload(payment) {
  if (!payment || payment.status !== 'paid' || payment.verified !== true || payment.analyticsConsent !== true) return null;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(payment.transactionId || '') || !/^\d+\.\d+$/.test(payment.clientId || '')) return null;
  if (!['USD', 'INR', 'GBP'].includes(payment.currency) || !Number.isFinite(payment.total) || payment.total < 0) return null;
  if (!Array.isArray(payment.items) || !payment.items.length || payment.items.some(item => !/^[a-f\d]{24}$/i.test(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) return null;
  return {
    client_id: payment.clientId,
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{ name: 'purchase', params: {
      transaction_id: payment.transactionId,
      currency: payment.currency,
      value: payment.total,
      items: payment.items.map(item => ({ item_id: item.productId, quantity: item.quantity, price: item.unitPrice }))
    } }]
  };
}
async function reportConfirmedPurchase(payment, transport = fetch) {
  const payload = purchasePayload(payment);
  if (!payload) return { sent: false, reason: 'Requires a verified paid order, explicit analytics consent and valid non-personal identifiers.' };
  const measurement = process.env.GA_MEASUREMENT_ID;
  const secret = process.env.GA_API_SECRET;
  if (!/^G-[A-Z0-9]+$/.test(measurement || '') || !secret) return { sent: false, reason: 'Analytics is not configured.' };
  const endpoint = new URL('https://www.google-analytics.com/mp/collect');
  endpoint.searchParams.set('measurement_id', measurement);
  endpoint.searchParams.set('api_secret', secret);
  const response = await transport(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
  // Google deduplicates repeated purchase events using transaction_id. Retries must reuse it.
  // A 2xx is transport acceptance, not proof of a GA report entry; validate in DebugView before wiring production.
  return { sent: response.ok, status: response.status };
}
module.exports = { purchasePayload, reportConfirmedPurchase };
