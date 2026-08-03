import React from 'react';
import InputField from '../../../components/ui/InputField';

const AddEditItemModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  categories,
  editingItem,
  imageFile,
  setImageFile,
  onOpenMediaModal
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, background: '#0a0d18', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.7)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif" }}>{editingItem ? 'Edit Item' : 'Add Item'}</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Update menu details.</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField label="Item Name *" placeholder="e.g. Classic Burger" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <InputField label="Price (₹) *" type="number" min="0" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            <InputField label="Category *" as="select" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required>
              <option value="" style={{ background: '#0a0d18' }}>Select...</option>
              {categories.map(cat => <option key={cat._id} value={cat._id} style={{ background: '#0a0d18' }}>{cat.name}</option>)}
            </InputField>
          </div>

          <InputField label="Description" as="textarea" placeholder="Briefly describe the item..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Food Preference</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, border: form.is_veg ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)', background: form.is_veg ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="diet" checked={form.is_veg} onChange={() => setForm({...form, is_veg: true})} style={{ display: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: form.is_veg ? '#34d399' : '#9ca3af' }}>Vegetarian</span>
              </label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, border: !form.is_veg ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.1)', background: !form.is_veg ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="diet" checked={!form.is_veg} onChange={() => setForm({...form, is_veg: false})} style={{ display: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: !form.is_veg ? '#f87171' : '#9ca3af' }}>Non-Veg</span>
              </label>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 6 }}>Menu Item Image (Optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)' }}>
              {form.image_url || imageFile ? (
                <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', background: '#000' }}>
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt="Selected" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🖼️</div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{imageFile ? imageFile.name : (form.image_url ? 'Platform Image' : 'No image selected')}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>Enhance your menu with photos.</p>
              </div>
              <button type="button" onClick={onOpenMediaModal} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {form.image_url || imageFile ? 'Change' : 'Select Image'}
              </button>
              {(form.image_url || imageFile) && (
                <button type="button" onClick={() => { setForm({...form, image_url: ''}); setImageFile(null); }} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Remove
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#06b6d4,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(6,182,212,0.3)' }}>{editingItem ? 'Save Changes' : 'Create Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditItemModal;
