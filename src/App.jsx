import { useState, useEffect } from 'react'
import MapEditor from './components/MapEditor'
import { optimizeNetwork, getParameters } from './api/optimize'

function App() {
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [demands, setDemands] = useState([])
  const [params, setParams] = useState({
    c_km: 100.0,
    c_u: 10.0,
    U: 1000.0
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  // Загрузка параметров из БД при запуске
  useEffect(() => {
    const loadParameters = async () => {
      try {
        const paramsFromBackend = await getParameters()
        if (paramsFromBackend && paramsFromBackend.length > 0) {
          const paramsObj = {}
          paramsFromBackend.forEach(p => {
            paramsObj[p.key] = p.value
          })
          setParams(paramsObj)
          console.log('Параметры загружены из БД:', paramsObj)
        } else {
          console.log('Параметров в БД нет, используем значения по умолчанию')
        }
      } catch (error) {
        console.error('Ошибка загрузки параметров:', error)
      }
    }
    loadParameters()
  }, [])

  // Добавление узла
  const addNode = (newNode) => {
    setNodes([...nodes, newNode])
  }

  // Генерация потенциальных каналов (все пары)
  const generateLinks = () => {
    const newLinks = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        newLinks.push({
          source_node_id: nodes[i].id,
          dest_node_id: nodes[j].id,
          forced: false,
          forbidden: false
        })
      }
    }
    setLinks(newLinks)
    setResult(null)
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

  // Сохранение узлов в базу данных
  const saveNodesToBackend = async () => {
    const savedNodes = []
    for (const node of nodes) {
      const response = await fetch('http://localhost:8000/api/v2/nodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: node.name || `Node ${node.id}`,
          lat: node.lat,
          lng: node.lon
        }),
      })
      
      if (response.ok) {
        const savedNode = await response.json()
        savedNodes.push(savedNode)
        console.log(`Узел ${node.id} сохранён с ID ${savedNode.id}`)
      } else {
        console.error(`Ошибка сохранения узла ${node.id}:`, response.status)
      }
    }
    return savedNodes
  }

  // Сохранение каналов в базу данных
  const saveLinksToBackend = async (savedNodes) => {
    // Создаём карту для сопоставления временных ID с реальными
    const nodeMap = {}
    for (let i = 0; i < nodes.length; i++) {
      const tempId = nodes[i].id
      const realId = savedNodes[i]?.id
      if (realId) {
        nodeMap[tempId] = realId
      }
    }

    for (const link of links) {
      const sourceId = nodeMap[link.source_node_id]
      const destId = nodeMap[link.dest_node_id]
      
      if (!sourceId || !destId) {
        console.error('Не найден ID узла для канала:', link)
        continue
      }

      const response = await fetch('http://localhost:8000/api/v2/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_node_id: sourceId,
          dest_node_id: destId
        }),
      })
      
      if (response.ok) {
        console.log(`Канал ${link.source_node_id}->${link.dest_node_id} сохранён`)
      } else {
        console.error(`Ошибка сохранения канала:`, response.status)
      }
    }
  }

  // Сохранение требований в базу данных
  const saveDemandsToBackend = async (savedNodes) => {
    // Создаём карту для сопоставления временных ID с реальными
    const nodeMap = {}
    for (let i = 0; i < nodes.length; i++) {
      const tempId = nodes[i].id
      const realId = savedNodes[i]?.id
      if (realId) {
        nodeMap[tempId] = realId
      }
    }

    for (const demand of demands) {
      if (!demand.source || !demand.target) continue
      
      const sourceId = nodeMap[demand.source]
      const destId = nodeMap[demand.target]
      
      if (!sourceId || !destId) {
        console.error('Не найден ID узла для требования:', demand)
        continue
      }

      const response = await fetch('http://localhost:8000/api/v2/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_node_id: sourceId,
          dest_node_id: destId,
          volume: demand.volume
        }),
      })
      
      if (response.ok) {
        console.log(`Требование ${demand.source}->${demand.target} сохранено`)
      } else {
        console.error(`Ошибка сохранения требования:`, response.status)
      }
    }
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
      // 1. Сохраняем узлы и получаем их реальные ID
      const savedNodes = await saveNodesToBackend()
      
      // 2. Сохраняем каналы с реальными ID
      await saveLinksToBackend(savedNodes)
      
      // 3. Сохраняем требования с реальными ID
      await saveDemandsToBackend(savedNodes)
      
      // 4. Отправляем запрос на оптимизацию
      const response = await fetch('http://localhost:8000/api/v2/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка ${response.status}: ${errorText}`)
      }
      
      const resultData = await response.json()
      console.log('Ответ бэкенда:', resultData)
      setResult(resultData)
      
      alert(`✅ Оптимизация завершена!\nСтоимость сети: ${resultData.objective?.toFixed(2)}`)
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
        
        <div style={{ flex: 1 }}>
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Параметры</h3>
            <div style={{ marginBottom: '10px' }}>
              <label>c_km (стоимость км): </label>
              <input 
                type="number" 
                step="0.1" 
                value={params.c_km} 
                onChange={(e) => setParams({...params, c_km: parseFloat(e.target.value)})} 
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>c_u (стоимость емкости): </label>
              <input 
                type="number" 
                step="0.1" 
                value={params.c_u} 
                onChange={(e) => setParams({...params, c_u: parseFloat(e.target.value)})} 
              />
            </div>
            <div>
              <label>U (макс. емкость): </label>
              <input 
                type="number" 
                value={params.U} 
                onChange={(e) => setParams({...params, U: parseFloat(e.target.value)})} 
              />
            </div>
          </div>
          
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Требования (Demands)</h3>
            {demands.map((demand, idx) => (
              <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                <select 
                  value={demand.source} 
                  onChange={(e) => updateDemand(idx, 'source', e.target.value)} 
                  style={{ width: '100px', marginRight: '5px' }}
                >
                  <option value="">Источник</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                →
                <select 
                  value={demand.target} 
                  onChange={(e) => updateDemand(idx, 'target', e.target.value)} 
                  style={{ width: '100px', marginLeft: '5px' }}
                >
                  <option value="">Назначение</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                <input 
                  type="number" 
                  value={demand.volume} 
                  onChange={(e) => updateDemand(idx, 'volume', parseFloat(e.target.value))} 
                  style={{ width: '70px', marginLeft: '5px' }} 
                />
                <button onClick={() => removeDemand(idx)} style={{ marginLeft: '10px' }}>🗑️</button>
              </div>
            ))}
            <button onClick={addDemand}>+ Добавить требование</button>
          </div>
          
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