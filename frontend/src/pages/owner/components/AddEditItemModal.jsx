import React from 'react';
import InputField from '../../../components/ui/InputField';
import { X, Image as ImageIcon, Check } from 'lucide-react';

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
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-bg)',
        backdropFilter: 'blur(8px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          boxShadow: 'var(--shadow-dropdown)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 800,
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
              color: 'var(--text-primary)'
            }}>
              {editingItem ? 'Edit Menu Dish' : 'Add New Dish'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Fill out dish details to display on your digital QR menu.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-shell)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField
            label="Dish Name *"
            placeholder="e.g. Hazelnut Truffle Latte"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <InputField
              label="Price (₹) *"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
              required
            />
            <InputField
              label="Category *"
              as="select"
              value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}
              required
            >
              <option value="" style={{ background: 'var(--bg-card)' }}>Select Category...</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id} style={{ background: 'var(--bg-card)' }}>
                  {cat.name}
                </option>
              ))}
            </InputField>
          </div>

          <InputField
            label="Description (Optional)"
            as="textarea"
            placeholder="Key ingredients, allergens, or preparation style..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />

          {/* Food Dietary Preference Toggle */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              Dietary Preference *
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                border: form.is_veg ? '1.5px solid var(--success-main)' : '1px solid var(--border-medium)',
                background: form.is_veg ? 'var(--success-light)' : 'var(--bg-shell)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="radio"
                  name="diet"
                  checked={form.is_veg}
                  onChange={() => setForm({ ...form, is_veg: true })}
                  style={{ display: 'none' }}
                />
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-main)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: form.is_veg ? 'var(--success-text)' : 'var(--text-secondary)' }}>
                  Vegetarian
                </span>
              </label>

              <label style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px',
                borderRadius: 'var(--radius-md)',
                border: !form.is_veg ? '1.5px solid var(--danger-main)' : '1px solid var(--border-medium)',
                background: !form.is_veg ? 'var(--danger-light)' : 'var(--bg-shell)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}>
                <input
                  type="radio"
                  name="diet"
                  checked={!form.is_veg}
                  onChange={() => setForm({ ...form, is_veg: false })}
                  style={{ display: 'none' }}
                />
                <span style={{ width: 8, height: 8, background: 'var(--danger-main)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: !form.is_veg ? 'var(--danger-text)' : 'var(--text-secondary)' }}>
                  Non-Veg
                </span>
              </label>
            </div>
          </div>

          {/* Image Picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Dish Photo (Optional)
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-medium)',
              background: 'var(--bg-shell)'
            }}>
              {form.image_url || imageFile ? (
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                    alt="Selected dish"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0
                }}>
                  <ImageIcon size={20} />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {imageFile ? imageFile.name : (form.image_url ? 'Library Image Selected' : 'No photo chosen')}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Upload a photo or choose from library.
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenMediaModal}
                style={{
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-subtle)',
                  border: '1px solid var(--brand-border)',
                  color: 'var(--brand-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {form.image_url || imageFile ? 'Change' : 'Choose'}
              </button>

              {(form.image_url || imageFile) && (
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...form, image_url: '' });
                    setImageFile(null);
                  }}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger-text)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-shell)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--brand-gradient)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
              }}
            >
              {editingItem ? 'Save Changes' : 'Add to Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditItemModal;
