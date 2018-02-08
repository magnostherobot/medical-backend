import { default as seq } from './db/orm';
import { default as app } from './app';

// use default port 3000 or port supplied by OS
const port: number = process.env.PORT || 3000;

(async () => {
  console.log('Booting PSQL database');

  await seq.authenticate();
  await seq.sync({
    force: true
  });

  console.log('Booting ExpressJS server');

  app.listen(port, (err) => {
    if (err) {
      return console.log(err);
    } else {
      return console.log(`server is listening on port ${port}`);
    }
  });
})();
