/**
 * printHtml — injects HTML into a hidden iframe and calls print().
 * Works on all browsers on production HTTPS — no popup blocker issues.
 */
export const printHtml = (html) => {
  const existing = document.getElementById('__print_frame__');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__print_frame__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 2000);
  };
};

export const buildReceiptHtml = (sale, storeName = 'Inventory Pro') => {
  const rows = sale.items.map(it =>
    `<tr>
      <td>${it.product?.name || '—'}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">&#8377;${(+it.price).toFixed(2)}</td>
      <td style="text-align:right">&#8377;${(+it.total).toFixed(2)}</td>
    </tr>`
  ).join('');

  let roundingRow = '';
  if (sale.roundingMethod && sale.roundingMethod !== 'none' && sale.originalTotal != null) {
    const diff = (+sale.total - +sale.originalTotal).toFixed(2);
    roundingRow = `<tr><td>Rounding</td><td style="text-align:right">${diff >= 0 ? '+' : ''}&#8377;${diff}</td></tr>`;
  }

  return `<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',monospace;font-size:12px;padding:16px;width:300px}
    h2{text-align:center;font-size:16px;margin-bottom:4px}
    .center{text-align:center}
    .divider{border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}
    th{font-size:11px;border-bottom:1px solid #000;padding:3px 0}
    td{padding:3px 0;vertical-align:top}
    .total-row td{font-weight:bold;border-top:1px solid #000;padding-top:4px}
    .footer{text-align:center;margin-top:12px;font-size:11px;color:#555}
    @media print{body{width:auto}}
  </style>
  </head><body>
  <h2>${storeName}</h2>
  <div class="center" style="font-size:11px;color:#555">Tax Invoice</div>
  <div class="divider"></div>
  <div>Bill#: <b>${sale.billNumber}</b></div>
  <div>Date: ${new Date(sale.createdAt).toLocaleString('en-IN')}</div>
  ${sale.customer ? `<div>Customer: ${sale.customer.name}</div>` : ''}
  ${sale.cashier ? `<div>Cashier: ${sale.cashier.name}</div>` : ''}
  <div class="divider"></div>
  <table>
    <thead><tr>
      <th style="text-align:left">Item</th>
      <th>Qty</th>
      <th style="text-align:right">Rate</th>
      <th style="text-align:right">Amt</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">&#8377;${(+sale.subtotal).toFixed(2)}</td></tr>
    <tr><td>Tax (GST)</td><td style="text-align:right">&#8377;${(+sale.taxAmount).toFixed(2)}</td></tr>
    ${(+sale.discountAmount) > 0 ? `<tr><td>Discount</td><td style="text-align:right">-&#8377;${(+sale.discountAmount).toFixed(2)}</td></tr>` : ''}
    ${roundingRow}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">&#8377;${(+sale.total).toFixed(2)}</td></tr>
    <tr><td>Payment</td><td style="text-align:right">${(sale.paymentMethod || '').toUpperCase()}</td></tr>
  </table>
  <div class="footer">Thank you for shopping!</div>
  </body></html>`;
};

export const printReceipt = (sale, storeName = 'Inventory Pro') =>
  printHtml(buildReceiptHtml(sale, storeName));
