const API_BASE_URL = 'http://localhost:8000'

export async function optimizeNetwork(data) {
  const response = await fetch(`${API_BASE_URL}/api/v2/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Ошибка ${response.status}: ${error}`)
  }
  
  return response.json()
}