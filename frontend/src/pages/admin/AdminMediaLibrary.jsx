import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { 
  Image as ImageIcon, Upload, Trash2, Plus, X, 
  Check, Folder, Sparkles, RefreshCw, ExternalLink 
} from 'lucide-react'

export default function AdminMediaLibrary() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({ file: null, fileName: '', category: '' })

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      setLoading(true)
      const res = await adminAPI.getGlobalMedia()
      setMedia(res.data?.data || [])
    } catch (error) {
      toast.error('Failed to fetch media assets')
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
      setMedia([res.data?.data, ...media])
      toast.success('Stock asset uploaded to global library!')
      setShowUploadModal(false)
      setUploadForm({ file: null, fileName: '', category: '' })
    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name || 'this image'} from the global library?`)) return

    try {
      await adminAPI.deleteGlobalMedia(id)
      setMedia(media.filter(m => m._id !== id))
      toast.success('Image deleted from library')
    } catch (error) {
      toast.error('Failed to delete image')
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border-medium)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Digital Asset Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[var(--text-primary)] tracking-tight">
            Global Media Library
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Curated stock food photography available for all restaurant owners when creating menu products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMedia}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh assets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New Asset</span>
          </button>
        </div>
      </div>

      {/* ── Grid of Media Assets ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-60 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] animate-pulse" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] p-8">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] font-heading mb-1">
            Media Library is Empty
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-4">
            Upload high-resolution stock food photos (pizzas, burgers, coffee, desserts) for café owners to pick from.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
          >
            Upload First Asset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {media.map(m => (
            <div
              key={m._id}
              className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-medium)] hover:border-[var(--border-hover)] overflow-hidden shadow-sm flex flex-col justify-between group transition-all"
            >
              <div className="relative aspect-video sm:aspect-square overflow-hidden bg-slate-900">
                <img
                  src={m.image_url}
                  alt={m.file_name || 'Food item'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                    {m.category || 'General'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 flex items-center justify-between gap-2 border-t border-[var(--border-medium)] bg-[var(--bg-card)]">
                <span className="font-semibold text-xs text-[var(--text-primary)] truncate" title={m.file_name}>
                  {m.file_name || 'Stock Asset'}
                </span>

                <button
                  onClick={() => handleDelete(m._id, m.file_name)}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                  title="Delete asset"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-medium)] mb-4">
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Upload Stock Photo Asset
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Image File *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  className="w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Photo Name / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artisanal Cappuccino with Latte Art"
                  value={uploadForm.fileName}
                  onChange={e => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Category Tag *
                </label>
                <input
                  list="media-categories"
                  required
                  placeholder="Select or enter category..."
                  value={uploadForm.category}
                  onChange={e => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-medium)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
                <datalist id="media-categories">
                  {['General', 'Beverages', 'Burgers', 'Pizzas', 'Bakery & Desserts', 'Pastas', 'Breakfast', 'Salads'].map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md shadow-indigo-500/25 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Uploading...' : 'Publish to Library'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
