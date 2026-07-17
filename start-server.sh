#!/bin/bash
# Start HashWatch web server on port 3000
# Usage: ./start-server.sh

cd /home/aktheman/hashwatch2

# Kill any existing server on port 3000
fuser -k 3000/tcp 2>/dev/null

# Start the Node.js server
exec node serve.js
