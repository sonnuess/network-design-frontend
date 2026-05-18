import { useState } from 'react'
import MapEditor from './components/MapEditor'
import { optimizeNetwork } from './api/optimize'

function App() {
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [demands, setDemands] = useState([])
  const [params, setParams] = useState({
    c_km: 1.0,
    c_u: 0.1,
    U: 100.0
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // Добавление узла
  const addNode = (newNode) => {
    setNodes([...nodes, newNode])
  }

  // Генерация потенциальных каналов (все пары)
  const generateLinks = () => {
    const newLinks = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        // Примерное расстояние в км (1 градус ≈ 111 км)
        const dx = (nodes[i].lat - nodes[j].lat) * 111
        const dy = (nodes[i].lon - nodes[j].lon) * 85
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        newLinks.push({
          source: nodes[i].id,
          target: nodes[j].id,
          distance: distance,
          forced: false,
          forbidden: false
        })
      }
    }
    setLinks(newLinks)
    setResult(null) // Сброс результатов при изменении топологии
  }

  // Управление требованиями
  const addDemand = () => {
    setDemands([...demands, { source: '', target: '', volume: 1.0 }])
  }

  const removeDemand = (index) => {
    setDemands(demands.filter((_, i) => i !== index))
  }

  const updateDemand = (index, field, value) => {
    const newDemands = [...demands]
    newDemands[index][field] = value
    setDemands(newDemands)
  }

  // Запуск оптимизации
  const runOptimization = async () => {
    if (nodes.length < 2) {
      alert('Добавьте хотя бы 2 узла')
      return
    }
    
    if (demands.length === 0 || demands.every(d => !d.source || !d.target)) {
      alert('Добавьте хотя бы одно требование (укажите источник и назначение)')
      return
    }

    if (links.length === 0) {
      alert('Сначала сгенерируйте каналы')
      return
    }

    setLoading(true)
    try {
      // Преобразуем данные для бэкенда (source/target -> source_node_id/dest_node_id)
      const requestData = {
        nodes: nodes.map(n => ({ id: n.id, lat: n.lat, lon: n.lon })),
        candidate_links: links.map(link => ({
          source_node_id: link.source,
          dest_node_id: link.target,
          distance: link.distance,
          forced: link.forced,
          forbidden: link.forbidden
        })),
        demands: demands
          .filter(d => d.source && d.target && d.volume > 0)
          .map(demand => ({
            source_node_id: demand.source,
            dest_node_id: demand.target,
            volume: demand.volume
          })),
        params: params
      }
      
      console.log('Отправляем на бэкенд:', requestData)
      const response = await optimizeNetwork(requestData)
      console.log('Ответ бэкенда:', response)
      setResult(response)
      
      // Обновляем каналы с результатами оптимизации (если есть)
      if (response.links) {
        const updatedLinks = links.map(link => {
          const resultLink = response.links.find(
            rl => rl.source_node_id === link.source && rl.dest_node_id === link.target
          )
          return resultLink ? { ...link, z: resultLink.z, capacity: resultLink.capacity, load: resultLink.load } : link
        })
        setLinks(updatedLinks)
      }
      
      alert(`✅ Оптимизация завершена!\nСтоимость сети: ${response.objective?.toFixed(2)}`)
    } catch (error) {
      console.error('Ошибка:', error)
      alert('❌ Ошибка при оптимизации: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Проектирование топологии сети</h1>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Левая колонка - карта */}
        <div style={{ flex: 2 }}>
          <MapEditor
            nodes={nodes}
            links={links}
            onAddNode={addNode}
            onSelectNode={(id) => console.log('Выбран узел:', id)}
          />
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button onClick={generateLinks} disabled={nodes.length < 2}>
              Сгенерировать каналы (все пары)
            </button>
            <button onClick={runOptimization} disabled={loading} style={{ backgroundColor: '#4CAF50', color: 'white' }}>
              {loading ? 'Оптимизация...' : '🚀 Запустить оптимизацию'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'gray' }}>
            💡 Кликните на карту → добавить узел. Затем сгенерируйте каналы и добавьте требования.
          </p>
        </div>
        
        {/* Правая колонка - панели */}
        <div style={{ flex: 1 }}>
          {/* Параметры */}
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Параметры</h3>
            <div style={{ marginBottom: '10px' }}>
              <label>c_km (стоимость км): </label>
              <input type="number" step="0.1" value={params.c_km} onChange={(e) => setParams({...params, c_km: parseFloat(e.target.value)})} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>c_u (стоимость емкости): </label>
              <input type="number" step="0.1" value={params.c_u} onChange={(e) => setParams({...params, c_u: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label>U (макс. емкость): </label>
              <input type="number" value={params.U} onChange={(e) => setParams({...params, U: parseFloat(e.target.value)})} />
            </div>
          </div>
          
          {/* Требования */}
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Требования (Demands)</h3>
            {demands.map((demand, idx) => (
              <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                <select value={demand.source} onChange={(e) => updateDemand(idx, 'source', e.target.value)} style={{ width: '100px', marginRight: '5px' }}>
                  <option value="">Источник</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                →
                <select value={demand.target} onChange={(e) => updateDemand(idx, 'target', e.target.value)} style={{ width: '100px', marginLeft: '5px' }}>
                  <option value="">Назначение</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                <input type="number" value={demand.volume} onChange={(e) => updateDemand(idx, 'volume', parseFloat(e.target.value))} style={{ width: '70px', marginLeft: '5px' }} />
                <button onClick={() => removeDemand(idx)} style={{ marginLeft: '10px' }}>🗑️</button>
              </div>
            ))}
            <button onClick={addDemand}>+ Добавить требование</button>
          </div>
          
          {/* Результат */}
          {result && (
            <div style={{ padding: '15px', border: '1px solid #4CAF50', borderRadius: '8px', background: '#e8f5e9' }}>
              <h3>📊 Результат</h3>
              <p><strong>Статус:</strong> {result.status}</p>
              <p><strong>Стоимость сети:</strong> {result.objective?.toFixed(2)}</p>
              <p><strong>Построено каналов:</strong> {result.links?.filter(l => l.z === 1).length || 0}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Список узлов */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Узлы ({nodes.length})</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {nodes.map(node => (
            <span key={node.id} style={{ padding: '5px 10px', background: '#e0e0e0', borderRadius: '15px' }}>
              {node.name || node.id}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App