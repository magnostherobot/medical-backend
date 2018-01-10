console.log('Welcome to the CS3099 Server thingy!');

import app from './app'

// use default port 3000 or port supplied by OS
const port = process.env.PORT || 3000

app.listen(port, (err) => {
  if (err) {
    return console.log(err)
  }

  return console.log(`server is listening on port ${port}`)
})