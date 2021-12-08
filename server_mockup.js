/* globals require, console, global */
/* eslint-disable no-console */
const { Server } = require('ws')
const { stdin } = require('process')

const TIME_BEFORE_PICKING_UP = 4000 // ms

const wss = new Server({
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
})

const STATUS = {
  OFFHOOK: 'offhook',
  CALLOUT: 'callout',
  INCOMING: 'incomming_call',
  ANSWERED: 'answered',
}

wss.on('connection', ws => {
  let callEndingTimeout
  let callingTimeout
  let status
  let registeredIdentity

  function messageFromStatus() {
    let message
    switch (status) {
      case STATUS.OFFHOOK:
        message = { "status" : STATUS.OFFHOOK , "reference" : "SM-02" }
        break
      case STATUS.ANSWERED:
      case STATUS.CALLOUT:
        message = { "action" : "call" , "response" : "call started by daemon" , "caller" : "'DEPANNAGE TV' <sip:30039@node000000.tsp.local>" , "call_number" : "%s" , "reference" : "SM-16" }
        break
      case STATUS.INCOMING:
        message = { "status" : "incomming_call" , "caller" : "'DEPANNAGE TV' <sip:30039@node000000.tsp.local>" , "reference" : "SM-18" }
        break
    }
    return message
  }

  function statusChangedMessage(from, to) {
    return { "callback" : "statuschange" , from, to, "reference" : "SM-17" }
  }

  function sendStatusChangedMessage(to) {
    const nextStatus = to
    send(statusChangedMessage(status , nextStatus))
    status = nextStatus
  }

  function send(mess) {
    console.log('sending', mess)
    ws.send(JSON.stringify(mess))
  }

  function setStatus(state) {
    global.clearTimeout(callingTimeout)
    global.clearTimeout(callEndingTimeout)
    status = state
  }

  ws.on('message', function incoming(message) {
    const parsed = JSON.parse(message)
    console.log('received', parsed)

    switch (parsed.action) {
      case 'status':
        send(messageFromStatus())
        break
      case 'status_register':
        if (!registeredIdentity) {
          send({ "status" : "unregistered", "refrence" : "SM-10" })
        } else {
          send({ "status" : "registered" , "identity" : registeredIdentity , "duration" : "500" , "refrence" : "SM-04" })
        }
        break
      case 'call':
        callingTimeout = global.setTimeout(() => {
          sendStatusChangedMessage(STATUS.CALLOUT)
          global.clearTimeout(callEndingTimeout)
          callEndingTimeout = global.setTimeout(() => {
            setStatus(STATUS.OFFHOOK)
            send(messageFromStatus())
          }, parsed.number)
        }, TIME_BEFORE_PICKING_UP)
        break
      case 'terminate':
        setStatus(STATUS.OFFHOOK)
        send(messageFromStatus())
        break
      case 'answer':
        if (status === STATUS.INCOMING) {
          sendStatusChangedMessage(STATUS.ANSWERED)
          send({ "action" : "answer" , "response" : "Call answered", "call_number" : "%s" , "caller" : "me", "reference" : "SM-06"})
        } else {
          send({ "action" : "answer" , "response" : "There are no calls to answer." , "reference" : "SM-05" })
        }
        break
      case 'callme':
        sendStatusChangedMessage(STATUS.INCOMING)
        break
      case 'register':
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        registeredIdentity = `sip:${parsed.username}@${parsed.host}`
        send({ "status" : "registered" , "identity" : registeredIdentity, "duration" : "0" , "refrence" : "SM-04" })
        break
      case 'unregister':
        send({ "action" : "unregister" , "response" : "signal send to daemon" , "reference" : "SM-15" })
        break
    }
  })

  setStatus(STATUS.OFFHOOK)
  ws.send(JSON.stringify({ "message" : "Your are connected!" , "reference" : "SM-01" }))

  stdin.on('data', (data) => {
    if (data.toString().trim() === 'callme') {
        sendStatusChangedMessage(STATUS.INCOMING)
    }
  })
})
