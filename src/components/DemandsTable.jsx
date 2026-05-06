export default function DemandsTable({ demands, nodes, onAddDemand, onRemoveDemand, onUpdateDemand }) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', margin: '10px' }}>
        <h3>Требования трафика (Demands)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Источник</th>
              <th>Назначение</th>
              <th>Объем трафика</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {demands.map((demand, idx) => (
              <tr key={idx}>
                <td>
                  <select
                    value={demand.source}
                    onChange={(e) => onUpdateDemand(idx, 'source', e.target.value)}
                  >
                    <option value="">Выберите узел</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.id}>{node.name || node.id}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={demand.target}
                    onChange={(e) => onUpdateDemand(idx, 'target', e.target.value)}
                  >
                    <option value="">Выберите узел</option>
                    {nodes.map(node => (
                      <option key={node.id} value={node.id}>{node.name || node.id}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    value={demand.volume}
                    onChange={(e) => onUpdateDemand(idx, 'volume', parseFloat(e.target.value))}
                  />
                </td>
                <td>
                  <button onClick={() => onRemoveDemand(idx)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={onAddDemand} style={{ marginTop: '10px' }}>
          + Добавить требование
        </button>
      </div>
    )
  }