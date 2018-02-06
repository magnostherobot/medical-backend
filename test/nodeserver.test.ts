import * as mocha from 'mocha';
import * as chai from 'chai';
import chaiHttp = require('chai-http');
const forEach = require('mocha-each');

import app from '../src/app';
app.log_enabled = false;

chai.use(chaiHttp);
const expect = chai.expect;

const resp_err = '{"status": "error","error": string,"error_description": optional(string),"user_message": optional(string),"error_data": optional(anything)}';
const resp_suc = '{"status": "success","data": anything}';

function checkRespStand(res){
  let suc = JSON.parse(resp_suc);
  let err = JSON.parse(resp_err);
  console.log(suc);

}

function check(res_str : string, prot_str : string) : boolean {
  // parse response string
  let resp = JSON.parse(res_str);

  let exact : boolean = false;
  // if exact(...)
  if(prot_str.indexOf("exact") == 0){
    exact = true;
    prot_str = prot_str.slice(6, prot_str.length-1)
  }
  // loop all fields
  var reg = /"(.*?)"/g
  var result;
  while((result = reg.exec(prot_str)) !== null) {
    result = result.slice(1, result.length-1); // get rid of extra quotation marks
    console.log(result);
    

  }

  let prot = JSON.parse(prot_str);
  

  if(prot.)

  return true;
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
    ['get', '/_supported_protocols_'      ],
    ['get', '/log'                        ],
    ['post','/log'                        ],
    ['get' ,'/properties'                 ],
    ['post','/properties'                 ],
    ['get' ,'/user_privileges'            ],
    ['get' ,'/users'                      ],
    ['get' ,'/users/:username'            ],
    ['post','/users/:username'            ],
    ['get' ,'/users/:username/properties' ],
    ['get' ,'/current_user'               ],
    ['post','/current_user'               ],
    ['get' ,'/project_roles'              ],
    ['get' ,'/projects'                   ],
    ['get' ,'/projects/:project_name'     ],
    ['post','/projects/:project_name'     ],
    ['get' ,'/projects/:project_name/properties'      ],
    ['get' ,'/projects/:project_name/files/:path'     ],
    ['post','/projects/:project_name/files/:id'       ],
    ['get' ,'/projects/:project_name/files_by_id/:id' ]
  ];
  
  describe('Checking complete Protocol', () => {
    forEach(complete_protocol)
    .it('%s %s should be json', (method, path) => {
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
    .it('%s %s should have a status 200', (method, path) => {
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
    .it('%s %s should conform to standard protocol', (method, path) => {
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
    });

  })
});
