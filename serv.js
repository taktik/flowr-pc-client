const WebSocket = require('ws');

const wss = new WebSocket.Server({
  port: 8001,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed.
  }
});

const STATUS = {
  OFFHOOK: 'offhook',
  CALLOUT: 'callout'
}

wss.on('connection', ws => {
  function send(mess) {
    console.log('sending', mess)
    ws.send(JSON.stringify(mess))
  }
  ws.on('message', function incoming(message) {
    const m = JSON.parse(message)
    console.log('received', m)
    switch (m.action) {
      case 'status':
        send({ "status" : "offhook" , "reference" : "SM-02" })
        break
      case 'status_register':
        send({ "status" : "registered" , "identity" : "%s" , "duration" : "%s" , "refrence" : "SM-04" })
        break
      case 'call':
        setTimeout(() => send({ "callback" : "statuschange" , "from" : STATUS.OFFHOOK , "to" : STATUS.CALLOUT , "reference" : "SM-17" }), 4000)
        break
      case 'terminate':
        send({ "status" : "offhook" , "reference" : "SM-02" })
        break
      }
  })
  ws.send(JSON.stringify({ "message" : "Your are connected!" , "reference" : "SM-01" }))
})
