import React from 'react';

const MediaLibraryModal = ({
  isOpen,
  onClose,
  mediaTab,
  setMediaTab,
  globalMedia,
  handleSelectGlobalMedia,
  form,
  setForm,
  setImageFile
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 720, background: '#0a0d18', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 24, padding: 32, boxShadow: '0 40px 100px rgba(0,0,0,0.8)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, fontFamily: "'Outfit',sans-serif", color: '#fff' }}>Select Image</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Choose a mouth-watering photo for your item.</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12 }}>
          <button onClick={() => setMediaTab('platform')} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none', background: mediaTab === 'platform' ? 'rgba(124,58,237,0.15)' : 'transparent', color: mediaTab === 'platform' ? '#c4b5fd' : '#9ca3af' }}>
            Platform Library
          </button>
          <button onClick={() => setMediaTab('upload')} style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none', background: mediaTab === 'upload' ? 'rgba(124,58,237,0.15)' : 'transparent', color: mediaTab === 'upload' ? '#c4b5fd' : '#9ca3af' }}>
            Upload Custom
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 300 }}>
          {mediaTab === 'platform' && (
            <div>
              {globalMedia.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                  {globalMedia.map(m => (
                    <div 
                      key={m._id} 
                      onClick={() => handleSelectGlobalMedia(m)}
                      style={{ borderRadius: 12, border: form.image_url === m.image_url ? '2px solid #a78bfa' : '2px solid transparent', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
                      className="media-item-card"
                    >
                      <div style={{ position: 'relative' }}>
                        <img src={m.image_url} alt="Global" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {m.category || 'General'}
                        </div>
                        {form.image_url === m.image_url && (
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, background: '#a78bfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '8px 12px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {m.file_name || 'image.jpg'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>No platform images available yet.</div>
              )}
            </div>
          )}

          {mediaTab === 'upload' && (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 400, padding: 32, borderRadius: 16, border: '2px dashed rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>☁️</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#e5e7eb', margin: '0 0 8px' }}>Upload your own photo</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>JPEG, PNG up to 5MB</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => {
                    setImageFile(e.target.files[0]);
                    setForm({...form, image_url: ''});
                    onClose();
                  }} 
                  style={{ padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, color: '#fff', width: '100%', cursor: 'pointer' }}
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
