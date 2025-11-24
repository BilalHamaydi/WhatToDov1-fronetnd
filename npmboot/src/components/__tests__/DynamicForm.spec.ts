async function loadThings (owner: string = '') {
  const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL // 'http://localhost:8080' in dev mode
  const endpoint = baseUrl + '/things' + '?owner=' + owner
  const response: AxiosResponse = await axios.get(endpoint);
  const responseData: Thing[] = response.data;
  responseData.forEach((thing: Thing) => {
    items.value.push(thing)
  })
}
