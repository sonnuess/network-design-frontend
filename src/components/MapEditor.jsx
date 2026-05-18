import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, Tooltip } from 'react-leaflet'
import L from 'leaflet'

// Исправляем иконки Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

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

export default function MapEditor({ nodes, links, onAddNode, onSelectNode, isAddingLinkMode, isDeletingLinkMode }) {
  const getModeHint = () => {
    if (isAddingLinkMode) return ' ✨ (режим добавления канала)'
    if (isDeletingLinkMode) return ' ❌ (режим удаления канала)'
    return ''
  }

  return (
    <MapContainer center={[55.75, 37.62]} zoom={10} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      <AddNodeOnClick onAddNode={onAddNode} />
      
      {links.map((link, idx) => {
        const fromNode = nodes.find(n => n.id === link.source_node_id)
        const toNode = nodes.find(n => n.id === link.dest_node_id)
        if (!fromNode || !toNode) return null
        return (
          <Polyline
            key={idx}
            positions={[[fromNode.lat, fromNode.lon], [toNode.lat, toNode.lon]]}
            color={link.z === 1 ? (link.load > 0.9 ? 'red' : link.load > 0.5 ? 'orange' : 'green') : '#aaa'}
            weight={link.z === 1 ? (2 + (link.capacity || 0) / 10) : 2}
            opacity={link.z === 1 ? 1 : 0.5}
          />
        )
      })}
      
      {nodes.map((node) => (
        <Marker
          key={node.id}
          position={[node.lat, node.lon]}
          eventHandlers={{ click: () => onSelectNode?.(node.id) }}
        >
          <Popup>{node.name || node.id}</Popup>
          <Tooltip direction="top" offset={[0, -20]} permanent={false}>
            {node.name || node.id}{getModeHint()}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
}