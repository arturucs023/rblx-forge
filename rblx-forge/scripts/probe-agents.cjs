const s = require('../docs-openapi-2.2.4.json');
for (const p of ['/api/agent', '/api/agent/{agentID}', '/api/session/{sessionID}/fork', '/api/session/{sessionID}/agent', '/api/session/{sessionID}/background']) {
  console.log('## ' + p);
  const e = s.paths[p] || {};
  for (const m of Object.keys(e)) {
    if (m === 'parameters') { console.log('  params:', JSON.stringify(e[m]).slice(0, 400)); continue; }
    const op = e[m];
    const body = op.requestBody && op.requestBody.content && op.requestBody.content['application/json'] && op.requestBody.content['application/json'].schema;
    const resp = op.responses && op.responses['200'] && op.responses['200'].content && op.responses['200'].content['application/json'] && op.responses['200'].content['application/json'].schema;
    console.log('  ' + m.toUpperCase(), 'body:', JSON.stringify(body || 'none').slice(0, 500));
    console.log('   resp:', JSON.stringify(resp || 'none').slice(0, 400));
  }
}
console.log('## Agent.Info');
console.log(JSON.stringify(s.components.schemas['Agent.Info'], null, 1).slice(0, 1600));
