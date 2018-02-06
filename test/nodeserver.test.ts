import * as mocha from 'mocha';
import * as chai from 'chai';
import chaiHttp = require('chai-http');
const forEach = require('mocha-each');

import * as options from '../src/matcher/options';
import { default as types } from '../src/matcher/types';

import app from '../src/app';
import { type } from 'os';
app.log_enabled = false;

chai.use(chaiHttp);
const expect = chai.expect;

const resp_temp = { status: types.string, 
                    data: options.optional(types.anything),
                    error: options.optional(types.string), 
                    error_description: options.optional(types.string), 
                    user_message: options.optional(types.string),
                    error_data: options.optional(types.anything)
                  }

describe('baseRoute', () => {

  it('should be json', () => {
    return chai.request(app).get('/')
    .then(res => {
      expect(res.type).to.eql('application/json');
    });
  });

  it('should have a message prop', () => {
    return chai.request(app).get('/')
    .then(res => {
      expect(res.body.message).to.eql('Welcome to the CS3099 BE4 server!');
    });
  });

});

describe('General protocol', () => {
  let complete_protocol = [
    ['get', '/_supported_protocols_', options.exact({supported: types.array(types.string), required: types.array(types.string) })      ],
    ['get', '/log'                  , types.array({ component: types.string, level: options.alternative(["info", "security", "warning", "error", "critical"]), value: types.anything,username: types.string,timestamp: types.string})     ],
    ['post','/log'                  , null   ],
    ['get' ,'/properties'           , types.array({id: types.string, display: options.optional(options.match({category: types.string, group: types.string, display_name: types.string, description: types.string})), read_only: types.boolean,type: options.alternative([types.string, types.integer, types.boolean]),value: options.alternative([types.string, types.integer, types.boolean])})      ],
    ['post','/properties'           , null      ],
    ['get' ,'/user_privileges'      , types.array({privilege: types.string,description: types.string,internal: types.boolean})   ],
    ['get' ,'/users'                , types.array({username: types.string,privileges: types.array(types.string),projects: types.array({    project_name: types.string,    access_level: types.string}),public_user_metadata: types.anything,private_user_metadata: types.anything,public_admin_metadata: types.anything,private_admin_metadata: types.anything})     ],
  // TODO types.metadata
    ['get' ,'/users/:username'      , {username: types.string,privileges: types.array(types.string),projects: types.array({    project_name: types.string,    access_level: types.string}),public_user_metadata: types.anything,private_user_metadata: types.anything,public_admin_metadata: types.anything,private_admin_metadata: types.anything}      ],
    ['post','/users/:username'      , null     ],
    ['get' ,'/users/:username/properties' , {data: options.optional(types.anything)}],
    ['get' ,'/current_user'         , {username: types.string,privileges: types.array(types.string),projects: types.array({    project_name: types.string,    access_level: types.string}),public_user_metadata: types.anything,private_user_metadata: types.anything,public_admin_metadata: types.anything,private_admin_metadata: types.anything}     ],
    ['post','/current_user'         , null      ],
    ['get' ,'/project_roles'        , types.array({role: types.string,description: types.string,internal: types.boolean})],
    ['get' ,'/projects'             , types.array({project_name: types.string,users: types.array({    username: types.string,    access_level: types.string}),public_metadata: types.anything,private_metadata: options.optional(types.anything),admin_metadata: options.optional(types.anything)})      ],
    ['get' ,'/projects/:project_name'                 , {project_name: types.string,users: types.array({    username: types.string,    access_level: types.string}),public_metadata: types.anything,private_metadata: types.anything,admin_metadata: options.optional(types.anything)}],
    ['post','/projects/:project_name'                 , null],
    ['get' ,'/projects/:project_name/properties'      , {data: options.optional(types.anything)}],
    ['get' ,'/projects/:project_name/files/:path'     , null],
    ['post','/projects/:project_name/files/:id'       , null],
    ['get' ,'/projects/:project_name/files_by_id/:id' , null]
  ];
  
  describe('Checking complete Protocol', () => {
    forEach(complete_protocol)
    .it('%s %s should be json', (method, path, temp) => {
      if(method == 'get'){
        return chai.request(app).get(path)
        .then(res => {
          expect(res.type).to.eql('application/json');
        });
      }else if(method == 'post'){
        return chai.request(app).post(path)
        .then(res => {
          expect(res.type).to.eql('application/json');
        });
      }
    })
    forEach(complete_protocol)
    .it('%s %s should have a status 200', (method, path, temp) => {
      if(method == 'get'){
        return chai.request(app).get(path)
        .then(res => {
          expect(res).to.have.status(200);
        });
      }else if(method == 'post'){
        return chai.request(app).post(path)
        .then(res => {
          expect(res).to.have.status(200);
        });
      }
    })
    forEach(complete_protocol)
    .it('%s %s should conform to standard protocol', (method, path, temp) => {
      if(method == 'get'){
        return chai.request(app).get(path)
        .then(res => {
          options.match(resp_temp)(JSON.parse(res.body)).should.be.true;
        });
      }else if(method == 'post'){
        return chai.request(app).post(path)
        .then(res => {
          options.match(resp_temp)(JSON.parse(res.body)).should.be.true;
        });
      }
    });
    forEach(complete_protocol)
    .it('the response for %s %s should comply with its own protocol', (method, path, temp) => {
      if(method == 'get' && temp != null){
        return chai.request(app).get(path)
        .then(res => {
          options.match(temp)(JSON.parse(res.body)).should.be.true;
        });
      }
    });
  })
});
