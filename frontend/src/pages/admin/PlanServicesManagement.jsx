import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PlanServicesManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [basicFeatures, setBasicFeatures] = useState([]);
  const [starterFeatures, setStarterFeatures] = useState([]);
  const [proFeatures, setProFeatures] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings');
      if (res.data.success) {
        setBasicFeatures(res.data.data.basic_features || []);
          setStarterFeatures(res.data.data.starter_features || []);
        setProFeatures(res.data.data.pro_features || []);
      }
    } catch (error) {
      toast.error('Failed to load plan services');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/admin/settings', {
        basic_features: basicFeatures,
          starter_features: starterFeatures,
        pro_features: proFeatures
      });
      if (res.data.success) {
        toast.success('Plan services updated successfully!');
      }
    } catch (error) {
      toast.error('Failed to save plan services');
    } finally {
      setSaving(false);
    }
  };

  const addFeature = (plan) => {
    if (plan === 'basic') setBasicFeatures([...basicFeatures, '']);
    else if (plan === 'starter') setStarterFeatures([...starterFeatures, '']);
    else setProFeatures([...proFeatures, '']);
  };

  const updateFeature = (plan, index, value) => {
    if (plan === 'basic') {
      const newFeatures = [...basicFeatures];
      newFeatures[index] = value;
      setBasicFeatures(newFeatures);
    } else if (plan === 'basic') {
      setBasicFeatures(basicFeatures.filter((_, i) => i !== index));
    } else if (plan === 'starter') {
      const newFeatures = [...starterFeatures];
      newFeatures[index] = value;
      setStarterFeatures(newFeatures);
    } else {
      const newFeatures = [...proFeatures];
      newFeatures[index] = value;
      setProFeatures(newFeatures);
    }
  };

  const removeFeature = (plan, index) => {
    if (plan === 'starter') {
      setStarterFeatures(starterFeatures.filter((_, i) => i !== index));
    } else {
      setProFeatures(proFeatures.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const FeatureList = ({ title, features, plan }) => (
    <div style={{
      background: plan === 'pro' 
        ? 'linear-gradient(180deg, rgba(6,182,212,0.05) 0%, rgba(255,255,255,0.01) 100%)' 
        : 'rgba(255,255,255,0.02)',
      border: plan === 'pro'
        ? '1px solid rgba(6,182,212,0.2)'
        : '1px solid rgba(255,255,255,0.05)',
      borderRadius: '24px',
      padding: '32px',
      position: 'relative'
    }}>
      {plan === 'pro' && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #06b6d4, #4f46e5)', padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff', boxShadow: '0 4px 12px rgba(6,182,212,0.3)' }}>Premium</div>
      )}
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold font-display" style={{ color: plan === 'pro' ? '#06b6d4' : '#fff' }}>
            {title}
          </h2>
          <p className="text-sm text-dark-400 mt-1">Configure {plan} tier perks</p>
        </div>
        <button 
          onClick={() => addFeature(plan)}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: plan === 'pro' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            background: plan === 'pro' ? '#06b6d4' : 'rgba(255,255,255,0.05)',
            color: plan === 'pro' ? '#080c14' : '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={e => {
            if (plan === 'pro') e.currentTarget.style.transform = 'translateY(-2px)'
            else e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={e => {
            if (plan === 'pro') e.currentTarget.style.transform = 'translateY(0)'
            else e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Perk
        </button>
      </div>

      <div className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="flex gap-3 items-center group relative">
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: plan === 'pro' ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <span style={{ color: plan === 'pro' ? '#06b6d4' : '#9ca3af', fontSize: '14px', fontWeight: 600 }}>{index + 1}</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={feature}
                onChange={(e) => updateFeature(plan, index, e.target.value)}
                placeholder="Enter perk description (e.g., 'Custom Domain')"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={e => {
                  e.target.style.borderColor = plan === 'pro' ? 'rgba(6,182,212,0.5)' : 'rgba(124,58,237,0.5)'
                  e.target.style.boxShadow = plan === 'pro' ? '0 0 0 3px rgba(6,182,212,0.1)' : '0 0 0 3px rgba(124,58,237,0.1)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.05)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <button
              onClick={() => removeFeature(plan, index)}
              style={{
                width: '42px', height: '42px', borderRadius: '12px',
                border: '1px solid rgba(239,68,68,0.2)',
                background: 'rgba(239,68,68,0.05)',
                color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                opacity: 0.6
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#ef4444'
                e.currentTarget.style.color = '#fff'
                e.currentTarget.style.opacity = 1
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
                e.currentTarget.style.color = '#ef4444'
                e.currentTarget.style.opacity = 0.6
              }}
              title="Remove perk"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        ))}
        {features.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px', 
            border: '1px dashed rgba(255,255,255,0.1)', 
            borderRadius: '16px', background: 'rgba(0,0,0,0.1)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg className="w-6 h-6 text-dark-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <p className="text-dark-400 font-medium text-sm">No perks added yet.</p>
            <p className="text-dark-500 text-xs mt-1">Click the button above to add your first feature.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white font-display tracking-tight mb-2">Plan Perks</h1>
          <p className="text-dark-400 text-lg">Define exactly what your Cafe Owners get when they subscribe.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{
            padding: '14px 28px',
            borderRadius: '14px',
            border: 'none',
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 20px rgba(124,58,237,0.3)',
            transition: 'transform 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={e => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { if(!saving) e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Publish Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ marginTop: '80px' }}>
        <FeatureList 
          title="Basic Plan Features" 
          features={basicFeatures} 
          plan="basic" 
        />
        <FeatureList title="Starter Plan Features" 
          features={starterFeatures} 
          plan="starter" 
        />
        <FeatureList 
          title="Pro Plan Features" 
          features={proFeatures} 
          plan="pro" 
        />
      </div>
    </div>
  );
};

export default PlanServicesManagement;
