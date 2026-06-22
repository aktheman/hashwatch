const http = require('http');
const http2 = require('https');

function isPrivateIP(ip) {
  var parts = ip.split('.');
  if (parts.length !== 4) return false;
  var octets = parts.map(Number);
  if (octets.some(function (o) {
    return !Number.isInteger(o) || o < 0 || o > 255;
  })) return false;
  var a = octets[0];
  var b = octets[1];
  var c = octets[2];
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return c !== 1;
  if (a === 169 && b === 254) return true;
  return false;
}

var MAX_BODY_BYTES = 256 * 1024;

function isAllowedUrl(rawUrl) {
  try {
    var parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    var host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === 'metadata.google.internal') return false;
    return isPrivateIP(host);
  } catch (e) {
    return false;
  }
}

function fetch(url, method, headers, data) {
  var client = url.startsWith('https') ? http2 : http;
  return new Promise(function (resolve, reject) {
    var urlObj = new URL(url);
    var opts = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? '443' : '80'),
      path: urlObj.pathname + urlObj.search,
      method: method || 'GET',
      headers: Object.assign({}, headers),
      timeout: 8000,
    };
    if (data && typeof data === 'string') {
      opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    var req = client.request(opts, function (res) {
      var body = '';
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', function (e) {
      reject(e);
    });
    req.on('timeout', function () {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (data && typeof data === 'string') req.write(data);
    req.end();
  });
}

var server = http.createServer(function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/api/proxy') {
    res.writeHead(404);
    return res.end('{}');
  }

  var chunks = [];
  req.on('data', function (chunk) {
    var projected = Buffer.concat(chunks.concat([chunk])).length;
    if (projected > MAX_BODY_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'payload_too_large' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', function () {
    var body = Buffer.concat(chunks).toString('utf8');
    try {
      var parsed = JSON.parse(body);
      var url = parsed.url;
      var method = parsed.method || 'GET';
      var headers = parsed.headers || {};
      var data = parsed.data;
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'url is required' }));
      }
      if (!isAllowedUrl(url)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'forbidden', message: 'Only private miner URLs are allowed' }));
      }
      var payload = typeof data === 'string' ? data : JSON.stringify(data);
      fetch(url, method, headers, payload)
        .then(function (result) {
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result.data));
        })
        .catch(function (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: err && err.message ? err.message : 'bad_request' }));
        });
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: e && e.message ? e.message : 'bad_request' }));
    }
  });
});

var PORT = 4567;
server.listen(PORT, '0.0.0.0', function () {
  console.log('Proxy running on port ' + PORT);
});
