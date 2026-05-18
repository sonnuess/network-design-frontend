const API_BASE_URL = 'http://localhost:8000'

export async function getParameters() {
  const response = await fetch(`${API_BASE_URL}/api/v2/parameters`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Ошибка получения параметров: ${response.status}`)
  }

  return response.json()
}