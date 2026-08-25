import React, { forwardRef } from 'react';

const BillReceipt = forwardRef(({ order, cafe }, ref) => {
  if (!order || !cafe) return null;

  const billing = cafe.billing_settings || { format: 'standard', thank_you_message: 'Thank you for your visit!' };
  
  // Format Date
  const orderDate = new Date(order.created_at || new Date());
  const formattedDate = orderDate.toLocaleDateString();
  const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} className={`bill-receipt-container format-${billing.format}`}>
      <div className="bill-header">
        {cafe.logo && <img src={cafe.logo} alt="Cafe Logo" className="bill-logo" />}
        <h2>{cafe.name}</h2>
        {cafe.address && <p className="bill-address">{cafe.address}</p>}
        {cafe.phone && <p className="bill-phone">Ph: {cafe.phone}</p>}
        {billing.tax_number && <p className="bill-tax">Tax ID / GST: {billing.tax_number}</p>}
      </div>

      <div className="bill-meta">
        <p><strong>Order #:</strong> {order._id ? order._id.substring(order._id.length - 6).toUpperCase() : 'N/A'}</p>
        <p><strong>Date:</strong> {formattedDate} {formattedTime}</p>
        {order.table_number && <p><strong>Table:</strong> {order.table_number}</p>}
        <p><strong>Payment:</strong> {order.payment_method ? order.payment_method.toUpperCase() : 'CASH'} ({order.payment_status || 'completed'})</p>
      </div>

      <table className="bill-items-table">
        <thead>
          <tr>
            <th className="align-left">Item</th>
            <th className="align-center">Qty</th>
            <th className="align-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((item, index) => (
            <tr key={index}>
              <td className="align-left">
                {item.menu_item?.name || 'Item'}
                {item.notes && <div className="bill-item-notes">*{item.notes}</div>}
              </td>
              <td className="align-center">{item.quantity}</td>
              <td className="align-right">,1{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bill-totals">
        <div className="bill-total-row">
          <span>Subtotal</span>
          <span>,1{order.subtotal || order.total_amount}</span>
        </div>
        {(order.tax_amount > 0 || cafe.tax_percentage > 0) && (
          <div className="bill-total-row">
            <span>Tax ({cafe.tax_percentage || 0}%)</span>
            <span>,1{order.tax_amount || 0}</span>
          </div>
        )}
        <div className="bill-total-row grand-total">
          <span>Total</span>
          <span>,1{order.total_amount}</span>
        </div>
      </div>

      <div className="bill-footer">
        <p>{billing.thank_you_message}</p>
        <p className="powered-by">Powered by WhatTheMenu</p>
      </div>
    </div>
  );
});

export default BillReceipt;
