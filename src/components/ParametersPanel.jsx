export default function ParametersPanel({ params, onParamChange, onOptimize, loading }) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '10px' }}>
        <h3>Параметры оптимизации</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label>
            c_km (стоимость км):
            <input
              type="number"
              step="0.1"
              value={params.c_km}
              onChange={(e) => onParamChange('c_km', parseFloat(e.target.value))}
              style={{ marginLeft: '10px' }}
            />
          </label>
          <label>
            c_u (стоимость единицы емкости):
            <input
              type="number"
              step="0.1"
              value={params.c_u}
              onChange={(e) => onParamChange('c_u', parseFloat(e.target.value))}
              style={{ marginLeft: '10px' }}
            />
          </label>
          <label>
            U (макс. емкость канала):
            <input
              type="number"
              value={params.U}
              onChange={(e) => onParamChange('U', parseFloat(e.target.value))}
              style={{ marginLeft: '10px' }}
            />
          </label>
        </div>
        <button 
          onClick={onOptimize} 
          disabled={loading}
          style={{ marginTop: '15px', padding: '8px 16px', fontSize: '16px' }}
        >
          {loading ? 'Оптимизация...' : 'Запустить оптимизацию'}
        </button>
      </div>
    )
  }