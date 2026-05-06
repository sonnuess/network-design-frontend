import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Исправляем иконки Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Компонент для добавления узлов по клику
function AddNodeOnClick({ onAddNode }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      const newNode = {
        id: `node_${Date.now()}`,
        lat: lat,
        lon: lng,
        name: `Node ${Math.floor(Math.random() * 1000)}`
      }
      onAddNode(newNode)
    },
  })
  return null
}

export default function MapEditor({ nodes, links, onAddNode, onSelectNode }) {
  return (
    <MapContainer
      center={[55.75, 37.62]}
      zoom={10}
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <AddNodeOnClick onAddNode={onAddNode} />
      
      {/* Рисуем линии (каналы) */}
      {links.map((link, idx) => {
        const fromNode = nodes.find(n => n.id === link.source)
        const toNode = nodes.find(n => n.id === link.target)
        if (!fromNode || !toNode) return null
        return (
          <Polyline
            key={idx}
            positions={[[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]]}
            color={link.z === 1 ? (link.load > 0.9 ? 'red' : link.load > 0.5 ? 'orange' : 'green') : 'gray'}
            weight={link.z === 1 ? (2 + (link.capacity || 0) / 10) : 1}
            opacity={link.z === 1 ? 1 : 0.3}
          />
        )
      })}
      
      {/* Рисуем узлы */}
      {nodes.map((node) => (
        <Marker
          key={node.id}
          position={[node.lat, node.lon]}
          eventHandlers={{ click: () => onSelectNode?.(node.id) }}
        >
          <Popup>{node.name || node.id}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}