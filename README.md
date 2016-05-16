# Nicercast

Simple Node.js icecast compliant streaming server.

## Installation

```sh
npm install --save nicercast
```

## Usage

```js
const Nicercast = require('nicercast')

// Stream raw audio from stdin
const input = process.stdin
const server = new Nicercast(input, { metadata: 'Process Input' })

server.listen(3000, function () {
  console.log('http://localhost:3000/listen.m3u')
})
```

## API

### `new Nicercast(input[, opts])`

Creates a new Nicercast server that streams the `input` stream of raw audio
data. The optional `opts` parameter can be used to specify initial metadata, by
suppling it under the key `metadata`.

### `Nicercast#setMetadata(metadata)`

Set the current metadata to `metadata`, will be broadcasted to all current
listeners.

### `Nicercast#setInputStream(input)`

Set the current input stream to `input`, will change for all current listeners
as well.

### `Nicercast#listen(port[, hostname][, backlog][, cb])`

Start listening on the specified `port`.

### `Nicercast#close([cb])`

Stop listening.
