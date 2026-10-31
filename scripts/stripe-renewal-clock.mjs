export function getInvoiceAttemptTime(invoice) {
  if (!Number.isSafeInteger(invoice?.created) || invoice.created <= 0) return null;
  if (Number.isSafeInteger(invoice.automatically_finalizes_at) && invoice.automatically_finalizes_at > 0) {
    return invoice.automatically_finalizes_at;
  }
  return invoice.created + 60 * 60;
}
