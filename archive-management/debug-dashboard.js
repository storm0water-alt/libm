// 在浏览器控制台粘贴这段代码来测试API
fetch('/api/dashboard/stats')
  .then(res => res.json())
  .then(data => console.log('API Response:', data))
  .catch(err => console.error('API Error:', err));
