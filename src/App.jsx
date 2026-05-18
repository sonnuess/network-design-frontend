import { useState, useEffect } from 'react'
import MapEditor from './components/MapEditor'
import { getParameters } from './api/optimize'

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
  const [error, setError] = useState(null)
  const [savingParams, setSavingParams] = useState(false)
  const [realNodeIds, setRealNodeIds] = useState({})
  
  // Режимы работы с каналами
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [isAddingLinkMode, setIsAddingLinkMode] = useState(false)
  const [isDeletingLinkMode, setIsDeletingLinkMode] = useState(false)

  // Загрузка параметров и узлов из БД при старте
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Загружаем параметры
        const paramsFromBackend = await getParameters()
        if (paramsFromBackend && paramsFromBackend.length > 0) {
          const paramsObj = {}
          paramsFromBackend.forEach(p => {
            paramsObj[p.key] = p.value
          })
          setParams(paramsObj)
          console.log('Параметры загружены из БД:', paramsObj)
        }
      } catch (error) {
        console.error('Ошибка загрузки параметров:', error)
      }
      
      // Загружаем существующие узлы из БД
      try {
        const response = await fetch('http://localhost:8000/api/v2/nodes')
        if (response.ok) {
          const nodesFromBackend = await response.json()
          if (nodesFromBackend.length > 0) {
            console.log('Загружены существующие узлы из БД:', nodesFromBackend)
            const loadedNodes = nodesFromBackend.map(node => ({
              id: `node_${node.id}`,
              realId: node.id,
              name: node.name,
              lat: node.lat,
              lon: node.lng
            }))
            setNodes(loadedNodes)
            const idMap = {}
            loadedNodes.forEach(node => {
              idMap[node.id] = node.realId
            })
            setRealNodeIds(idMap)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки узлов:', error)
      }
    }
    loadInitialData()
  }, [])

  // Добавление узла (сохраняем в БД)
  const addNode = async (newNode) => {
    try {
      const response = await fetch('http://localhost:8000/api/v2/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNode.name || `Node ${Date.now()}`,
          lat: Number(newNode.lat),
          lng: Number(newNode.lon)
        })
      })
      
      if (response.ok) {
        const savedNode = await response.json()
        const tempId = `node_${savedNode.id}`
        setRealNodeIds(prev => ({ ...prev, [tempId]: savedNode.id }))
        const newFrontNode = {
          ...newNode,
          id: tempId,
          realId: savedNode.id
        }
        setNodes(prev => [...prev, newFrontNode])
        console.log(`Узел сохранён в БД с ID ${savedNode.id}`)
      } else {
        console.error('Ошибка сохранения узла:', response.status)
        setNodes(prev => [...prev, newNode])
      }
    } catch (error) {
      console.error('Ошибка:', error)
      setNodes(prev => [...prev, newNode])
    }
  }

  // Генерация всех возможных каналов
  const generateAllLinks = () => {
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
    setError(null)
    console.log('Сгенерировано каналов:', newLinks.length)
  }

  // Сохранение параметров в БД
  const saveParamsToBackend = async () => {
    setSavingParams(true)
    try {
      await fetch('http://localhost:8000/api/v2/parameters/c_km', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: params.c_km })
      })
      
      await fetch('http://localhost:8000/api/v2/parameters/c_u', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: params.c_u })
      })
      
      await fetch('http://localhost:8000/api/v2/parameters/U', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: params.U })
      })
      
      console.log('✅ Параметры сохранены в БД')
      setError(null)
    } catch (error) {
      console.error('Ошибка:', error)
      setError('Не удалось сохранить параметры')
    } finally {
      setSavingParams(false)
    }
  }

  // Сохранение канала в БД
  const saveLinkToBackend = async (sourceId, destId) => {
    const sourceRealId = realNodeIds[sourceId]
    const destRealId = realNodeIds[destId]
    
    if (!sourceRealId || !destRealId) {
      console.error('Не удалось получить реальные ID узлов')
      return false
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/v2/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_node_id: sourceRealId,
          dest_node_id: destRealId
        })
      })
      
      if (response.ok) {
        console.log(`Канал ${sourceRealId}→${destRealId} сохранён в БД`)
        return true
      } else {
        console.error('Ошибка сохранения канала:', response.status)
        return false
      }
    } catch (error) {
      console.error('Ошибка:', error)
      return false
    }
  }

  // Удаление канала из БД
  const deleteLinkFromBackend = async (sourceId, destId) => {
    const sourceRealId = realNodeIds[sourceId]
    const destRealId = realNodeIds[destId]
    
    if (!sourceRealId || !destRealId) {
      console.error('Не удалось получить реальные ID узлов')
      return false
    }
    
    try {
      const linksResponse = await fetch('http://localhost:8000/api/v2/links')
      const allLinks = await linksResponse.json()
      
      const linkToDelete = allLinks.find(link => 
        (link.source_node_id === sourceRealId && link.dest_node_id === destRealId) ||
        (link.source_node_id === destRealId && link.dest_node_id === sourceRealId)
      )
      
      if (!linkToDelete) {
        console.error('Канал не найден в БД')
        return false
      }
      
      const response = await fetch(`http://localhost:8000/api/v2/links/${linkToDelete.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log(`Канал ${sourceRealId}→${destRealId} удалён из БД`)
        return true
      } else {
        console.error('Ошибка удаления канала:', response.status)
        return false
      }
    } catch (error) {
      console.error('Ошибка:', error)
      return false
    }
  }

  // Сохранение требований в БД
  const saveDemandsToBackend = async () => {
    for (const demand of demands) {
      if (!demand.source || !demand.target || !demand.volume) {
        console.warn('Пропуск требования: не хватает данных', demand)
        continue
      }
      
      const sourceRealId = realNodeIds[demand.source]
      const destRealId = realNodeIds[demand.target]
      
      if (!sourceRealId || !destRealId) {
        console.error('Не найдены реальные ID для требования:', {
          source: demand.source,
          target: demand.target,
          sourceRealId,
          destRealId
        })
        continue
      }
      
      try {
        const response = await fetch('http://localhost:8000/api/v2/demands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_node_id: sourceRealId,
            dest_node_id: destRealId,
            volume: Number(demand.volume)
          })
        })
        
        if (response.ok) {
          console.log(`Требование ${sourceRealId}→${destRealId} сохранено`)
        } else {
          console.error('Ошибка сохранения требования:', response.status)
        }
      } catch (error) {
        console.error('Ошибка:', error)
      }
    }
  }

  // Ручное добавление канала
  const addLinkManually = async (sourceId, destId) => {
    if (sourceId === destId) {
      setError('Нельзя создать канал от узла к самому себе')
      return false
    }
    
    const linkExists = links.some(
      link => 
        (link.source_node_id === sourceId && link.dest_node_id === destId) ||
        (link.source_node_id === destId && link.dest_node_id === sourceId)
    )
    
    if (linkExists) {
      setError('Такой канал уже существует')
      return false
    }
    
    const saved = await saveLinkToBackend(sourceId, destId)
    
    if (saved) {
      setLinks([...links, {
        source_node_id: sourceId,
        dest_node_id: destId,
        forced: false,
        forbidden: false
      }])
      setError(null)
      console.log('Канал добавлен:', sourceId, '→', destId)
      return true
    } else {
      setError('Не удалось сохранить канал в базе данных')
      return false
    }
  }

  // Ручное удаление канала
  const deleteLinkManually = async (sourceId, destId) => {
    const linkToDelete = links.find(
      link => 
        (link.source_node_id === sourceId && link.dest_node_id === destId) ||
        (link.source_node_id === destId && link.dest_node_id === sourceId)
    )
    
    if (!linkToDelete) {
      setError('Канал не найден')
      return false
    }
    
    const deleted = await deleteLinkFromBackend(sourceId, destId)
    
    if (deleted) {
      setLinks(links.filter(link => link !== linkToDelete))
      setError(null)
      console.log('Канал удалён:', sourceId, '→', destId)
      return true
    } else {
      setError('Не удалось удалить канал из базы данных')
      return false
    }
  }

  // Обработчик выбора узла
  const handleNodeSelect = (nodeId) => {
    if (isDeletingLinkMode) {
      if (selectedNodeId === null) {
        setSelectedNodeId(nodeId)
        console.log('Выберите второй узел для удаления канала')
      } else {
        deleteLinkManually(selectedNodeId, nodeId)
        setSelectedNodeId(null)
        setIsDeletingLinkMode(false)
      }
    } else if (isAddingLinkMode) {
      if (selectedNodeId === null) {
        setSelectedNodeId(nodeId)
        console.log('Выберите второй узел для добавления канала')
      } else {
        addLinkManually(selectedNodeId, nodeId)
        setSelectedNodeId(null)
        setIsAddingLinkMode(false)
      }
    }
  }

  // Выход из режимов
  const exitModes = () => {
    setIsAddingLinkMode(false)
    setIsDeletingLinkMode(false)
    setSelectedNodeId(null)
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
      setError('Добавьте хотя бы 2 узла')
      return
    }
    
    if (demands.length === 0 || demands.every(d => !d.source || !d.target)) {
      setError('Добавьте хотя бы одно требование')
      return
    }

    setLoading(true)
    setError(null)
    exitModes()
    
    try {
      // Сохраняем все требования
      await saveDemandsToBackend()
      
      const response = await fetch('http://localhost:8000/api/v2/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ошибка ${response.status}: ${errorText}`)
      }
      
      const resultData = await response.json()
      console.log('Ответ бэкенда:', resultData)
      setResult(resultData)
      
    } catch (error) {
      console.error('Ошибка:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId)
    return node ? (node.name || node.id) : nodeId
  }

  const getNodeNameByRealId = (realId) => {
    const entry = Object.entries(realNodeIds).find(([_, id]) => id === realId)
    if (entry) {
      const tempId = entry[0]
      const node = nodes.find(n => n.id === tempId)
      return node ? (node.name || node.id) : realId
    }
    return realId
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
            onSelectNode={handleNodeSelect}
            isAddingLinkMode={isAddingLinkMode}
            isDeletingLinkMode={isDeletingLinkMode}
          />
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={generateAllLinks} disabled={nodes.length < 2}>
              🔗 Сгенерировать все каналы
            </button>
            <button 
              onClick={() => {
                exitModes()
                setIsAddingLinkMode(true)
              }}
              style={{ 
                backgroundColor: isAddingLinkMode ? '#4CAF50' : '#f0f0f0',
                color: isAddingLinkMode ? 'white' : 'black'
              }}
            >
              ➕ Добавить канал
            </button>
            <button 
              onClick={() => {
                exitModes()
                setIsDeletingLinkMode(true)
              }}
              style={{ 
                backgroundColor: isDeletingLinkMode ? '#f44336' : '#f0f0f0',
                color: isDeletingLinkMode ? 'white' : 'black'
              }}
            >
              🗑️ Удалить канал
            </button>
            {(isAddingLinkMode || isDeletingLinkMode) && (
              <button onClick={exitModes}>
                ❌ Отмена
              </button>
            )}
            <button onClick={runOptimization} disabled={loading} style={{ backgroundColor: '#2196F3', color: 'white' }}>
              {loading ? 'Оптимизация...' : '🚀 Запустить оптимизацию'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'gray' }}>
            💡 Кликните на карту → добавить узел. Используйте кнопки для управления каналами.
          </p>
        </div>
        
        <div style={{ flex: 1 }}>
          {/* Параметры */}
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Параметры</h3>
            <div>
              <label>c_km (стоимость км): </label>
              <input 
                type="number" 
                step="0.1" 
                value={params.c_km} 
                onChange={(e) => setParams({...params, c_km: parseFloat(e.target.value)})} 
              />
            </div>
            <div>
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
            <button onClick={saveParamsToBackend} disabled={savingParams}>
              {savingParams ? '💾 Сохранение...' : '💾 Сохранить параметры'}
            </button>
          </div>
          
          {/* Требования */}
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '15px' }}>
            <h3>Требования (Demands)</h3>
            {demands.map((demand, idx) => (
              <div key={idx} style={{ marginBottom: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
                <select 
                  value={demand.source} 
                  onChange={(e) => updateDemand(idx, 'source', e.target.value)}
                >
                  <option value="">Источник</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                →
                <select 
                  value={demand.target} 
                  onChange={(e) => updateDemand(idx, 'target', e.target.value)}
                >
                  <option value="">Назначение</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name || n.id}</option>)}
                </select>
                <input 
                  type="number" 
                  value={demand.volume} 
                  onChange={(e) => updateDemand(idx, 'volume', parseFloat(e.target.value))} 
                  style={{ width: '70px' }} 
                />
                <button onClick={() => removeDemand(idx)}>🗑️</button>
              </div>
            ))}
            <button onClick={addDemand}>+ Добавить требование</button>
          </div>
          
          {/* Результат */}
          {result && (
            <div style={{ padding: '15px', border: '1px solid #4CAF50', borderRadius: '8px', background: '#e8f5e9' }}>
              <h3>📊 Результат оптимизации</h3>
              <p><strong>Статус:</strong> {result.status}</p>
              {result.total_cost !== undefined && (
                <p><strong>💰 Общая стоимость сети:</strong> {result.total_cost?.toFixed(2)}</p>
              )}
              {result.message && <p><strong>📝 Сообщение:</strong> {result.message}</p>}
              
              {result.active_links && result.active_links.length > 0 && (
                <div>
                  <h4>🔗 Активные каналы:</h4>
                  {result.active_links.map((link, idx) => (
                    <div key={idx}>
                      {getNodeNameByRealId(link.source_node_id)} → {getNodeNameByRealId(link.dest_node_id)}: capacity = {link.capacity?.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Ошибка */}
          {error && (
            <div style={{ padding: '15px', border: '1px solid #f44336', borderRadius: '8px', background: '#ffebee' }}>
              <h3 style={{ color: '#c62828' }}>❌ Ошибка</h3>
              <p>{error}</p>
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