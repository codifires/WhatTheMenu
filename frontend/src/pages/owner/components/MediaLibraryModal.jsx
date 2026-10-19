import React from 'react';
import { UploadCloud, X, Check, Image, Sparkles } from 'lucide-react';

const MediaLibraryModal = ({
  isOpen,
  onClose,
  mediaTab,
  setMediaTab,
  globalMedia = [],
  handleSelectGlobalMedia,
  form,
  setForm,
  setImageFile
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  if (!isOpen) return null;

  const categories = ['All', ...new Set(globalMedia.map(m => m.category || 'General'))];
  const filteredMedia = selectedCategory === 'All' ? globalMedia : globalMedia.filter(m => (m.category || 'General') === selectedCategory);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 760, background: 'var(--bg-shell, #090d16)', border: '1px solid var(--border-medium)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.8)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)' }}>Select Product Photo</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0' }}>Choose high-resolution food imagery or upload custom assets.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'color 0.15s' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-medium)', paddingBottom: 12 }}>
          <button 
            onClick={() => setMediaTab('platform')} 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px', 
              borderRadius: 10, 
              cursor: 'pointer', 
              fontSize: 13, 
              fontWeight: 700, 
              border: 'none', 
              background: mediaTab === 'platform' ? 'rgba(124,58,237,0.18)' : 'transparent', 
              color: mediaTab === 'platform' ? '#c4b5fd' : 'var(--text-secondary)' 
            }}
          >
            <Sparkles size={14} />
            <span>Platform Stock Library</span>
          </button>
          <button 
            onClick={() => setMediaTab('upload')} 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px', 
              borderRadius: 10, 
              cursor: 'pointer', 
              fontSize: 13, 
              fontWeight: 700, 
              border: 'none', 
              background: mediaTab === 'upload' ? 'rgba(124,58,237,0.18)' : 'transparent', 
              color: mediaTab === 'upload' ? '#c4b5fd' : 'var(--text-secondary)' 
            }}
          >
            <UploadCloud size={14} />
            <span>Upload Custom Photo</span>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 320 }}>
          {mediaTab === 'platform' && (
            <div>
              {categories.length > 2 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setSelectedCategory(c)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: selectedCategory === c ? '#7c3aed' : 'var(--bg-input)',
                        color: selectedCategory === c ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {filteredMedia.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  {filteredMedia.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => handleSelectGlobalMedia(m)}
                      style={{ 
                        borderRadius: 14, 
                        border: form.image_url === m.image_url ? '2px solid #7c3aed' : '1px solid var(--border-medium)', 
                        background: 'var(--bg-input)', 
                        overflow: 'hidden', 
                        cursor: 'pointer', 
                        transition: 'all 0.15s', 
                        position: 'relative' 
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={m.image_url} alt="Stock food" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {m.category || 'General'}
                        </div>
                        {form.image_url === m.image_url && (
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, background: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {m.file_name || 'image.jpg'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontSize: 14 }}>No platform stock images found in this category.</p>
                </div>
              )}
            </div>
          )}

          {mediaTab === 'upload' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ width: '100%', maxWidth: 420, padding: 36, borderRadius: 20, border: '2px dashed rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.04)', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <UploadCloud size={32} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px', fontFamily: "'Outfit', sans-serif" }}>Upload your food photo</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px' }}>JPEG, PNG, or WebP up to 5MB</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setForm({...form, image_url: ''});
                      onClose();
                    }
                  }} 
                  style={{ padding: 10, background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 10, color: 'var(--text-primary)', width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MediaLibraryModal;
