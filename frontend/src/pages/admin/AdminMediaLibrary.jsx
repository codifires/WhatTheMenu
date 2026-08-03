import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'

const AdminMediaLibrary = () => {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({ file: null, fileName: '', category: 'General' })

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      const res = await adminAPI.getGlobalMedia()
      setMedia(res.data.data)
    } catch (error) {
      toast.error('Failed to fetch media')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.file) {
      toast.error('Please select an image file')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('image', uploadForm.file)
    formData.append('file_name', uploadForm.fileName)
    formData.append('category', uploadForm.category)

    try {
      const res = await adminAPI.uploadGlobalMedia(formData)
      setMedia([res.data.data, ...media])
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setShowUploadModal(false)
      setUploadForm({ file: null, fileName: '', category: 'General' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this image? It will be removed from the global library.')) return

    try {
      await adminAPI.deleteGlobalMedia(id)
      setMedia(media.filter(m => m._id !== id))
      toast.success('Image deleted')
    } catch (error) {
      toast.error('Failed to delete')
    }
  }

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, margin: '0 0 4px', fontFamily: "'Outfit',sans-serif" }}>Media Library</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Manage global stock images for all café owners.</p>
        </div>
        <div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Upload Image
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : media.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#e5e7eb', margin: '0 0 6px' }}>No media uploaded yet</p>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Upload some high-quality stock photos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {media.map(m => (
            <div key={m._id} style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }} className="media-card">
              <img src={m.image_url} alt="Global" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#e5e7eb', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {m.category || 'General'}
              </div>
              <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.file_name || 'image.jpg'}</span>
                <button onClick={() => handleDelete(m._id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleUpload} style={{ width: 400, background: '#0f172a', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>Upload Media</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600 }}>Image File</label>
              <input type="file" accept="image/*" onChange={e => setUploadForm({...uploadForm, file: e.target.files[0]})} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, color: '#fff', fontSize: 14 }} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600 }}>Image Name</label>
              <input type="text" placeholder="e.g. Delicious Burger" value={uploadForm.fileName} onChange={e => setUploadForm({...uploadForm, fileName: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }} required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 600 }}>Category</label>
              <select value={uploadForm.category} onChange={e => setUploadForm({...uploadForm, category: e.target.value})} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, outline: 'none' }}>
                <option value="General" style={{ background: '#0f172a', color: '#fff' }}>General</option>
                <option value="Burgers" style={{ background: '#0f172a', color: '#fff' }}>Burgers</option>
                <option value="Pizza" style={{ background: '#0f172a', color: '#fff' }}>Pizza</option>
                <option value="Beverages" style={{ background: '#0f172a', color: '#fff' }}>Beverages</option>
                <option value="Desserts" style={{ background: '#0f172a', color: '#fff' }}>Desserts</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setShowUploadModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={uploading} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#4f46e5', border: 'none', color: '#fff', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AdminMediaLibrary
