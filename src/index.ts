import { default as seq } from './db/orm';
import { default as app } from './app';

import { default as User } from './db/model/UserGroup';
import { default as UserGroup } from './db/model/UserGroup';

// use default port 3000 or port supplied by OS
const port: number = process.env.PORT || 3000;

(async () => {
  console.log('Booting PSQL database');

  await seq.authenticate();

  console.log('Resetting Database');

  await seq.sync({
    force: true
  });

  let admin: UserGroup = new UserGroup({
    name: 'admin',
    canCreateUsers: true,
    canDeleteUsers: true,
    canEditUsers: true,
    canCreateProjects: true,
    canDeleteProjects: true,
    canEditProjects: true,
    isInternal: false,
    description: 'Systems admin'
  });
  admin.save();

  // let user: User = new User({
  //   username: 'Tom',
  //   password: 'woa'
  // });
  // user.save();

  console.log('Booting ExpressJS server');

  app.listen(port, (err) => {
    if (err) {
      return console.log(err);
    } else {
      return console.log(`server is listening on port ${port}`);
    }
  });
})();
